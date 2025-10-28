-- Criar tabela para armazenar conversas ativas
CREATE TABLE IF NOT EXISTS bot_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  contexto JSONB DEFAULT '{}'::jsonb,
  ultimo_contato TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_bot_conversas_telefone ON bot_conversas(telefone);

-- Log completo de mensagens
CREATE TABLE IF NOT EXISTS bot_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES bot_conversas(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recebida', 'enviada')),
  conteudo TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca por conversa
CREATE INDEX IF NOT EXISTS idx_bot_mensagens_conversa ON bot_mensagens(conversa_id);

-- Configurações e status do bot
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessão WhatsApp
CREATE TABLE IF NOT EXISTS bot_sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'desconectado' CHECK (status IN ('conectado', 'desconectado', 'erro')),
  qr_code TEXT,
  dados_sessao JSONB DEFAULT '{}'::jsonb,
  ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campos na tabela agendamentos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'whatsapp', 'site')),
ADD COLUMN IF NOT EXISTS bot_conversa_id UUID REFERENCES bot_conversas(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE bot_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para acesso público (já que o bot precisa acessar)
CREATE POLICY "Conversas são visíveis por todos" ON bot_conversas FOR SELECT USING (true);
CREATE POLICY "Conversas podem ser inseridas" ON bot_conversas FOR INSERT WITH CHECK (true);
CREATE POLICY "Conversas podem ser atualizadas" ON bot_conversas FOR UPDATE USING (true);
CREATE POLICY "Conversas podem ser deletadas" ON bot_conversas FOR DELETE USING (true);

CREATE POLICY "Mensagens são visíveis por todos" ON bot_mensagens FOR SELECT USING (true);
CREATE POLICY "Mensagens podem ser inseridas" ON bot_mensagens FOR INSERT WITH CHECK (true);
CREATE POLICY "Mensagens podem ser atualizadas" ON bot_mensagens FOR UPDATE USING (true);
CREATE POLICY "Mensagens podem ser deletadas" ON bot_mensagens FOR DELETE USING (true);

CREATE POLICY "Config é visível por todos" ON bot_config FOR SELECT USING (true);
CREATE POLICY "Config pode ser inserida" ON bot_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Config pode ser atualizada" ON bot_config FOR UPDATE USING (true);
CREATE POLICY "Config pode ser deletada" ON bot_config FOR DELETE USING (true);

CREATE POLICY "Sessão é visível por todos" ON bot_sessao FOR SELECT USING (true);
CREATE POLICY "Sessão pode ser inserida" ON bot_sessao FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessão pode ser atualizada" ON bot_sessao FOR UPDATE USING (true);
CREATE POLICY "Sessão pode ser deletada" ON bot_sessao FOR DELETE USING (true);

-- Inserir configurações padrão
INSERT INTO bot_config (chave, valor) 
VALUES 
  ('ativo', '{"valor": false}'::jsonb),
  ('horario_funcionamento', '{"inicio": "08:00", "fim": "18:00"}'::jsonb),
  ('mensagem_boas_vindas', '{"texto": "Olá! Bem-vindo ao nosso salão. Como posso ajudar você hoje?"}'::jsonb),
  ('mensagem_ausencia', '{"texto": "No momento estamos fora do horário de atendimento. Responderemos assim que possível!"}'::jsonb),
  ('lembretes_ativos', '{"valor": true}'::jsonb)
ON CONFLICT (chave) DO NOTHING;
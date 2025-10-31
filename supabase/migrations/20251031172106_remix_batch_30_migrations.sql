
-- Migration: 20251028150755
-- Tabela de profissionais
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  especialidades TEXT[],
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de serviços
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  duracao INTEGER NOT NULL, -- duração em minutos
  preco DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  servico_id UUID REFERENCES public.servicos(id),
  servico_nome TEXT NOT NULL,
  profissional_id UUID REFERENCES public.profissionais(id),
  profissional_nome TEXT,
  status TEXT DEFAULT 'Confirmado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(data, horario)
);

-- Tabela de configurações da agenda (dias fechados, horários bloqueados, horários extras)
CREATE TABLE public.agenda_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL UNIQUE,
  fechado BOOLEAN DEFAULT false,
  horarios_bloqueados TEXT[] DEFAULT '{}',
  horarios_extras TEXT[] DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de pagamentos/faturamento
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  cliente_nome TEXT NOT NULL,
  servico TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  metodo_pagamento TEXT, -- 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'
  status TEXT DEFAULT 'Pendente', -- 'Pendente', 'Aprovado', 'Cancelado'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas (leitura pública, escrita aberta para permitir funcionamento sem auth)
-- Profissionais
CREATE POLICY "Profissionais são visíveis por todos"
  ON public.profissionais FOR SELECT
  USING (true);

CREATE POLICY "Profissionais podem ser inseridos"
  ON public.profissionais FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Profissionais podem ser atualizados"
  ON public.profissionais FOR UPDATE
  USING (true);

CREATE POLICY "Profissionais podem ser deletados"
  ON public.profissionais FOR DELETE
  USING (true);

-- Serviços
CREATE POLICY "Serviços são visíveis por todos"
  ON public.servicos FOR SELECT
  USING (true);

CREATE POLICY "Serviços podem ser inseridos"
  ON public.servicos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Serviços podem ser atualizados"
  ON public.servicos FOR UPDATE
  USING (true);

CREATE POLICY "Serviços podem ser deletados"
  ON public.servicos FOR DELETE
  USING (true);

-- Agendamentos
CREATE POLICY "Agendamentos são visíveis por todos"
  ON public.agendamentos FOR SELECT
  USING (true);

CREATE POLICY "Agendamentos podem ser inseridos"
  ON public.agendamentos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agendamentos podem ser atualizados"
  ON public.agendamentos FOR UPDATE
  USING (true);

CREATE POLICY "Agendamentos podem ser deletados"
  ON public.agendamentos FOR DELETE
  USING (true);

-- Agenda Config
CREATE POLICY "Config da agenda é visível por todos"
  ON public.agenda_config FOR SELECT
  USING (true);

CREATE POLICY "Config da agenda pode ser inserida"
  ON public.agenda_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Config da agenda pode ser atualizada"
  ON public.agenda_config FOR UPDATE
  USING (true);

CREATE POLICY "Config da agenda pode ser deletada"
  ON public.agenda_config FOR DELETE
  USING (true);

-- Pagamentos
CREATE POLICY "Pagamentos são visíveis por todos"
  ON public.pagamentos FOR SELECT
  USING (true);

CREATE POLICY "Pagamentos podem ser inseridos"
  ON public.pagamentos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Pagamentos podem ser atualizados"
  ON public.pagamentos FOR UPDATE
  USING (true);

CREATE POLICY "Pagamentos podem ser deletados"
  ON public.pagamentos FOR DELETE
  USING (true);

-- Índices para melhor performance
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX idx_agendamentos_status ON public.agendamentos(status);
CREATE INDEX idx_agenda_config_data ON public.agenda_config(data);
CREATE INDEX idx_pagamentos_data ON public.pagamentos(data);
CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);

-- Migration: 20251028175638
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

-- Migration: 20251028213918
-- Limpar dados de teste para testes limpos do bot
-- Deletar mensagens primeiro (por causa da foreign key)
DELETE FROM bot_mensagens;

-- Deletar conversas
DELETE FROM bot_conversas;

-- Deletar agendamentos de teste
DELETE FROM agendamentos;

-- Migration: 20251028215205
-- Limpar todos os dados de teste
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;
DELETE FROM pagamentos;

-- Migration: 20251028231215
-- Criar tipo enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'profissional');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de roles (SECURITY DEFINER para evitar RLS recursivo)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela de logs do sistema (para super admin monitorar)
CREATE TABLE public.sistema_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  severidade TEXT NOT NULL CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
  mensagem TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sistema_logs ENABLE ROW LEVEL SECURITY;

-- Tabela de métricas de uso de IA
CREATE TABLE public.uso_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  total_requisicoes INTEGER DEFAULT 0,
  gemini_sucesso INTEGER DEFAULT 0,
  gemini_erro INTEGER DEFAULT 0,
  lovable_sucesso INTEGER DEFAULT 0,
  lovable_erro INTEGER DEFAULT 0,
  custo_estimado DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (data)
);

ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar role (evita RLS recursivo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::app_role)
$$;

-- RLS Policies para profiles
CREATE POLICY "Super admins podem ver todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super admins podem atualizar qualquer perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Perfis podem ser inseridos"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies para user_roles
CREATE POLICY "Super admins podem ver todos os roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins podem gerenciar roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies para sistema_logs
CREATE POLICY "Apenas super admins podem ver logs"
ON public.sistema_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Apenas super admins podem inserir logs"
ON public.sistema_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS Policies para uso_ia
CREATE POLICY "Apenas super admins podem ver métricas de IA"
ON public.uso_ia FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Apenas super admins podem inserir métricas"
ON public.uso_ia FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251028233328
-- Criar função temporária para adicionar usuário cliente
CREATE OR REPLACE FUNCTION criar_cliente_jennifer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  novo_user_id uuid;
BEGIN
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'jennifersilva@gmail.com') THEN
    RAISE NOTICE 'Usuário já existe';
    RETURN;
  END IF;
  
  -- Criar usuário (senha será 96862422)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jennifersilva@gmail.com',
    crypt('96862422', gen_salt('bf')),
    now(),
    '{"nome":"Jennifer Silva"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO novo_user_id;
  
  -- Aguardar trigger criar profile
  PERFORM pg_sleep(0.5);
  
  -- Adicionar role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (novo_user_id, 'admin');
  
  RAISE NOTICE 'Cliente Jennifer criada com sucesso';
END;
$$;

-- Executar a função
SELECT criar_cliente_jennifer();

-- Remover a função temporária
DROP FUNCTION criar_cliente_jennifer();

-- Migration: 20251028233443
-- Corrigir role da Jennifer para admin
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'jennifersilva@gmail.com'
);

-- Migration: 20251029001425
-- Limpar dados de teste do WhatsApp
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos WHERE origem = 'whatsapp';

-- Migration: 20251029002524
-- Remover serviços existentes
DELETE FROM servicos;

-- Adicionar serviços corretos do Studio Jennifer Silva
INSERT INTO servicos (nome, descricao, preco, duracao, ativo) VALUES
  ('Maquiagem', 'Maquiagem profissional', 80.00, 60, true),
  ('Penteado', 'Penteado profissional', 70.00, 60, true),
  ('Produção Noiva', 'Maquiagem e penteado para noiva', 300.00, 180, true),
  ('Produção Madrinha', 'Maquiagem e penteado para madrinha', 150.00, 120, true),
  ('Produção Daminha', 'Maquiagem e penteado para daminha', 80.00, 60, true),
  ('Produção Debutante', 'Maquiagem e penteado para debutante', 180.00, 120, true),
  ('Curso Automaquiagem', 'Curso de automaquiagem', 250.00, 180, true),
  ('Mechas', 'Mechas no cabelo', 120.00, 120, true),
  ('Progressiva', 'Progressiva capilar', 200.00, 180, true),
  ('Botox Capilar', 'Tratamento de botox capilar', 150.00, 120, true),
  ('Coloração', 'Coloração de cabelo', 100.00, 120, true),
  ('Corte', 'Corte de cabelo', 50.00, 45, true),
  ('Hidratação', 'Hidratação capilar', 60.00, 60, true),
  ('Escova Lisa', 'Escova lisa', 40.00, 45, true),
  ('Modelagem', 'Modelagem de cabelo', 50.00, 45, true),
  ('Design de Sobrancelhas', 'Design de sobrancelhas', 30.00, 30, true),
  ('Design de Sobrancelhas com Henna', 'Design de sobrancelhas com aplicação de henna', 45.00, 45, true),
  ('Extensão de Cílios', 'Aplicação de extensão de cílios', 80.00, 90, true),
  ('Fitagem', 'Fitagem capilar', 80.00, 120, true),
  ('Curso de Cabeleireira', 'Curso profissional de cabeleireira', 500.00, 240, true);

-- Criar tabela para números bloqueados
CREATE TABLE IF NOT EXISTS bot_numeros_bloqueados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE bot_numeros_bloqueados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Números bloqueados são visíveis por todos"
  ON bot_numeros_bloqueados FOR SELECT
  USING (true);

CREATE POLICY "Números bloqueados podem ser inseridos"
  ON bot_numeros_bloqueados FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Números bloqueados podem ser deletados"
  ON bot_numeros_bloqueados FOR DELETE
  USING (true);

-- Migration: 20251029003140
-- Limpar histórico de conversas para teste
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029004152
-- Limpar histórico de mensagens do bot
DELETE FROM bot_mensagens;

-- Limpar histórico de conversas do bot
DELETE FROM bot_conversas;

-- Limpar agendamentos (reservas)
DELETE FROM agendamentos;

-- Migration: 20251029011437
-- Limpeza de histórico para novos testes
DELETE FROM public.pagamentos;
DELETE FROM public.agendamentos;
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;

-- Migration: 20251029150014
-- Limpar histórico de conversas do bot para novo teste
BEGIN;
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;
COMMIT;

-- Migration: 20251029152902
-- Limpar histórico de conversas e agendamentos para testes
BEGIN;

-- Deletar todas as mensagens do bot
DELETE FROM public.bot_mensagens;

-- Deletar todas as conversas do bot
DELETE FROM public.bot_conversas;

-- Deletar apenas agendamentos vindos do WhatsApp
DELETE FROM public.agendamentos WHERE origem = 'whatsapp';

COMMIT;

-- Migration: 20251029153732
-- Habilitar realtime para agendamentos se ainda não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'agendamentos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
  END IF;
END
$$;

-- Migration: 20251029153953
-- Limpar histórico de conversas e agendamentos para novo teste
BEGIN;

DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;
DELETE FROM public.agendamentos WHERE origem = 'whatsapp';

COMMIT;

-- Migration: 20251029160505
-- Limpar histórico de conversas e agendamentos para testes
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;

-- Migration: 20251029172040
-- Limpar histórico de conversas e agendamentos para novos testes
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;

-- Migration: 20251029172623
-- Limpar histórico para testar com dados atualizados
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;

-- Migration: 20251029174133
-- Add per-conversation bot switch
ALTER TABLE public.bot_conversas
ADD COLUMN IF NOT EXISTS bot_ativo boolean NOT NULL DEFAULT true;

-- Migration: 20251029174537
-- Limpar histórico para testes
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;
DELETE FROM pagamentos;

-- Migration: 20251029180526
-- Limpar histórico para testes (conversas, agendamentos e mensagens)
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos;
DELETE FROM pagamentos;

-- Migration: 20251029180954
-- Limpar mensagens e conversas do bot
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029181526
-- Limpar mensagens e conversas do bot (pós-ajuste de serviços)
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029182219
-- Reset bot data after fix
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029182845
-- Clear bot messages after date fix
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029183532
-- Clear bot messages again to test date parsing
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;

-- Migration: 20251029184726
-- Clear bot messages and conversations but keep appointments intact
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;

-- Migration: 20251029191836
-- Limpar histórico de mensagens e conversas do bot para recomeçar
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;

-- Migration: 20251030151533
-- Fix RLS policies to restrict access to customer PII data
-- Only authenticated admin/super_admin users should access this data

-- 1. Fix agendamentos table (contains customer names and phone numbers)
DROP POLICY IF EXISTS "Agendamentos são visíveis por todos" ON agendamentos;
CREATE POLICY "Staff can view appointments" ON agendamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser inseridos" ON agendamentos;
CREATE POLICY "Staff can insert appointments" ON agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser atualizados" ON agendamentos;
CREATE POLICY "Staff can update appointments" ON agendamentos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser deletados" ON agendamentos;
CREATE POLICY "Staff can delete appointments" ON agendamentos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. Fix profissionais table (contains staff email and phone)
DROP POLICY IF EXISTS "Profissionais são visíveis por todos" ON profissionais;
CREATE POLICY "Staff directory for authenticated" ON profissionais
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser inseridos" ON profissionais;
CREATE POLICY "Admins can insert professionals" ON profissionais
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser atualizados" ON profissionais;
CREATE POLICY "Admins can update professionals" ON profissionais
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser deletados" ON profissionais;
CREATE POLICY "Admins can delete professionals" ON profissionais
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Fix bot_conversas table (contains customer phone numbers)
DROP POLICY IF EXISTS "Conversas são visíveis por todos" ON bot_conversas;
CREATE POLICY "Admin can view conversations" ON bot_conversas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser inseridas" ON bot_conversas;
CREATE POLICY "Admin can insert conversations" ON bot_conversas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser atualizadas" ON bot_conversas;
CREATE POLICY "Admin can update conversations" ON bot_conversas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser deletadas" ON bot_conversas;
CREATE POLICY "Admin can delete conversations" ON bot_conversas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 4. Fix bot_mensagens table (contains message content and phone numbers)
DROP POLICY IF EXISTS "Mensagens são visíveis por todos" ON bot_mensagens;
CREATE POLICY "Admin can view messages" ON bot_mensagens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser inseridas" ON bot_mensagens;
CREATE POLICY "Admin can insert messages" ON bot_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser atualizadas" ON bot_mensagens;
CREATE POLICY "Admin can update messages" ON bot_mensagens
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser deletadas" ON bot_mensagens;
CREATE POLICY "Admin can delete messages" ON bot_mensagens
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

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
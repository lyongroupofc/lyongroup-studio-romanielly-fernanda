-- Tabela de Promoções
CREATE TABLE promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  motivo TEXT,
  desconto_porcentagem DECIMAL,
  desconto_valor DECIMAL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Produtos
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  quantidade_atual INTEGER DEFAULT 0,
  quantidade_minima INTEGER DEFAULT 5,
  preco_custo DECIMAL,
  preco_venda DECIMAL,
  categoria TEXT,
  fornecedor TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade INTEGER NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Fidelidade de Clientes
CREATE TABLE cliente_fidelidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
  pontos_acumulados INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'bronze' CHECK (nivel IN ('bronze', 'prata', 'ouro')),
  total_gasto DECIMAL DEFAULT 0,
  total_servicos INTEGER DEFAULT 0,
  ultimo_servico DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Regras de Fidelidade
CREATE TABLE regras_fidelidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pontos_por_real INTEGER DEFAULT 1,
  pontos_resgate INTEGER DEFAULT 100,
  desconto_resgate DECIMAL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir regras padrão
INSERT INTO regras_fidelidade (pontos_por_real, pontos_resgate, desconto_resgate)
VALUES (1, 100, 10);

-- Tabela de Fluxos Automáticos
CREATE TABLE fluxos_automaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pos_primeira_visita', 'reativacao', 'manutencao', 'aniversario', 'natal', 'dia_mulher')),
  mensagem_template TEXT NOT NULL,
  dias_apos_evento INTEGER,
  ativo BOOLEAN DEFAULT true,
  hora_envio TIME DEFAULT '10:00',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Mensagens Agendadas
CREATE TABLE mensagens_agendadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID REFERENCES fluxos_automaticos(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  data_envio DATE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies para promocoes
ALTER TABLE promocoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promocoes"
ON promocoes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert promocoes"
ON promocoes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update promocoes"
ON promocoes FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete promocoes"
ON promocoes FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sistema pode ver promocoes ativas"
ON promocoes FOR SELECT
USING (true);

-- RLS Policies para produtos
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view produtos"
ON produtos FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert produtos"
ON produtos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update produtos"
ON produtos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete produtos"
ON produtos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies para movimentacoes_estoque
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view movimentacoes"
ON movimentacoes_estoque FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert movimentacoes"
ON movimentacoes_estoque FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies para cliente_fidelidade
ALTER TABLE cliente_fidelidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fidelidade"
ON cliente_fidelidade FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert fidelidade"
ON cliente_fidelidade FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update fidelidade"
ON cliente_fidelidade FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sistema pode atualizar fidelidade"
ON cliente_fidelidade FOR UPDATE
USING (true);

CREATE POLICY "Sistema pode inserir fidelidade"
ON cliente_fidelidade FOR INSERT
WITH CHECK (true);

-- RLS Policies para regras_fidelidade
ALTER TABLE regras_fidelidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view regras fidelidade"
ON regras_fidelidade FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update regras fidelidade"
ON regras_fidelidade FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sistema pode ver regras fidelidade"
ON regras_fidelidade FOR SELECT
USING (true);

-- RLS Policies para fluxos_automaticos
ALTER TABLE fluxos_automaticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fluxos"
ON fluxos_automaticos FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert fluxos"
ON fluxos_automaticos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update fluxos"
ON fluxos_automaticos FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete fluxos"
ON fluxos_automaticos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sistema pode ver fluxos ativos"
ON fluxos_automaticos FOR SELECT
USING (true);

-- RLS Policies para mensagens_agendadas
ALTER TABLE mensagens_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mensagens agendadas"
ON mensagens_agendadas FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sistema pode inserir mensagens"
ON mensagens_agendadas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar mensagens"
ON mensagens_agendadas FOR UPDATE
USING (true);
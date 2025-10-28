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
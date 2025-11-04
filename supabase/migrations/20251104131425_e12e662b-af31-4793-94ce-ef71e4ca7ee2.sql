-- Criar tabela para rastrear lembretes enviados
CREATE TABLE IF NOT EXISTS public.lembretes_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  cliente_telefone TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  tipo_lembrete TEXT NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  servico_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lembretes_agendamento ON public.lembretes_enviados(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_tipo ON public.lembretes_enviados(tipo_lembrete);
CREATE INDEX IF NOT EXISTS idx_lembretes_telefone ON public.lembretes_enviados(cliente_telefone);

-- Habilitar RLS
ALTER TABLE public.lembretes_enviados ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins podem ver lembretes enviados"
  ON public.lembretes_enviados FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Sistema pode inserir lembretes"
  ON public.lembretes_enviados FOR INSERT
  WITH CHECK (true);
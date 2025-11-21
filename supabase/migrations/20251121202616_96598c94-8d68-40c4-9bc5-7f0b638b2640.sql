-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  data_nascimento DATE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para clientes
CREATE POLICY "Admins podem ver todos os clientes"
ON public.clientes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins podem inserir clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins podem atualizar clientes"
ON public.clientes
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Sistema pode inserir clientes"
ON public.clientes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar clientes"
ON public.clientes
FOR UPDATE
USING (true);

-- Adicionar coluna cliente_id na tabela agendamentos
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_data_nascimento ON public.clientes(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_id ON public.agendamentos(cliente_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_clientes_updated_at();

-- Migrar dados existentes (clientes únicos dos agendamentos)
INSERT INTO public.clientes (nome, telefone, data_nascimento)
SELECT DISTINCT ON (cliente_telefone)
  cliente_nome, 
  cliente_telefone,
  NULL
FROM public.agendamentos
WHERE cliente_telefone IS NOT NULL AND cliente_telefone != ''
ORDER BY cliente_telefone, created_at DESC
ON CONFLICT (telefone) DO NOTHING;

-- Atualizar agendamentos com cliente_id
UPDATE public.agendamentos a
SET cliente_id = c.id
FROM public.clientes c
WHERE a.cliente_telefone = c.telefone AND a.cliente_id IS NULL;
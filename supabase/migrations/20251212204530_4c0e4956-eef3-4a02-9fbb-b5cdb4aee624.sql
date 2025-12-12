-- Adicionar campo de percentual de comissão na tabela profissionais
ALTER TABLE profissionais 
ADD COLUMN IF NOT EXISTS comissao_percentual NUMERIC DEFAULT 0;

-- Criar tabela para histórico de comissões pagas
CREATE TABLE IF NOT EXISTS comissoes_pagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID REFERENCES profissionais(id),
  profissional_nome TEXT NOT NULL,
  valor_total_servicos NUMERIC NOT NULL,
  percentual_aplicado NUMERIC NOT NULL,
  valor_comissao NUMERIC NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE comissoes_pagas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para comissoes_pagas
CREATE POLICY "Admins can view comissoes" 
ON comissoes_pagas 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert comissoes" 
ON comissoes_pagas 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete comissoes" 
ON comissoes_pagas 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
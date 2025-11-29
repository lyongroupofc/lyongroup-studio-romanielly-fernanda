-- Adicionar colunas de promoção na tabela agendamentos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS promocao_id UUID REFERENCES promocoes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS desconto_aplicado NUMERIC DEFAULT 0;
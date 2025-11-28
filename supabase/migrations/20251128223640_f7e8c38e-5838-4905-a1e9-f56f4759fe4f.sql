-- Criar tabela de despesas
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor DECIMAL NOT NULL,
  categoria TEXT,
  data DATE NOT NULL,
  metodo_pagamento TEXT,
  comprovante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admins
CREATE POLICY "Admins can view despesas" ON despesas FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert despesas" ON despesas FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update despesas" ON despesas FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete despesas" ON despesas FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
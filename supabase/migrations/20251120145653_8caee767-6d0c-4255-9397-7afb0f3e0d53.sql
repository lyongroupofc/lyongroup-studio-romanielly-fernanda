-- Adicionar índices para melhorar performance das queries
-- Esses índices aceleram as consultas mais comuns sem afetar funcionalidade

-- Índice para agendamentos por data e status (usado no Dashboard e Agenda)
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
  ON agendamentos(data, status);

-- Índice para pagamentos por data (usado no Dashboard para cálculos de faturamento)
CREATE INDEX IF NOT EXISTS idx_pagamentos_data 
  ON pagamentos(data);

-- Índice para bot_conversas por telefone e último contato (usado no WhatsApp bot)
CREATE INDEX IF NOT EXISTS idx_bot_conversas_telefone 
  ON bot_conversas(telefone, ultimo_contato);

-- Índice para agendamentos por created_at (usado nas notificações)
CREATE INDEX IF NOT EXISTS idx_agendamentos_created_at 
  ON agendamentos(created_at DESC);
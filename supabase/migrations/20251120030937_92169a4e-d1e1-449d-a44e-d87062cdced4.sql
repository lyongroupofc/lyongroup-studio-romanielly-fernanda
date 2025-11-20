-- Adicionar índices para melhorar performance das queries
-- Estes índices aceleram consultas sem afetar funcionalidade

-- Índice para agendamentos por data e status
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
ON public.agendamentos(data DESC, status);

-- Índice para agendamentos por data
CREATE INDEX IF NOT EXISTS idx_agendamentos_data 
ON public.agendamentos(data DESC);

-- Índice para pagamentos por data
CREATE INDEX IF NOT EXISTS idx_pagamentos_data 
ON public.pagamentos(data DESC);

-- Índice para bot_conversas por telefone
CREATE INDEX IF NOT EXISTS idx_bot_conversas_telefone 
ON public.bot_conversas(telefone);

-- Índice para bot_conversas por ultimo_contato
CREATE INDEX IF NOT EXISTS idx_bot_conversas_ultimo_contato 
ON public.bot_conversas(ultimo_contato DESC);

-- Índice para lembretes_enviados por data_envio
CREATE INDEX IF NOT EXISTS idx_lembretes_enviados_data 
ON public.lembretes_enviados(data_envio DESC);
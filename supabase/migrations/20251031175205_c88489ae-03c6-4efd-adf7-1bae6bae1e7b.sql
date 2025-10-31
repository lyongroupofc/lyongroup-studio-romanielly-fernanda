-- Adicionar campo instancia para isolamento multi-tenant
ALTER TABLE bot_conversas 
ADD COLUMN IF NOT EXISTS instancia TEXT DEFAULT 'default';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_bot_conversas_instancia 
ON bot_conversas(instancia);

-- Adicionar campo instancia em agendamentos para rastreamento
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS instancia TEXT;

-- Marcar conversas existentes como produção
UPDATE bot_conversas 
SET instancia = 'producao' 
WHERE instancia = 'default';
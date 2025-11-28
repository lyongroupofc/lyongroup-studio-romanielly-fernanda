
-- Adicionar coluna cliente_nome na tabela bot_conversas
ALTER TABLE bot_conversas 
ADD COLUMN IF NOT EXISTS cliente_nome TEXT;

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_bot_conversas_cliente_nome ON bot_conversas(cliente_nome);

-- Sincronizar nomes existentes dos clientes cadastrados
UPDATE bot_conversas bc
SET cliente_nome = c.nome
FROM clientes c
WHERE REPLACE(REPLACE(bc.telefone, '@lid', ''), '@s.whatsapp.net', '') = c.telefone
AND bc.cliente_nome IS NULL;

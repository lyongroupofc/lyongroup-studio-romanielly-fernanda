-- Remover completamente o constraint antigo
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_origem_check;

-- Atualizar valores antigos para os novos padrões
UPDATE agendamentos 
SET origem = 'bot'
WHERE origem = 'whatsapp';

UPDATE agendamentos 
SET origem = 'link_externo'
WHERE origem = 'site';

-- Atualizar valores NULL para 'manual' como padrão
UPDATE agendamentos 
SET origem = 'manual'
WHERE origem IS NULL;

-- Adicionar novo constraint com os valores corretos
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_origem_check 
CHECK (origem = ANY (ARRAY['manual'::text, 'bot'::text, 'link_externo'::text]));
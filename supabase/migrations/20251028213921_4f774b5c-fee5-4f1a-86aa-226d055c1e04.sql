-- Limpar dados de teste para testes limpos do bot
-- Deletar mensagens primeiro (por causa da foreign key)
DELETE FROM bot_mensagens;

-- Deletar conversas
DELETE FROM bot_conversas;

-- Deletar agendamentos de teste
DELETE FROM agendamentos;
-- Limpar dados de teste do WhatsApp
DELETE FROM bot_mensagens;
DELETE FROM bot_conversas;
DELETE FROM agendamentos WHERE origem = 'whatsapp';
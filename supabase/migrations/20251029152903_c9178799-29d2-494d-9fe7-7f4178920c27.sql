-- Limpar histórico de conversas e agendamentos para testes
BEGIN;

-- Deletar todas as mensagens do bot
DELETE FROM public.bot_mensagens;

-- Deletar todas as conversas do bot
DELETE FROM public.bot_conversas;

-- Deletar apenas agendamentos vindos do WhatsApp
DELETE FROM public.agendamentos WHERE origem = 'whatsapp';

COMMIT;
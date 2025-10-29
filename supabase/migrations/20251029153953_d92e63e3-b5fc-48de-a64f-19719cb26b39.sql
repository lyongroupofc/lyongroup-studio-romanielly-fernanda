-- Limpar histórico de conversas e agendamentos para novo teste
BEGIN;

DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;
DELETE FROM public.agendamentos WHERE origem = 'whatsapp';

COMMIT;
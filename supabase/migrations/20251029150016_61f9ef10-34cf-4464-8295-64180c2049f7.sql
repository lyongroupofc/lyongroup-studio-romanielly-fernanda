-- Limpar histórico de conversas do bot para novo teste
BEGIN;
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;
COMMIT;
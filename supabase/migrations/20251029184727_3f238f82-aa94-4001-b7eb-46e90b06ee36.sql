-- Clear bot messages and conversations but keep appointments intact
DELETE FROM public.bot_mensagens;
DELETE FROM public.bot_conversas;
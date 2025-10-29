-- Add per-conversation bot switch
ALTER TABLE public.bot_conversas
ADD COLUMN IF NOT EXISTS bot_ativo boolean NOT NULL DEFAULT true;
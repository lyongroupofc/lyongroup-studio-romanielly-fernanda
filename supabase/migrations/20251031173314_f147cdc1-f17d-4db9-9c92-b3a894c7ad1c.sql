-- Fix public data exposure by restricting access to sensitive configuration and payment tables
-- This addresses critical security issue: PUBLIC_DATA_EXPOSURE

-- Drop all existing permissive policies on agenda_config
DROP POLICY IF EXISTS "Config da agenda é visível por todos" ON public.agenda_config;
DROP POLICY IF EXISTS "Config da agenda pode ser inserida" ON public.agenda_config;
DROP POLICY IF EXISTS "Config da agenda pode ser atualizada" ON public.agenda_config;
DROP POLICY IF EXISTS "Config da agenda pode ser deletada" ON public.agenda_config;

-- Create restricted policies for agenda_config (admin/super_admin only)
CREATE POLICY "Admins can view agenda config"
  ON public.agenda_config FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert agenda config"
  ON public.agenda_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update agenda config"
  ON public.agenda_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete agenda config"
  ON public.agenda_config FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Drop all existing permissive policies on bot_config
DROP POLICY IF EXISTS "Config é visível por todos" ON public.bot_config;
DROP POLICY IF EXISTS "Config pode ser inserida" ON public.bot_config;
DROP POLICY IF EXISTS "Config pode ser atualizada" ON public.bot_config;
DROP POLICY IF EXISTS "Config pode ser deletada" ON public.bot_config;

-- Create restricted policies for bot_config (admin/super_admin only)
CREATE POLICY "Admins can view bot config"
  ON public.bot_config FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert bot config"
  ON public.bot_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update bot config"
  ON public.bot_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete bot config"
  ON public.bot_config FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Drop all existing permissive policies on bot_sessao
DROP POLICY IF EXISTS "Sessão é visível por todos" ON public.bot_sessao;
DROP POLICY IF EXISTS "Sessão pode ser inserida" ON public.bot_sessao;
DROP POLICY IF EXISTS "Sessão pode ser atualizada" ON public.bot_sessao;
DROP POLICY IF EXISTS "Sessão pode ser deletada" ON public.bot_sessao;

-- Create restricted policies for bot_sessao (admin/super_admin only)
CREATE POLICY "Admins can view bot session"
  ON public.bot_sessao FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert bot session"
  ON public.bot_sessao FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update bot session"
  ON public.bot_sessao FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete bot session"
  ON public.bot_sessao FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Drop all existing permissive policies on pagamentos
DROP POLICY IF EXISTS "Pagamentos são visíveis por todos" ON public.pagamentos;
DROP POLICY IF EXISTS "Pagamentos podem ser inseridos" ON public.pagamentos;
DROP POLICY IF EXISTS "Pagamentos podem ser atualizados" ON public.pagamentos;
DROP POLICY IF EXISTS "Pagamentos podem ser deletados" ON public.pagamentos;

-- Create restricted policies for pagamentos (admin/super_admin only)
CREATE POLICY "Admins can view payments"
  ON public.pagamentos FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert payments"
  ON public.pagamentos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update payments"
  ON public.pagamentos FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete payments"
  ON public.pagamentos FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Drop all existing permissive policies on servicos
DROP POLICY IF EXISTS "Serviços são visíveis por todos" ON public.servicos;
DROP POLICY IF EXISTS "Serviços podem ser inseridos" ON public.servicos;
DROP POLICY IF EXISTS "Serviços podem ser atualizados" ON public.servicos;
DROP POLICY IF EXISTS "Serviços podem ser deletados" ON public.servicos;

-- Create policies for servicos - public can view, only admins can modify
CREATE POLICY "Public can view active services"
  ON public.servicos FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can view all services"
  ON public.servicos FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert services"
  ON public.servicos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update services"
  ON public.servicos FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete services"
  ON public.servicos FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
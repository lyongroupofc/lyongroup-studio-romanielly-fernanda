-- Fix RLS policies to restrict access to customer PII data
-- Only authenticated admin/super_admin users should access this data

-- 1. Fix agendamentos table (contains customer names and phone numbers)
DROP POLICY IF EXISTS "Agendamentos são visíveis por todos" ON agendamentos;
CREATE POLICY "Staff can view appointments" ON agendamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser inseridos" ON agendamentos;
CREATE POLICY "Staff can insert appointments" ON agendamentos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser atualizados" ON agendamentos;
CREATE POLICY "Staff can update appointments" ON agendamentos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Agendamentos podem ser deletados" ON agendamentos;
CREATE POLICY "Staff can delete appointments" ON agendamentos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. Fix profissionais table (contains staff email and phone)
DROP POLICY IF EXISTS "Profissionais são visíveis por todos" ON profissionais;
CREATE POLICY "Staff directory for authenticated" ON profissionais
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser inseridos" ON profissionais;
CREATE POLICY "Admins can insert professionals" ON profissionais
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser atualizados" ON profissionais;
CREATE POLICY "Admins can update professionals" ON profissionais
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Profissionais podem ser deletados" ON profissionais;
CREATE POLICY "Admins can delete professionals" ON profissionais
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Fix bot_conversas table (contains customer phone numbers)
DROP POLICY IF EXISTS "Conversas são visíveis por todos" ON bot_conversas;
CREATE POLICY "Admin can view conversations" ON bot_conversas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser inseridas" ON bot_conversas;
CREATE POLICY "Admin can insert conversations" ON bot_conversas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser atualizadas" ON bot_conversas;
CREATE POLICY "Admin can update conversations" ON bot_conversas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Conversas podem ser deletadas" ON bot_conversas;
CREATE POLICY "Admin can delete conversations" ON bot_conversas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 4. Fix bot_mensagens table (contains message content and phone numbers)
DROP POLICY IF EXISTS "Mensagens são visíveis por todos" ON bot_mensagens;
CREATE POLICY "Admin can view messages" ON bot_mensagens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser inseridas" ON bot_mensagens;
CREATE POLICY "Admin can insert messages" ON bot_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser atualizadas" ON bot_mensagens;
CREATE POLICY "Admin can update messages" ON bot_mensagens
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Mensagens podem ser deletadas" ON bot_mensagens;
CREATE POLICY "Admin can delete messages" ON bot_mensagens
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
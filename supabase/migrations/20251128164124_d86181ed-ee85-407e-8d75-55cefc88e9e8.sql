-- Adicionar política de DELETE para admins na tabela clientes
CREATE POLICY "Admins podem deletar clientes" 
ON public.clientes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
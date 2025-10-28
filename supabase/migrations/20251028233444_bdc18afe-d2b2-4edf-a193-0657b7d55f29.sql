-- Corrigir role da Jennifer para admin
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'jennifersilva@gmail.com'
);
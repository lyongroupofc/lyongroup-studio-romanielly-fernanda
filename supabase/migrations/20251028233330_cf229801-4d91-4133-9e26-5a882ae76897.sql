-- Criar função temporária para adicionar usuário cliente
CREATE OR REPLACE FUNCTION criar_cliente_jennifer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  novo_user_id uuid;
BEGIN
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'jennifersilva@gmail.com') THEN
    RAISE NOTICE 'Usuário já existe';
    RETURN;
  END IF;
  
  -- Criar usuário (senha será 96862422)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jennifersilva@gmail.com',
    crypt('96862422', gen_salt('bf')),
    now(),
    '{"nome":"Jennifer Silva"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO novo_user_id;
  
  -- Aguardar trigger criar profile
  PERFORM pg_sleep(0.5);
  
  -- Adicionar role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (novo_user_id, 'admin');
  
  RAISE NOTICE 'Cliente Jennifer criada com sucesso';
END;
$$;

-- Executar a função
SELECT criar_cliente_jennifer();

-- Remover a função temporária
DROP FUNCTION criar_cliente_jennifer();
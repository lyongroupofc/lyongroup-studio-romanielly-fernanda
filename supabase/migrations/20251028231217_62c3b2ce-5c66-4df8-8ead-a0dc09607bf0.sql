-- Criar tipo enum para roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'profissional');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de roles (SECURITY DEFINER para evitar RLS recursivo)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Tabela de logs do sistema (para super admin monitorar)
CREATE TABLE public.sistema_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  severidade TEXT NOT NULL CHECK (severidade IN ('info', 'warning', 'error', 'critical')),
  mensagem TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sistema_logs ENABLE ROW LEVEL SECURITY;

-- Tabela de métricas de uso de IA
CREATE TABLE public.uso_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  total_requisicoes INTEGER DEFAULT 0,
  gemini_sucesso INTEGER DEFAULT 0,
  gemini_erro INTEGER DEFAULT 0,
  lovable_sucesso INTEGER DEFAULT 0,
  lovable_erro INTEGER DEFAULT 0,
  custo_estimado DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (data)
);

ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para verificar role (evita RLS recursivo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin'::app_role)
$$;

-- RLS Policies para profiles
CREATE POLICY "Super admins podem ver todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Super admins podem atualizar qualquer perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Perfis podem ser inseridos"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies para user_roles
CREATE POLICY "Super admins podem ver todos os roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins podem gerenciar roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies para sistema_logs
CREATE POLICY "Apenas super admins podem ver logs"
ON public.sistema_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Apenas super admins podem inserir logs"
ON public.sistema_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS Policies para uso_ia
CREATE POLICY "Apenas super admins podem ver métricas de IA"
ON public.uso_ia FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Apenas super admins podem inserir métricas"
ON public.uso_ia FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'admin',
    'profissional'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'super_admin'::app_role)
$$;


SET default_table_access_method = heap;

--
-- Name: agenda_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data date NOT NULL,
    fechado boolean DEFAULT false,
    horarios_bloqueados text[] DEFAULT '{}'::text[],
    horarios_extras text[] DEFAULT '{}'::text[],
    observacoes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agendamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data date NOT NULL,
    horario time without time zone NOT NULL,
    cliente_nome text NOT NULL,
    cliente_telefone text NOT NULL,
    servico_id uuid,
    servico_nome text NOT NULL,
    profissional_id uuid,
    profissional_nome text,
    status text DEFAULT 'Confirmado'::text,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    origem text DEFAULT 'manual'::text,
    bot_conversa_id uuid,
    instancia text,
    CONSTRAINT agendamentos_origem_check CHECK ((origem = ANY (ARRAY['manual'::text, 'whatsapp'::text, 'site'::text])))
);


--
-- Name: bot_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chave text NOT NULL,
    valor jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bot_conversas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_conversas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telefone text NOT NULL,
    contexto jsonb DEFAULT '{}'::jsonb,
    ultimo_contato timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    bot_ativo boolean DEFAULT true NOT NULL,
    instancia text DEFAULT 'default'::text
);


--
-- Name: bot_mensagens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_mensagens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversa_id uuid,
    telefone text NOT NULL,
    tipo text NOT NULL,
    conteudo text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT bot_mensagens_tipo_check CHECK ((tipo = ANY (ARRAY['recebida'::text, 'enviada'::text])))
);


--
-- Name: bot_numeros_bloqueados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_numeros_bloqueados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bot_sessao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_sessao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'desconectado'::text NOT NULL,
    qr_code text,
    dados_sessao jsonb DEFAULT '{}'::jsonb,
    ultima_atividade timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bot_sessao_status_check CHECK ((status = ANY (ARRAY['conectado'::text, 'desconectado'::text, 'erro'::text])))
);


--
-- Name: lembretes_enviados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lembretes_enviados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agendamento_id uuid,
    cliente_telefone text NOT NULL,
    cliente_nome text NOT NULL,
    tipo_lembrete text NOT NULL,
    data_envio timestamp with time zone DEFAULT now(),
    servico_nome text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agendamento_id uuid,
    data date NOT NULL,
    cliente_nome text NOT NULL,
    servico text NOT NULL,
    valor numeric(10,2) NOT NULL,
    metodo_pagamento text,
    status text DEFAULT 'Pendente'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    telefone text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profissionais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profissionais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    especialidades text[],
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: servicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    duracao integer NOT NULL,
    preco numeric(10,2) NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sistema_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sistema_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    severidade text NOT NULL,
    mensagem text NOT NULL,
    detalhes jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sistema_logs_severidade_check CHECK ((severidade = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: uso_ia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uso_ia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data date NOT NULL,
    total_requisicoes integer DEFAULT 0,
    gemini_sucesso integer DEFAULT 0,
    gemini_erro integer DEFAULT 0,
    lovable_sucesso integer DEFAULT 0,
    lovable_erro integer DEFAULT 0,
    custo_estimado numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agenda_config agenda_config_data_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_config
    ADD CONSTRAINT agenda_config_data_key UNIQUE (data);


--
-- Name: agenda_config agenda_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_config
    ADD CONSTRAINT agenda_config_pkey PRIMARY KEY (id);


--
-- Name: agendamentos agendamentos_data_horario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_data_horario_key UNIQUE (data, horario);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id);


--
-- Name: bot_config bot_config_chave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_chave_key UNIQUE (chave);


--
-- Name: bot_config bot_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_config
    ADD CONSTRAINT bot_config_pkey PRIMARY KEY (id);


--
-- Name: bot_conversas bot_conversas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_conversas
    ADD CONSTRAINT bot_conversas_pkey PRIMARY KEY (id);


--
-- Name: bot_mensagens bot_mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_mensagens
    ADD CONSTRAINT bot_mensagens_pkey PRIMARY KEY (id);


--
-- Name: bot_numeros_bloqueados bot_numeros_bloqueados_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_numeros_bloqueados
    ADD CONSTRAINT bot_numeros_bloqueados_numero_key UNIQUE (numero);


--
-- Name: bot_numeros_bloqueados bot_numeros_bloqueados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_numeros_bloqueados
    ADD CONSTRAINT bot_numeros_bloqueados_pkey PRIMARY KEY (id);


--
-- Name: bot_sessao bot_sessao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_sessao
    ADD CONSTRAINT bot_sessao_pkey PRIMARY KEY (id);


--
-- Name: lembretes_enviados lembretes_enviados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes_enviados
    ADD CONSTRAINT lembretes_enviados_pkey PRIMARY KEY (id);


--
-- Name: pagamentos pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profissionais profissionais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_pkey PRIMARY KEY (id);


--
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);


--
-- Name: sistema_logs sistema_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_logs
    ADD CONSTRAINT sistema_logs_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: uso_ia uso_ia_data_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_ia
    ADD CONSTRAINT uso_ia_data_key UNIQUE (data);


--
-- Name: uso_ia uso_ia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_ia
    ADD CONSTRAINT uso_ia_pkey PRIMARY KEY (id);


--
-- Name: idx_agenda_config_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_config_data ON public.agenda_config USING btree (data);


--
-- Name: idx_agendamentos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agendamentos_data ON public.agendamentos USING btree (data);


--
-- Name: idx_agendamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agendamentos_status ON public.agendamentos USING btree (status);


--
-- Name: idx_bot_conversas_instancia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_conversas_instancia ON public.bot_conversas USING btree (instancia);


--
-- Name: idx_bot_conversas_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_conversas_telefone ON public.bot_conversas USING btree (telefone);


--
-- Name: idx_bot_mensagens_conversa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_mensagens_conversa ON public.bot_mensagens USING btree (conversa_id);


--
-- Name: idx_lembretes_agendamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_agendamento ON public.lembretes_enviados USING btree (agendamento_id);


--
-- Name: idx_lembretes_telefone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_telefone ON public.lembretes_enviados USING btree (cliente_telefone);


--
-- Name: idx_lembretes_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lembretes_tipo ON public.lembretes_enviados USING btree (tipo_lembrete);


--
-- Name: idx_pagamentos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_data ON public.pagamentos USING btree (data);


--
-- Name: idx_pagamentos_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_status ON public.pagamentos USING btree (status);


--
-- Name: agendamentos agendamentos_bot_conversa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_bot_conversa_id_fkey FOREIGN KEY (bot_conversa_id) REFERENCES public.bot_conversas(id) ON DELETE SET NULL;


--
-- Name: agendamentos agendamentos_profissional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id);


--
-- Name: agendamentos agendamentos_servico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos(id);


--
-- Name: bot_mensagens bot_mensagens_conversa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_mensagens
    ADD CONSTRAINT bot_mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.bot_conversas(id) ON DELETE CASCADE;


--
-- Name: lembretes_enviados lembretes_enviados_agendamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes_enviados
    ADD CONSTRAINT lembretes_enviados_agendamento_id_fkey FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE CASCADE;


--
-- Name: pagamentos pagamentos_agendamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos
    ADD CONSTRAINT pagamentos_agendamento_id_fkey FOREIGN KEY (agendamento_id) REFERENCES public.agendamentos(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bot_conversas Admin can delete conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete conversations" ON public.bot_conversas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_mensagens Admin can delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete messages" ON public.bot_mensagens FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_conversas Admin can insert conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert conversations" ON public.bot_conversas FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_mensagens Admin can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert messages" ON public.bot_mensagens FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_conversas Admin can update conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update conversations" ON public.bot_conversas FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_mensagens Admin can update messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update messages" ON public.bot_mensagens FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_conversas Admin can view conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view conversations" ON public.bot_conversas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_mensagens Admin can view messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view messages" ON public.bot_mensagens FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agenda_config Admins can delete agenda config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete agenda config" ON public.agenda_config FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_config Admins can delete bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete bot config" ON public.bot_config FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_sessao Admins can delete bot session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete bot session" ON public.bot_sessao FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: pagamentos Admins can delete payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete payments" ON public.pagamentos FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profissionais Admins can delete professionals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete professionals" ON public.profissionais FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: servicos Admins can delete services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete services" ON public.servicos FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agenda_config Admins can insert agenda config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert agenda config" ON public.agenda_config FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_config Admins can insert bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert bot config" ON public.bot_config FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_sessao Admins can insert bot session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert bot session" ON public.bot_sessao FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: pagamentos Admins can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert payments" ON public.pagamentos FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profissionais Admins can insert professionals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert professionals" ON public.profissionais FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: servicos Admins can insert services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert services" ON public.servicos FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agenda_config Admins can update agenda config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update agenda config" ON public.agenda_config FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_config Admins can update bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update bot config" ON public.bot_config FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_sessao Admins can update bot session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update bot session" ON public.bot_sessao FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: pagamentos Admins can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update payments" ON public.pagamentos FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profissionais Admins can update professionals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update professionals" ON public.profissionais FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: servicos Admins can update services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update services" ON public.servicos FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agenda_config Admins can view agenda config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view agenda config" ON public.agenda_config FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: servicos Admins can view all services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all services" ON public.servicos FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_config Admins can view bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view bot config" ON public.bot_config FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: bot_sessao Admins can view bot session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view bot session" ON public.bot_sessao FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: pagamentos Admins can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view payments" ON public.pagamentos FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: lembretes_enviados Admins podem ver lembretes enviados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver lembretes enviados" ON public.lembretes_enviados FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: sistema_logs Apenas super admins podem inserir logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas super admins podem inserir logs" ON public.sistema_logs FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: uso_ia Apenas super admins podem inserir métricas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas super admins podem inserir métricas" ON public.uso_ia FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: sistema_logs Apenas super admins podem ver logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas super admins podem ver logs" ON public.sistema_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: uso_ia Apenas super admins podem ver métricas de IA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas super admins podem ver métricas de IA" ON public.uso_ia FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: bot_numeros_bloqueados Números bloqueados podem ser deletados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Números bloqueados podem ser deletados" ON public.bot_numeros_bloqueados FOR DELETE USING (true);


--
-- Name: bot_numeros_bloqueados Números bloqueados podem ser inseridos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Números bloqueados podem ser inseridos" ON public.bot_numeros_bloqueados FOR INSERT WITH CHECK (true);


--
-- Name: bot_numeros_bloqueados Números bloqueados são visíveis por todos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Números bloqueados são visíveis por todos" ON public.bot_numeros_bloqueados FOR SELECT USING (true);


--
-- Name: profiles Perfis podem ser inseridos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Perfis podem ser inseridos" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: servicos Public can view active services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active services" ON public.servicos FOR SELECT USING ((ativo = true));


--
-- Name: lembretes_enviados Sistema pode inserir lembretes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sistema pode inserir lembretes" ON public.lembretes_enviados FOR INSERT WITH CHECK (true);


--
-- Name: agendamentos Staff can delete appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete appointments" ON public.agendamentos FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agendamentos Staff can insert appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert appointments" ON public.agendamentos FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agendamentos Staff can update appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update appointments" ON public.agendamentos FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: agendamentos Staff can view appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view appointments" ON public.agendamentos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profissionais Staff directory for authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff directory for authenticated" ON public.profissionais FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: profiles Super admins podem atualizar qualquer perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem atualizar qualquer perfil" ON public.profiles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: user_roles Super admins podem gerenciar roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem gerenciar roles" ON public.user_roles TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: profiles Super admins podem ver todos os perfis; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem ver todos os perfis" ON public.profiles FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: user_roles Super admins podem ver todos os roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem ver todos os roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));


--
-- Name: profiles Usuários podem atualizar seu próprio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Usuários podem ver seu próprio perfil; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Usuários podem ver seus próprios roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver seus próprios roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: agenda_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agenda_config ENABLE ROW LEVEL SECURITY;

--
-- Name: agendamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_conversas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_conversas ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_mensagens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_mensagens ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_numeros_bloqueados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_numeros_bloqueados ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_sessao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_sessao ENABLE ROW LEVEL SECURITY;

--
-- Name: lembretes_enviados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lembretes_enviados ENABLE ROW LEVEL SECURITY;

--
-- Name: pagamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profissionais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

--
-- Name: servicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

--
-- Name: sistema_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistema_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: uso_ia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



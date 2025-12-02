-- Tabela de auditoria de agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NULL,
  tipo_evento text NOT NULL,
  dados_antes jsonb NULL,
  dados_depois jsonb NULL,
  origem text NULL,
  usuario_responsavel uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Relaciona com agendamentos, mas não impede exclusões futuras
ALTER TABLE public.agendamentos_auditoria
  ADD CONSTRAINT agendamentos_auditoria_agendamento_id_fkey
  FOREIGN KEY (agendamento_id)
  REFERENCES public.agendamentos(id)
  ON DELETE SET NULL;

-- Habilita RLS na tabela de auditoria
ALTER TABLE public.agendamentos_auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: admins/super admins podem ver
CREATE POLICY "Admins podem ver auditoria agendamentos"
ON public.agendamentos_auditoria
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Sistema (edge functions / service role) pode inserir auditoria
CREATE POLICY "Sistema pode inserir auditoria agendamentos"
ON public.agendamentos_auditoria
FOR INSERT
WITH CHECK (true);

-- Função de log de auditoria para agendamentos
CREATE OR REPLACE FUNCTION public.log_agendamento_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_tipo text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_tipo := 'criado';

    INSERT INTO public.agendamentos_auditoria (
      agendamento_id,
      tipo_evento,
      dados_antes,
      dados_depois,
      origem,
      usuario_responsavel
    ) VALUES (
      NEW.id,
      v_tipo,
      NULL,
      to_jsonb(NEW),
      NEW.origem,
      auth.uid()
    );

    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Define tipo de evento com base nas mudanças principais
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'Cancelado' THEN
        v_tipo := 'cancelado';
      ELSIF NEW.status = 'Excluido' THEN
        v_tipo := 'excluido';
      ELSE
        v_tipo := 'status_atualizado';
      END IF;
    ELSIF NEW.data IS DISTINCT FROM OLD.data OR NEW.horario IS DISTINCT FROM OLD.horario THEN
      v_tipo := 'reagendado';
    ELSE
      v_tipo := 'atualizado';
    END IF;

    INSERT INTO public.agendamentos_auditoria (
      agendamento_id,
      tipo_evento,
      dados_antes,
      dados_depois,
      origem,
      usuario_responsavel
    ) VALUES (
      NEW.id,
      v_tipo,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.origem,
      auth.uid()
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers para INSERT e UPDATE em agendamentos
DROP TRIGGER IF EXISTS agendamentos_auditoria_insert ON public.agendamentos;
DROP TRIGGER IF EXISTS agendamentos_auditoria_update ON public.agendamentos;

CREATE TRIGGER agendamentos_auditoria_insert
AFTER INSERT ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.log_agendamento_auditoria();

CREATE TRIGGER agendamentos_auditoria_update
AFTER UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.log_agendamento_auditoria();
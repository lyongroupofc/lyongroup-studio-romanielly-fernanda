-- Criar função para atualizar pontos de fidelidade automaticamente quando pagamento é registrado
CREATE OR REPLACE FUNCTION atualizar_fidelidade_apos_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_cliente_id UUID;
  v_pontos_por_real INTEGER;
  v_pontos_ganhos INTEGER;
BEGIN
  -- Só processa se o pagamento foi concluído
  IF NEW.status = 'Pago' THEN
    -- Buscar o cliente_id do agendamento
    SELECT cliente_id INTO v_cliente_id
    FROM agendamentos
    WHERE id = NEW.agendamento_id;
    
    -- Se encontrou cliente
    IF v_cliente_id IS NOT NULL THEN
      -- Buscar regras de fidelidade
      SELECT pontos_por_real INTO v_pontos_por_real
      FROM regras_fidelidade
      LIMIT 1;
      
      -- Calcular pontos ganhos
      v_pontos_ganhos := FLOOR(NEW.valor * COALESCE(v_pontos_por_real, 1));
      
      -- Atualizar ou criar registro de fidelidade
      INSERT INTO cliente_fidelidade (cliente_id, pontos_acumulados, total_gasto, total_servicos, ultimo_servico)
      VALUES (
        v_cliente_id,
        v_pontos_ganhos,
        NEW.valor,
        1,
        CURRENT_DATE
      )
      ON CONFLICT (cliente_id) 
      DO UPDATE SET
        pontos_acumulados = cliente_fidelidade.pontos_acumulados + v_pontos_ganhos,
        total_gasto = cliente_fidelidade.total_gasto + NEW.valor,
        total_servicos = cliente_fidelidade.total_servicos + 1,
        ultimo_servico = CURRENT_DATE,
        nivel = CASE
          WHEN (cliente_fidelidade.total_gasto + NEW.valor) >= 1000 THEN 'ouro'
          WHEN (cliente_fidelidade.total_gasto + NEW.valor) >= 500 THEN 'prata'
          ELSE 'bronze'
        END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para chamar a função
DROP TRIGGER IF EXISTS trigger_atualizar_fidelidade ON pagamentos;
CREATE TRIGGER trigger_atualizar_fidelidade
  AFTER INSERT OR UPDATE ON pagamentos
  FOR EACH ROW
  WHEN (NEW.status = 'Pago')
  EXECUTE FUNCTION atualizar_fidelidade_apos_pagamento();
-- Adicionar novos campos de status na tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS confirmado_cliente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS atendido boolean DEFAULT false;

-- Criar constraint para status_pagamento
ALTER TABLE public.agendamentos 
DROP CONSTRAINT IF EXISTS agendamentos_status_pagamento_check;

ALTER TABLE public.agendamentos 
ADD CONSTRAINT agendamentos_status_pagamento_check 
CHECK (status_pagamento IN ('pendente', 'pago', 'parcial'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_pagamento ON public.agendamentos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_atendido ON public.agendamentos(atendido);

-- Atualizar agendamentos existentes: se tem pagamento vinculado com status 'Pago', marcar como pago
UPDATE public.agendamentos a
SET status_pagamento = 'pago'
FROM public.pagamentos p
WHERE p.agendamento_id = a.id 
AND p.status = 'Pago'
AND a.status_pagamento = 'pendente';
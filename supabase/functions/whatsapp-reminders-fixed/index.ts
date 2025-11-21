import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('⏰ Iniciando envio de lembretes...');

    // Verificar se lembretes estão ativos
    const { data: configLembretes } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'lembretes_ativos')
      .maybeSingle();

    const lembretesAtivos = configLembretes?.valor?.valor !== false;
    if (!lembretesAtivos) {
      console.log('📴 Lembretes desativados via configuração');
      return new Response(JSON.stringify({ mensagem: 'Lembretes desativados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar agendamentos para amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split('T')[0];

    console.log('📅 Buscando agendamentos para:', dataAmanha);

    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('data', dataAmanha)
      .eq('status', 'Confirmado');

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      throw error;
    }

    console.log(`📋 ${agendamentos?.length || 0} agendamentos encontrados`);

    let enviados = 0;

    for (const agendamento of agendamentos || []) {
      try {
        const horarioFormatado = agendamento.horario.slice(0, 5);
        const dataFormatada = new Date(dataAmanha + 'T00:00:00').toLocaleDateString('pt-BR');
        
        const mensagem = `🔔 *Lembrete de Agendamento*

Olá ${agendamento.cliente_nome}!

Você tem um agendamento marcado para *amanhã* (${dataFormatada}) às *${horarioFormatado}*.

📌 Serviço: ${agendamento.servico_nome}

Caso precise remarcar ou cancelar, responda esta mensagem.

Até amanhã! 💜✨`;

        console.log(`📤 Enviando lembrete para ${agendamento.cliente_nome} (${agendamento.cliente_telefone})`);

        // Registrar lembrete no banco ANTES de enviar
        const { error: erroRegistro } = await supabase
          .from('lembretes_enviados')
          .insert({
            agendamento_id: agendamento.id,
            cliente_nome: agendamento.cliente_nome,
            cliente_telefone: agendamento.cliente_telefone,
            servico_nome: agendamento.servico_nome,
            tipo_lembrete: 'dia_anterior',
            data_envio: new Date().toISOString(),
          });

        if (erroRegistro) {
          console.error(`⚠️ Erro ao registrar lembrete para ${agendamento.cliente_nome}:`, erroRegistro);
        }

        // TODO: Enviar via WhatsApp Business API
        // Por enquanto, apenas registramos no banco
        // Quando integrar com Evolution API ou WhatsApp Business API:
        // const sendResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${supabaseKey}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     telefone: agendamento.cliente_telefone,
        //     mensagem,
        //   }),
        // });

        enviados++;
        console.log(`✅ Lembrete registrado para ${agendamento.cliente_nome}`);

        // Aguardar 1 segundo entre registros
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (erroIndividual) {
        console.error(`❌ Erro ao processar lembrete para ${agendamento.cliente_nome}:`, erroIndividual);
      }
    }

    console.log(`✅ Processo concluído: ${enviados} lembretes registrados`);

    return new Response(JSON.stringify({ 
      total: agendamentos?.length || 0,
      enviados,
      remindersCount: enviados,
      mensagem: `${enviados} lembretes registrados com sucesso`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro geral ao processar lembretes:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      details: error
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

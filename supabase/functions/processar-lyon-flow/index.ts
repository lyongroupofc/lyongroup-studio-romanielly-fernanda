import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    console.log('🚀 Iniciando processamento de fluxos automáticos');

    // Buscar fluxos ativos
    const { data: fluxos, error: fluxosError } = await supabase
      .from('fluxos_automaticos')
      .select('*')
      .eq('ativo', true);

    if (fluxosError) {
      console.error('Erro ao buscar fluxos:', fluxosError);
      throw fluxosError;
    }

    console.log(`✅ ${fluxos?.length || 0} fluxos ativos encontrados`);

    const hoje = new Date();
    const hojeBrasil = new Date(hoje.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dataHoje = hojeBrasil.toISOString().split('T')[0];

    let totalEnviados = 0;

    for (const fluxo of fluxos || []) {
      console.log(`📋 Processando fluxo: ${fluxo.tipo}`);
      
      let clientesParaEnviar: any[] = [];

      switch (fluxo.tipo) {
        case 'aniversario':
          // Buscar clientes com aniversário hoje
          const { data: aniversariantes } = await supabase
            .from('clientes')
            .select('*')
            .not('data_nascimento', 'is', null);

          clientesParaEnviar = (aniversariantes || []).filter(cliente => {
            const dataNasc = new Date(cliente.data_nascimento);
            return dataNasc.getDate() === hojeBrasil.getDate() && 
                   dataNasc.getMonth() === hojeBrasil.getMonth();
          });
          console.log(`🎂 ${clientesParaEnviar.length} aniversariantes hoje`);
          break;

        case 'pos_primeira_visita':
          // Buscar clientes que tiveram primeiro agendamento concluído há X dias
          const diasAposEvento = fluxo.dias_apos_evento || 1;
          const dataAlvo = new Date(hojeBrasil);
          dataAlvo.setDate(dataAlvo.getDate() - diasAposEvento);
          const dataAlvoStr = dataAlvo.toISOString().split('T')[0];

          const { data: primeiraVisita } = await supabase
            .from('agendamentos')
            .select('cliente_id, cliente_nome, cliente_telefone, data')
            .eq('data', dataAlvoStr)
            .eq('status', 'Concluído');

          // Verificar se é realmente a primeira visita
          for (const ag of primeiraVisita || []) {
            const { data: anteriores } = await supabase
              .from('agendamentos')
              .select('id')
              .eq('cliente_id', ag.cliente_id)
              .lt('data', ag.data);

            if (!anteriores || anteriores.length === 0) {
              clientesParaEnviar.push({
                id: ag.cliente_id,
                nome: ag.cliente_nome,
                telefone: ag.cliente_telefone
              });
            }
          }
          console.log(`👋 ${clientesParaEnviar.length} clientes pós primeira visita`);
          break;

        case 'reativacao':
          // Buscar clientes sem agendamento há X dias
          const diasInatividade = fluxo.dias_apos_evento || 30;
          const dataLimite = new Date(hojeBrasil);
          dataLimite.setDate(dataLimite.getDate() - diasInatividade);
          const dataLimiteStr = dataLimite.toISOString().split('T')[0];

          const { data: todosClientes } = await supabase
            .from('clientes')
            .select('*');

          for (const cliente of todosClientes || []) {
            const { data: ultimoAgendamento } = await supabase
              .from('agendamentos')
              .select('data')
              .eq('cliente_id', cliente.id)
              .order('data', { ascending: false })
              .limit(1)
              .single();

            if (ultimoAgendamento && ultimoAgendamento.data <= dataLimiteStr) {
              clientesParaEnviar.push(cliente);
            }
          }
          console.log(`🔄 ${clientesParaEnviar.length} clientes para reativar`);
          break;

        case 'data_especial':
          // Buscar todos os clientes para datas especiais
          const { data: todosClientesEspecial } = await supabase
            .from('clientes')
            .select('*');
          clientesParaEnviar = todosClientesEspecial || [];
          console.log(`🎉 ${clientesParaEnviar.length} clientes para data especial`);
          break;
      }

      // Enviar mensagens para os clientes
      for (const cliente of clientesParaEnviar) {
        try {
          const mensagem = fluxo.mensagem_template.replace(/{nome}/g, cliente.nome);
          
          // Enviar via WhatsApp usando a função whatsapp-send
          const { error: envioError } = await supabase.functions.invoke('whatsapp-send', {
            body: {
              to: cliente.telefone.replace(/\D/g, ''),
              message: mensagem
            }
          });

          if (envioError) {
            console.error(`Erro ao enviar para ${cliente.nome}:`, envioError);
          } else {
            console.log(`✉️ Mensagem enviada para ${cliente.nome}`);
            totalEnviados++;
          }
        } catch (error) {
          console.error(`Erro ao processar cliente ${cliente.nome}:`, error);
        }
      }
    }

    console.log(`✅ Processamento concluído: ${totalEnviados} mensagens enviadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalEnviados,
        data: dataHoje
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

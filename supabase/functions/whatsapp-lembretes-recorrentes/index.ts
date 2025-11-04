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

    console.log('🔄 Verificando lembretes recorrentes...');

    // 1. Verificar se lembretes recorrentes estão ativos
    const { data: configRecorrente } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'lembretes_recorrentes_ativos')
      .maybeSingle();

    const recorrentesAtivos = configRecorrente?.valor?.ativo !== false;
    if (!recorrentesAtivos) {
      console.log('📴 Lembretes recorrentes desativados');
      return new Response(JSON.stringify({ mensagem: 'Lembretes recorrentes desativados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar configuração de intervalo (padrão: 14 dias)
    const { data: configIntervalo } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'lembretes_recorrentes_intervalo')
      .maybeSingle();

    const intervalo = configIntervalo?.valor?.dias || 14;

    // 3. Buscar configuração de serviços (palavras-chave)
    const { data: configServicos } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'lembretes_recorrentes_servicos')
      .maybeSingle();

    const palavrasChave = configServicos?.valor?.palavras || ['cílios', 'cilios', 'extensão', 'fio a fio'];

    // 4. Calcular data alvo (intervalo configurado)
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - (intervalo + 1));
    const dataFim = new Date(hoje);
    dataFim.setDate(hoje.getDate() - (intervalo - 1));

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    console.log(`📅 Buscando agendamentos entre ${dataInicioStr} e ${dataFimStr}`);

    // 5. Buscar agendamentos que atendem aos critérios
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('data', dataInicioStr)
      .lte('data', dataFimStr)
      .in('status', ['Confirmado', 'Finalizado']);

    if (error) throw error;

    console.log(`📋 ${agendamentos?.length || 0} agendamentos encontrados`);

    let enviados = 0;
    let filtrados = 0;

    for (const agendamento of agendamentos || []) {
      // 6. Filtrar por serviço (palavras-chave)
      const servicoMatch = palavrasChave.some((palavra: string) => 
        agendamento.servico_nome?.toLowerCase().includes(palavra.toLowerCase())
      );

      if (!servicoMatch) {
        console.log(`⏭️ Serviço "${agendamento.servico_nome}" não corresponde aos critérios`);
        continue;
      }

      filtrados++;

      // 7. Verificar se já enviou lembrete para este agendamento
      const { data: lembreteExistente } = await supabase
        .from('lembretes_enviados')
        .select('id')
        .eq('agendamento_id', agendamento.id)
        .eq('tipo_lembrete', 'recorrente_14dias')
        .maybeSingle();

      if (lembreteExistente) {
        console.log(`⏭️ Lembrete já enviado para ${agendamento.cliente_nome}`);
        continue;
      }

      // 8. Buscar mensagem personalizada ou usar padrão
      const { data: configMensagem } = await supabase
        .from('bot_config')
        .select('valor')
        .eq('chave', 'lembretes_recorrentes_mensagem')
        .maybeSingle();

      const mensagemTemplate = configMensagem?.valor?.texto || `Oi {nome}! 💜

Tudo bem com você?

Já faz cerca de 2 semanas desde seu último procedimento de {servico}! ✨

Que tal agendar uma manutenção? Seus cílios vão agradecer! 😊

Responda esta mensagem para agendar ou tire suas dúvidas.

Beijos! 💋`;

      const mensagem = mensagemTemplate
        .replace('{nome}', agendamento.cliente_nome)
        .replace('{servico}', agendamento.servico_nome);

      // 9. Enviar via função whatsapp-send
      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          telefone: agendamento.cliente_telefone,
          mensagem,
        },
      });

      if (!sendError) {
        // 10. Registrar lembrete enviado
        await supabase.from('lembretes_enviados').insert({
          agendamento_id: agendamento.id,
          cliente_telefone: agendamento.cliente_telefone,
          cliente_nome: agendamento.cliente_nome,
          tipo_lembrete: 'recorrente_14dias',
          servico_nome: agendamento.servico_nome,
        });

        enviados++;
        console.log(`✅ Lembrete recorrente enviado para ${agendamento.cliente_nome}`);
      } else {
        console.error(`❌ Erro ao enviar para ${agendamento.cliente_nome}:`, sendError);
      }

      // Aguardar 2 segundos entre envios
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return new Response(JSON.stringify({ 
      total: agendamentos?.length || 0,
      filtrados,
      enviados,
      mensagem: `${enviados} lembretes recorrentes enviados com sucesso`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro ao enviar lembretes recorrentes:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

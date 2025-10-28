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

    console.log('🗑️ Limpando dados de teste...');

    // Permitir limpar seletivamente via body
    let payload: any = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }
    const hasBody = payload && Object.keys(payload).length > 0;
    const clearAll = hasBody ? !!payload.all : true; // por padrão (sem body) limpa tudo
    const clearAgendamentos = hasBody ? (!!payload.agendamentos || !!payload.all) : true;
    const clearMensagens = hasBody ? (!!payload.mensagens || !!payload.all) : true;
    const clearConversas = hasBody ? (!!payload.conversas || !!payload.all) : true;

    const result: Record<string, string> = {};

    if (clearAgendamentos || clearAll) {
      const { error: errorAgendamentos } = await supabase
        .from('agendamentos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errorAgendamentos) {
        console.error('Erro ao deletar agendamentos:', errorAgendamentos);
        result.agendamentos = 'erro';
      } else {
        console.log('✅ Agendamentos deletados');
        result.agendamentos = 'ok';
      }
    } else {
      console.log('⏭️ Pulando agendamentos');
      result.agendamentos = 'pulado';
    }

    if (clearMensagens || clearAll) {
      const { error: errorMensagens } = await supabase
        .from('bot_mensagens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errorMensagens) {
        console.error('Erro ao deletar mensagens:', errorMensagens);
        result.mensagens = 'erro';
      } else {
        console.log('✅ Mensagens deletadas');
        result.mensagens = 'ok';
      }
    } else {
      console.log('⏭️ Pulando mensagens');
      result.mensagens = 'pulado';
    }

    if (clearConversas || clearAll) {
      const { error: errorConversas } = await supabase
        .from('bot_conversas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (errorConversas) {
        console.error('Erro ao deletar conversas:', errorConversas);
        result.conversas = 'erro';
      } else {
        console.log('✅ Conversas deletadas');
        result.conversas = 'ok';
      }
    } else {
      console.log('⏭️ Pulando conversas');
      result.conversas = 'pulado';
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Limpeza concluída',
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

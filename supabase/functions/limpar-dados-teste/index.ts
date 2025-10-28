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

    // Deletar agendamentos
    const { error: errorAgendamentos } = await supabase
      .from('agendamentos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (errorAgendamentos) {
      console.error('Erro ao deletar agendamentos:', errorAgendamentos);
    } else {
      console.log('✅ Agendamentos deletados');
    }

    // Deletar mensagens
    const { error: errorMensagens } = await supabase
      .from('bot_mensagens')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (errorMensagens) {
      console.error('Erro ao deletar mensagens:', errorMensagens);
    } else {
      console.log('✅ Mensagens deletadas');
    }

    // Deletar conversas
    const { error: errorConversas } = await supabase
      .from('bot_conversas')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta todos

    if (errorConversas) {
      console.error('Erro ao deletar conversas:', errorConversas);
    } else {
      console.log('✅ Conversas deletadas');
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Dados de teste limpos com sucesso!' 
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

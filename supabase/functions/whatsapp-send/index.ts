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

    const { telefone, mensagem } = await req.json();

    console.log('📤 Enviando mensagem para:', telefone);

    // Buscar conversa
    let { data: conversa } = await supabase
      .from('bot_conversas')
      .select('*')
      .eq('telefone', telefone)
      .single();

    if (!conversa) {
      const { data: novaConversa } = await supabase
        .from('bot_conversas')
        .insert({ telefone, contexto: {} })
        .select()
        .single();
      conversa = novaConversa;
    }

    // Registrar mensagem enviada
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa!.id,
      telefone,
      tipo: 'enviada',
      conteudo: mensagem,
    });

    // Enviar mensagem via Evolution API
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE');

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      console.error('❌ Credenciais da Evolution API não configuradas');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Credenciais da Evolution API não configuradas' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Formatar telefone (remover @s.whatsapp.net se presente e adicionar DDI 55 se necessário)
    let numeroFormatado = telefone.replace('@s.whatsapp.net', '').replace('@lid', '');
    
    // Se o número não começa com 55 (Brasil) e tem apenas 11 dígitos (DDD + número), adiciona o 55
    if (!numeroFormatado.startsWith('55') && numeroFormatado.length === 11) {
      numeroFormatado = '55' + numeroFormatado;
    }
    
    console.log('📤 Enviando via Evolution API:', {
      url: `${evolutionUrl}/message/sendText/${evolutionInstance}`,
      numero: numeroFormatado,
      telefoneOriginal: telefone
    });

    try {
      const evolutionResponse = await fetch(
        `${evolutionUrl}/message/sendText/${evolutionInstance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey
          },
          body: JSON.stringify({
            number: numeroFormatado,
            text: mensagem
          })
        }
      );

      if (!evolutionResponse.ok) {
        const errorText = await evolutionResponse.text();
        console.error('❌ Erro da Evolution API:', evolutionResponse.status, errorText);
        throw new Error(`Evolution API error: ${evolutionResponse.status}`);
      }

      const evolutionData = await evolutionResponse.json();
      console.log('✅ Mensagem enviada via Evolution API:', evolutionData);

      return new Response(JSON.stringify({ 
        success: true,
        mensagem: 'Mensagem enviada com sucesso',
        evolution_response: evolutionData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (evolutionError) {
      console.error('❌ Erro ao enviar via Evolution API:', evolutionError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Erro ao enviar mensagem via Evolution API',
        details: (evolutionError as Error).message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

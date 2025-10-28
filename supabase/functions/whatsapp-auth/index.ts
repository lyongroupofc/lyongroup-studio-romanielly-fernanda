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

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    if (action === 'generate-qr') {
      console.log('🔐 Gerando QR Code...');
      
      // Gerar QR Code simulado (em produção, usar API do WhatsApp Business)
      const qrCode = `whatsapp-qr-${Date.now()}`;
      
      // Salvar sessão
      const { data: sessao, error } = await supabase
        .from('bot_sessao')
        .upsert({
          status: 'desconectado',
          qr_code: qrCode,
          dados_sessao: { generated_at: new Date().toISOString() },
          ultima_atividade: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        qr_code: qrCode,
        sessao 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'status') {
      console.log('📊 Verificando status...');
      
      const { data: sessao } = await supabase
        .from('bot_sessao')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return new Response(JSON.stringify({ 
        status: sessao?.status || 'desconectado',
        sessao 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'connect') {
      console.log('🔗 Conectando...');
      
      const { data: sessao } = await supabase
        .from('bot_sessao')
        .update({ 
          status: 'conectado',
          ultima_atividade: new Date().toISOString()
        })
        .eq('status', 'desconectado')
        .select()
        .single();

      return new Response(JSON.stringify({ 
        success: true,
        sessao 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      console.log('❌ Desconectando...');
      
      const { data: sessao } = await supabase
        .from('bot_sessao')
        .update({ status: 'desconectado' })
        .eq('status', 'conectado')
        .select()
        .single();

      return new Response(JSON.stringify({ 
        success: true,
        sessao 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

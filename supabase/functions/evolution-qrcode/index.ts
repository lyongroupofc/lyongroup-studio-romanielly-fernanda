import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE');

    if (!evolutionUrl || !evolutionApiKey || !evolutionInstance) {
      console.error('❌ Variáveis de ambiente não configuradas');
      return new Response(JSON.stringify({ 
        error: 'Configuração da Evolution API não encontrada',
        details: {
          hasUrl: !!evolutionUrl,
          hasApiKey: !!evolutionApiKey,
          hasInstance: !!evolutionInstance
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    console.log(`📡 Evolution API - Ação: ${action}`);
    console.log(`📡 URL: ${evolutionUrl}`);
    console.log(`📡 Instância: ${evolutionInstance}`);

    // Verificar status da conexão
    if (action === 'status') {
      console.log('🔍 Verificando status da conexão...');
      
      const response = await fetch(`${evolutionUrl}/instance/connectionState/${evolutionInstance}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao verificar status:', errorText);
        return new Response(JSON.stringify({ 
          status: 'desconectado',
          error: `Erro da API: ${response.status}`,
          details: errorText
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('✅ Status recebido:', JSON.stringify(data));

      // A Evolution API retorna { instance: { state: 'open' | 'close' | 'connecting' } }
      const state = data?.instance?.state || data?.state || 'desconectado';
      const isConnected = state === 'open';

      return new Response(JSON.stringify({ 
        status: isConnected ? 'conectado' : 'desconectado',
        state: state,
        instance: evolutionInstance,
        raw: data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar QR Code
    if (action === 'qrcode') {
      console.log('📱 Gerando QR Code...');
      
      // Primeiro verifica se a instância existe, se não, cria
      const checkResponse = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      let instances = [];
      if (checkResponse.ok) {
        instances = await checkResponse.json();
        console.log('📋 Instâncias existentes:', JSON.stringify(instances));
      }

      const instanceExists = instances.some((inst: any) => 
        inst.instance?.instanceName === evolutionInstance || 
        inst.instanceName === evolutionInstance ||
        inst.name === evolutionInstance
      );

      // Se a instância não existe, criar
      if (!instanceExists) {
        console.log('🆕 Criando nova instância...');
        const createResponse = await fetch(`${evolutionUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceName: evolutionInstance,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('✅ Instância criada:', JSON.stringify(createData));
          
          // Retornar o QR code da criação se disponível
          if (createData.qrcode?.base64 || createData.qrcode) {
            return new Response(JSON.stringify({
              success: true,
              qrcode: createData.qrcode?.base64 || createData.qrcode,
              instance: evolutionInstance,
              message: 'Instância criada com sucesso'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      // Buscar QR Code da instância
      const qrResponse = await fetch(`${evolutionUrl}/instance/connect/${evolutionInstance}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error('❌ Erro ao gerar QR Code:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Erro ao gerar QR Code',
          status: qrResponse.status,
          details: errorText
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const qrData = await qrResponse.json();
      console.log('✅ QR Code gerado:', qrData.base64 ? 'Base64 recebido' : JSON.stringify(qrData));

      return new Response(JSON.stringify({
        success: true,
        qrcode: qrData.base64 || qrData.qrcode?.base64 || qrData.code,
        pairingCode: qrData.pairingCode,
        instance: evolutionInstance,
        raw: qrData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Desconectar
    if (action === 'disconnect') {
      console.log('🔌 Desconectando instância...');
      
      const response = await fetch(`${evolutionUrl}/instance/logout/${evolutionInstance}`, {
        method: 'DELETE',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('✅ Desconectado:', JSON.stringify(data));

      return new Response(JSON.stringify({
        success: true,
        message: 'Instância desconectada',
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reiniciar instância
    if (action === 'restart') {
      console.log('🔄 Reiniciando instância...');
      
      const response = await fetch(`${evolutionUrl}/instance/restart/${evolutionInstance}`, {
        method: 'PUT',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('✅ Reiniciado:', JSON.stringify(data));

      return new Response(JSON.stringify({
        success: true,
        message: 'Instância reiniciada',
        data
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
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      stack: (error as Error).stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Contexto {
  etapa?: string;
  servico_id?: string;
  servico_nome?: string;
  data?: string;
  horario?: string;
  cliente_nome?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { telefone, mensagem } = await req.json();

    console.log('📱 Mensagem recebida:', { telefone, mensagem });

    // Verificar se bot está ativo
    const { data: configAtivo } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'ativo')
      .single();

    if (!configAtivo?.valor?.valor) {
      console.log('🤖 Bot está desativado');
      return new Response(JSON.stringify({ resposta: 'Bot desativado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar ou criar conversa
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

    // Registrar mensagem recebida
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa!.id,
      telefone,
      tipo: 'recebida',
      conteudo: mensagem,
    });

    const contexto = conversa!.contexto as Contexto || {};

    // Buscar dados necessários
    const { data: servicos } = await supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    const { data: profissionais } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true);

    // Processar com Lovable AI
    const systemPrompt = `Você é uma assistente virtual de um salão de beleza. Seu objetivo é ajudar clientes a:
1. Agendar serviços
2. Remarcar agendamentos
3. Cancelar agendamentos
4. Consultar informações sobre serviços

Serviços disponíveis:
${servicos?.map(s => `- ${s.nome}: R$ ${s.preco} (${s.duracao} min) - ${s.descricao || ''}`).join('\n')}

Profissionais:
${profissionais?.map(p => `- ${p.nome} (${p.especialidades?.join(', ') || 'Geral'})`).join('\n')}

INSTRUÇÕES IMPORTANTES:
- Seja amigável, educada e profissional
- Se o cliente quer agendar, pergunte qual serviço deseja
- Depois pergunte a data desejada (formato: DD/MM/YYYY)
- Então mostre os horários disponíveis
- Confirme o nome do cliente
- Seja objetiva e clara

Contexto atual da conversa:
${JSON.stringify(contexto, null, 2)}

Responda de forma natural e conversacional.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensagem }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('Erro ao processar com IA');
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.choices[0].message.content;

    // Detectar intenções e atualizar contexto
    const mensagemLower = mensagem.toLowerCase();
    let novoContexto = { ...contexto };

    // Detectar serviço escolhido
    servicos?.forEach(s => {
      if (mensagemLower.includes(s.nome.toLowerCase())) {
        novoContexto.servico_id = s.id;
        novoContexto.servico_nome = s.nome;
        novoContexto.etapa = 'escolher_data';
      }
    });

    // Detectar data (formato DD/MM/YYYY ou DD/MM)
    const dataMatch = mensagem.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
    if (dataMatch && novoContexto.etapa === 'escolher_data') {
      const dia = dataMatch[1].padStart(2, '0');
      const mes = dataMatch[2].padStart(2, '0');
      const ano = dataMatch[4] || new Date().getFullYear().toString();
      novoContexto.data = `${ano}-${mes}-${dia}`;
      novoContexto.etapa = 'escolher_horario';
    }

    // Detectar horário
    const horarioMatch = mensagem.match(/(\d{1,2}):?(\d{2})/);
    if (horarioMatch && novoContexto.etapa === 'escolher_horario') {
      novoContexto.horario = `${horarioMatch[1].padStart(2, '0')}:${horarioMatch[2]}`;
      novoContexto.etapa = 'confirmar_nome';
    }

    // Detectar nome
    if (novoContexto.etapa === 'confirmar_nome' && mensagem.length > 2 && !mensagem.match(/^\d/)) {
      novoContexto.cliente_nome = mensagem.trim();
      novoContexto.etapa = 'criar_agendamento';
    }

    // Criar agendamento se todas as informações estiverem completas
    if (novoContexto.etapa === 'criar_agendamento' && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario && 
        novoContexto.cliente_nome) {
      
      const { error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert({
          cliente_nome: novoContexto.cliente_nome,
          cliente_telefone: telefone,
          servico_id: novoContexto.servico_id,
          servico_nome: novoContexto.servico_nome,
          data: novoContexto.data,
          horario: novoContexto.horario,
          status: 'Confirmado',
          origem: 'whatsapp',
          bot_conversa_id: conversa!.id,
        });

      if (agendamentoError) {
        console.error('Erro ao criar agendamento:', agendamentoError);
      } else {
        console.log('✅ Agendamento criado com sucesso!');
        novoContexto = {}; // Resetar contexto
      }
    }

    // Atualizar contexto da conversa
    await supabase
      .from('bot_conversas')
      .update({ 
        contexto: novoContexto,
        ultimo_contato: new Date().toISOString()
      })
      .eq('id', conversa!.id);

    // Registrar resposta enviada
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa!.id,
      telefone,
      tipo: 'enviada',
      conteudo: resposta,
    });

    console.log('💬 Resposta:', resposta);

    return new Response(JSON.stringify({ resposta }), {
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

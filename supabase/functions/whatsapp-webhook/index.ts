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
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')!;
    
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

    // Buscar histórico de mensagens da conversa
    const { data: historicoMensagens } = await supabase
      .from('bot_mensagens')
      .select('*')
      .eq('conversa_id', conversa!.id)
      .order('timestamp', { ascending: true })
      .limit(20); // Últimas 20 mensagens

    console.log('📜 Histórico de mensagens:', historicoMensagens?.length || 0);

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

    // Processar com Google Gemini mantendo histórico
    const systemPrompt = `Você é Jennifer, atendente do salão de beleza. Atenda no WhatsApp de forma NATURAL e HUMANA.

Serviços disponíveis:
${servicos?.map(s => `- ${s.nome}: R$ ${s.preco} (${s.duracao} min)`).join('\n')}

Profissionais: ${profissionais?.map(p => p.nome).join(', ')}

REGRAS DE OURO (SIGA RIGOROSAMENTE):
1. RESPOSTAS CURTAS: Máximo 2-3 linhas por mensagem
2. UMA PERGUNTA POR VEZ: Nunca pergunte várias coisas de uma vez
3. LINGUAGEM DO WHATSAPP: Informal, natural, como uma pessoa real
4. USE EMOJIS COM MODERAÇÃO: 1-2 por mensagem apenas
5. SEM LISTAS OU BLOCOS: Evite bullets, números, formatações complexas
6. SEJA DIRETA: Vá direto ao ponto sem enrolação

FLUXO DE AGENDAMENTO:
- Primeiro: Qual serviço quer?
- Segundo: Que dia prefere?
- Terceiro: Que horário?
- Quarto: Qual seu nome?
- Confirme e pronto!

Contexto atual: ${JSON.stringify(contexto, null, 2)}

EXEMPLOS DE RESPOSTAS BOAS:
❌ "Olá! Temos os seguintes serviços disponíveis:\n- Corte\n- Manicure\nQual você gostaria?"
✅ "Oi! Quer agendar corte, manicure ou outro serviço? 💇"

❌ "Para agendar preciso saber: 1) serviço 2) data 3) horário"
✅ "Qual serviço você quer agendar?"

Responda como uma atendente real responderia no WhatsApp.`;

    // Construir histórico de conversa para o Gemini
    let conversaCompleta = systemPrompt + "\n\n--- HISTÓRICO DA CONVERSA ---\n";
    
    if (historicoMensagens && historicoMensagens.length > 0) {
      historicoMensagens.forEach(msg => {
        const role = msg.tipo === 'recebida' ? 'Cliente' : 'Jennifer';
        conversaCompleta += `${role}: ${msg.conteudo}\n`;
      });
    }
    
    conversaCompleta += `Cliente: ${mensagem}\nJennifer:`;

    console.log('🤖 Enviando para Gemini com histórico completo');

    // Usar Google Gemini API com histórico completo
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: conversaCompleta
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('Erro ao processar com IA');
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.candidates[0].content.parts[0].text;

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
      
      console.log('💾 Tentando criar agendamento:', {
        cliente_nome: novoContexto.cliente_nome,
        telefone,
        servico_id: novoContexto.servico_id,
        data: novoContexto.data,
        horario: novoContexto.horario
      });

      const { data: agendamentoCriado, error: agendamentoError } = await supabase
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
        })
        .select();

      if (agendamentoError) {
        console.error('❌ Erro ao criar agendamento:', agendamentoError);
      } else {
        console.log('✅ Agendamento criado com sucesso!', agendamentoCriado);
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

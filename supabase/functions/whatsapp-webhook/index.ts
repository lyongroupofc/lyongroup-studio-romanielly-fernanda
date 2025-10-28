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

    // Data atual para contexto
    const hoje = new Date();
    const dataAtualFormatada = hoje.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Processar com Google Gemini mantendo histórico
    const systemPrompt = `Você é Jennifer, atendente do salão de beleza. Atenda no WhatsApp de forma NATURAL e HUMANA.

DATA ATUAL: ${dataAtualFormatada}

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

ENTENDIMENTO DE DATAS:
- "segunda" ou "segunda-feira" = próxima segunda-feira
- "próxima semana" = semana que vem
- "semana que vem" = próxima semana
- "amanhã" = dia seguinte
- "depois de amanhã" = daqui 2 dias
- "sexta" = próxima sexta-feira
SEMPRE confirme a data específica com o cliente (ex: "Certo, então dia 15/01, ok?")

ENTENDIMENTO DE HORÁRIOS:
- "9h", "9:00", "9 horas" = 09:00
- "meio dia" = 12:00
- "1 da tarde" = 13:00
- "2 da tarde" = 14:00
SEMPRE use formato HH:MM (ex: 09:00, 14:30)

FLUXO DE AGENDAMENTO:
- Primeiro: Qual serviço quer?
- Segundo: Que dia prefere? (confirme a data específica)
- Terceiro: Que horário? (confirme o horário no formato HH:MM)
- Quarto: Qual seu nome?
- Confirme TUDO e pronto!

Contexto atual: ${JSON.stringify(contexto, null, 2)}

EXEMPLOS DE RESPOSTAS BOAS:
❌ "Olá! Temos os seguintes serviços disponíveis:\n- Corte\n- Manicure\nQual você gostaria?"
✅ "Oi! Quer agendar corte, manicure ou outro serviço? 💇"

❌ "Para agendar preciso saber: 1) serviço 2) data 3) horário"
✅ "Qual serviço você quer agendar?"

Responda como uma atendente real responderia no WhatsApp.`;

    // Construir histórico formatado para Gemini
    let conversaCompleta = systemPrompt + "\n\n--- HISTÓRICO DA CONVERSA ---\n";
    
    if (historicoMensagens && historicoMensagens.length > 0) {
      historicoMensagens.forEach(msg => {
        const role = msg.tipo === 'recebida' ? 'Cliente' : 'Jennifer';
        conversaCompleta += `${role}: ${msg.conteudo}\n`;
      });
    }
    
    conversaCompleta += `Cliente: ${mensagem}\nJennifer:`;

    console.log('🤖 Enviando para Google Gemini');

    // Usar Google Gemini API (mais barato e com free tier generoso)
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: conversaCompleta }] }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro no Gemini:', aiResponse.status, errorText);
      throw new Error(`Erro ao processar: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, tive um problema. Pode repetir?';


    // Detectar intenções e atualizar contexto
    const mensagemLower = mensagem.toLowerCase();
    let novoContexto = { ...contexto };

    console.log('🔍 Analisando mensagem:', mensagem);
    console.log('📍 Etapa atual:', novoContexto.etapa);

    // Detectar serviço escolhido
    servicos?.forEach(s => {
      if (mensagemLower.includes(s.nome.toLowerCase())) {
        novoContexto.servico_id = s.id;
        novoContexto.servico_nome = s.nome;
        if (!novoContexto.etapa || novoContexto.etapa === 'escolher_servico') {
          novoContexto.etapa = 'escolher_data';
        }
        console.log('✅ Serviço detectado:', s.nome);
      }
    });

    // Se ainda não detectou, procurar no histórico
    if (!novoContexto.servico_id && historicoMensagens) {
      for (const s of servicos || []) {
        const nomeLower = s.nome.toLowerCase();
        if (historicoMensagens.some(m => (m.conteudo || '').toLowerCase().includes(nomeLower))) {
          novoContexto.servico_id = s.id;
          novoContexto.servico_nome = s.nome;
          if (!novoContexto.etapa) novoContexto.etapa = 'escolher_data';
          console.log('✅ Serviço detectado no histórico:', s.nome);
          break;
        }
      }
    }

    // Função auxiliar para calcular datas relativas
    const calcularData = (referencia: string): string | null => {
      const now = new Date();
      const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      
      // Detectar "amanhã"
      if (referencia.includes('amanhã') || referencia.includes('amanha')) {
        const amanha = new Date(now);
        amanha.setDate(amanha.getDate() + 1);
        return amanha.toISOString().split('T')[0];
      }
      
      // Detectar "depois de amanhã"
      if (referencia.includes('depois de amanhã') || referencia.includes('depois de amanha')) {
        const depoisAmanha = new Date(now);
        depoisAmanha.setDate(depoisAmanha.getDate() + 2);
        return depoisAmanha.toISOString().split('T')[0];
      }
      
      // Detectar dias da semana (próxima segunda, sexta, etc)
      for (let i = 0; i < diasSemana.length; i++) {
        if (referencia.includes(diasSemana[i])) {
          const diaAtual = now.getDay();
          let diasParaSomar = i - diaAtual;
          
          // Se for o mesmo dia ou já passou, vai para próxima semana
          if (diasParaSomar <= 0) diasParaSomar += 7;
          
          // Se menciona "próxima semana" ou "semana que vem", adiciona mais 7 dias
          if (referencia.includes('próxima semana') || referencia.includes('proxima semana') || 
              referencia.includes('semana que vem')) {
            diasParaSomar += 7;
          }
          
          const dataCalculada = new Date(now);
          dataCalculada.setDate(dataCalculada.getDate() + diasParaSomar);
          return dataCalculada.toISOString().split('T')[0];
        }
      }
      
      return null;
    };

    // Detectar data (múltiplos formatos)
    if (!novoContexto.data) {
      // Formato DD/MM/YYYY ou DD/MM
      const dataMatch = mensagem.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
      if (dataMatch) {
        const dia = dataMatch[1].padStart(2, '0');
        const mes = dataMatch[2].padStart(2, '0');
        const ano = dataMatch[4] || new Date().getFullYear().toString();
        novoContexto.data = `${ano}-${mes}-${dia}`;
        novoContexto.etapa = 'escolher_horario';
        console.log('📅 Data detectada (formato):', novoContexto.data);
      } else {
        // Tentar detectar referências relativas
        const dataRelativa = calcularData(mensagemLower);
        if (dataRelativa) {
          novoContexto.data = dataRelativa;
          novoContexto.etapa = 'escolher_horario';
          console.log('📅 Data detectada (relativa):', novoContexto.data);
        }
      }

      // Se ainda não detectou, procurar no histórico completo
      if (!novoContexto.data && historicoMensagens) {
        for (const msg of historicoMensagens) {
          const txt = (msg.conteudo || '').toLowerCase();
          const m = txt.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
          if (m) {
            const dia = m[1].padStart(2, '0');
            const mes = m[2].padStart(2, '0');
            const ano = m[4] || new Date().getFullYear().toString();
            novoContexto.data = `${ano}-${mes}-${dia}`;
            novoContexto.etapa = 'escolher_horario';
            console.log('📅 Data detectada no histórico:', novoContexto.data);
            break;
          }
          const relativa = calcularData(txt);
          if (relativa) {
            novoContexto.data = relativa;
            novoContexto.etapa = 'escolher_horario';
            console.log('📅 Data detectada no histórico (relativa):', novoContexto.data);
            break;
          }
        }
      }
    }

    // Detectar horário (múltiplos formatos)
    if (!novoContexto.horario) {
      // Formato HH:MM ou HH
      const horarioMatch = mensagem.match(/(\d{1,2}):?(\d{2})?/);
      if (horarioMatch) {
        const hora = horarioMatch[1].padStart(2, '0');
        const minuto = horarioMatch[2] ? horarioMatch[2] : '00';
        novoContexto.horario = `${hora}:${minuto}`;
        if (novoContexto.data && novoContexto.servico_id) {
          novoContexto.etapa = 'confirmar_nome';
        }
        console.log('⏰ Horário detectado:', novoContexto.horario);
      } else if (mensagemLower.includes('meio dia') || mensagemLower.includes('meio-dia')) {
        novoContexto.horario = '12:00';
        if (novoContexto.data && novoContexto.servico_id) {
          novoContexto.etapa = 'confirmar_nome';
        }
        console.log('⏰ Horário detectado (meio dia):', novoContexto.horario);
      }

      // Se ainda não detectou, procurar no histórico
      if (!novoContexto.horario && historicoMensagens) {
        for (const m of historicoMensagens) {
          const match = (m.conteudo || '').match(/(\d{1,2}):?(\d{2})?/);
          if (match) {
            const hora = match[1].padStart(2, '0');
            const minuto = match[2] ? match[2] : '00';
            novoContexto.horario = `${hora}:${minuto}`;
            if (novoContexto.data && novoContexto.servico_id) {
              novoContexto.etapa = 'confirmar_nome';
            }
            console.log('⏰ Horário detectado no histórico:', novoContexto.horario);
            break;
          }
          const txt = (m.conteudo || '').toLowerCase();
          if (txt.includes('meio dia') || txt.includes('meio-dia')) {
            novoContexto.horario = '12:00';
            if (novoContexto.data && novoContexto.servico_id) {
              novoContexto.etapa = 'confirmar_nome';
            }
            console.log('⏰ Horário detectado no histórico (meio dia):', novoContexto.horario);
            break;
          }
        }
      }
    }

    // Detectar nome - só detecta se todas as outras info já estão preenchidas
    if (!novoContexto.cliente_nome && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario &&
        mensagem.length > 2 && 
        !mensagem.match(/^\d/) &&
        !mensagemLower.includes('sim') &&
        !mensagemLower.includes('confirma')) {
      novoContexto.cliente_nome = mensagem.trim();
      novoContexto.etapa = 'criar_agendamento';
      console.log('👤 Nome detectado:', novoContexto.cliente_nome);
    }

    // Fallback: se já tem serviço, data e horário mas ainda sem nome, usa número como nome
    if (!novoContexto.cliente_nome && novoContexto.servico_id && novoContexto.data && novoContexto.horario) {
      const telefoneLimpo = telefone.replace('@s.whatsapp.net', '');
      novoContexto.cliente_nome = `Cliente ${telefoneLimpo}`;
      novoContexto.etapa = 'criar_agendamento';
      console.log('👤 Nome não informado. Usando fallback:', novoContexto.cliente_nome);
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

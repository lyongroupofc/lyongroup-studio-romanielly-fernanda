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
  acao?: 'agendar' | 'cancelar' | 'reagendar';
  agendamento_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { telefone, mensagem } = await req.json();

    console.log('📱 Mensagem recebida:', { telefone, mensagem });

    // Verificar se bot está ativo globalmente
    const { data: configAtivo } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'ativo')
      .single();

    if (!configAtivo?.valor?.valor) {
      console.log('🤖 Bot está desativado globalmente');
      return new Response(JSON.stringify({ resposta: 'Bot desativado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o número está bloqueado
    const { data: numeroBloqueado } = await supabase
      .from('bot_numeros_bloqueados')
      .select('id')
      .eq('numero', telefone)
      .maybeSingle();

    if (numeroBloqueado) {
      console.log('🚫 Número bloqueado:', telefone);
      return new Response(JSON.stringify({ resposta: 'Número bloqueado' }), {
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
        .insert({ telefone, contexto: {}, bot_ativo: true })
        .select()
        .single();
      conversa = novaConversa;
    }

    // Verificar se o bot está ativo para essa conversa específica
    if (!conversa?.bot_ativo) {
      console.log('🔇 Bot desativado para esta conversa:', telefone);
      // Retornar 204 sem body = não envia nada ao cliente
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Registrar mensagem recebida
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa!.id,
      telefone,
      tipo: 'recebida',
      conteudo: mensagem,
    });

    let contexto = conversa!.contexto as Contexto || {};

    // Detectar agradecimento/despedida PRIMEIRO (antes de qualquer coisa)
    const mensagemLower = mensagem.toLowerCase();
    const isAgradecimento = /(obrigado|obrigada|valeu|show|perfeito|beleza|agradeço|agradeco)\b/i.test(mensagemLower);
    
    if (isAgradecimento && (contexto.etapa || contexto.servico_id)) {
      console.log('👋 Agradecimento detectado, limpando contexto');
      await supabase
        .from('bot_conversas')
        .update({ contexto: {}, ultimo_contato: new Date().toISOString() })
        .eq('id', conversa!.id);
      
      await supabase.from('bot_mensagens').insert({
        conversa_id: conversa!.id,
        telefone,
        tipo: 'enviada',
        conteudo: 'Imagina! Precisando, é só chamar 💜',
      });

      return new Response(JSON.stringify({ resposta: 'Imagina! Precisando, é só chamar 💜' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar agendamentos futuros do cliente
    const hoje = new Date().toISOString().split('T')[0];
    const { data: agendamentosFuturos } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('cliente_telefone', telefone)
      .gte('data', hoje)
      .order('data', { ascending: true });

    // Verificar se já existe um agendamento confirmado (evitar duplicatas/re-processamento)
    const temAgendamentoRecente = agendamentosFuturos?.some(ag => {
      const diff = Date.now() - new Date(ag.created_at).getTime();
      return diff < 30000;
    });

    if (temAgendamentoRecente && contexto.etapa === 'criar_agendamento') {
      console.log('✅ Agendamento recente detectado, resetando contexto');
      contexto = {};
      await supabase
        .from('bot_conversas')
        .update({ contexto: {}, ultimo_contato: new Date().toISOString() })
        .eq('id', conversa!.id);
    }

    // Buscar histórico de mensagens da conversa
    const { data: historicoMensagens } = await supabase
      .from('bot_mensagens')
      .select('*')
      .eq('conversa_id', conversa!.id)
      .order('timestamp', { ascending: true })
      .limit(20);

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

    // Construir lista de serviços com preços e durações
    const servicosFormatados = (servicos || []).map(s => {
      const duracaoTexto = s.duracao >= 60 
        ? `${Math.floor(s.duracao / 60)}h${s.duracao % 60 > 0 ? ` ${s.duracao % 60}min` : ''}`
        : `${s.duracao} min`;
      return `• ${s.nome} - R$ ${Number(s.preco).toFixed(2).replace('.', ',')} (${duracaoTexto})`;
    }).join('\n');

    // Construir histórico de mensagens para o Lovable AI
    const mensagensFormatadas = [];
    
    if (historicoMensagens && historicoMensagens.length > 0) {
      historicoMensagens.forEach(msg => {
        mensagensFormatadas.push({
          role: msg.tipo === 'recebida' ? 'user' : 'assistant',
          content: msg.conteudo
        });
      });
    }
    
    mensagensFormatadas.push({
      role: 'user',
      content: mensagem
    });

    // Helpers para interpretação de serviço
    const normalizarTexto = (texto: string): string => {
      return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^\w\s]/g, ' ') // remove pontuação
        .replace(/\s+/g, ' ')
        .trim();
    };

    const sinonimosServicos: Record<string, string[]> = {
      'manicure': ['unha', 'unhas', 'manicure'],
      'pedicure': ['pe', 'pes', 'pedicure'],
      'depilacao': ['cera', 'depilacao', 'depilar'],
      'maquiagem': ['make', 'maquiagem', 'maquiar'],
      'sobrancelha': ['sobrancelha', 'design de sobrancelha'],
      'massagem': ['massagem', 'massoterapia']
    };

    const detectarServico = (texto: string): { servico: any; confianca: number } | null => {
      const textoNorm = normalizarTexto(texto);
      const palavras = new Set(textoNorm.split(' '));
      
      const scores = (servicos || []).map(s => {
        const nomeNorm = normalizarTexto(s.nome);
        const palavrasServico = nomeNorm.split(' ');
        let score = 0;

        // Match de nome completo
        if (textoNorm.includes(nomeNorm)) {
          score += 3;
        }

        // Match por palavra
        palavrasServico.forEach(palavra => {
          if (palavras.has(palavra) && palavra.length > 2) {
            score += 2;
          }
        });

        // Match por sinônimos
        const chaveSinonimo = Object.keys(sinonimosServicos).find(k => 
          normalizarTexto(s.nome).includes(k)
        );
        if (chaveSinonimo) {
          sinonimosServicos[chaveSinonimo].forEach(sin => {
            if (palavras.has(sin)) {
              score += 1;
            }
          });
        }

        return { servico: s, score };
      });

      // Ordenar por score
      scores.sort((a, b) => b.score - a.score);
      
      // Se não há confiança mínima, retornar null
      if (scores[0].score < 2) return null;
      
      // Se há empate, retornar null (ambíguo)
      if (scores.length > 1 && scores[0].score === scores[1].score) return null;
      
      return { servico: scores[0].servico, confianca: scores[0].score };
    };

    // Resposta determinística para perguntas sobre serviços/valores
    let resposta: string | null = null;
    const ml = (mensagem || '').toLowerCase();
    const pedeLista = /(lista de serviços|lista de servicos|quais.*serviç|quais.*servic|tem.*serviç|tem.*servic|que serviço|que servico)/i.test(ml);
    
    // Detectar serviço com novo método
    const servicoDetectadoObj = detectarServico(mensagem);
    const perguntaPreco = /(quanto custa|preço|preco|valor)/i.test(ml);

    if (pedeLista && (servicos || []).length > 0) {
      resposta = `Tenho sim, amor! 💜\n\n${servicosFormatados}`;
    } else if (perguntaPreco && servicoDetectadoObj) {
      const s = servicoDetectadoObj.servico;
      const duracaoTexto = s.duracao >= 60 
        ? `${Math.floor(s.duracao / 60)}h${s.duracao % 60 > 0 ? ` ${s.duracao % 60}min` : ''}`
        : `${s.duracao} min`;
      resposta = `${s.nome} custa R$ ${Number(s.preco).toFixed(2).replace('.', ',')} e dura ${duracaoTexto}.`;
    }

    // Só chama IA se ainda não geramos resposta específica
    if (!resposta) {
      console.log('🤖 Enviando para Lovable AI');
      try {
        const { data: chatData, error: chatError } = await supabase.functions.invoke('chat-assistente', {
          body: { 
            messages: mensagensFormatadas,
            servicos: servicosFormatados
          }
        });

        if (chatError) {
          console.error('❌ Erro no Lovable AI:', chatError);
          throw chatError;
        }

        resposta = chatData?.generatedText || null;
      } catch (e) {
        console.error('⚠️ Lovable AI indisponível. Ativando fallback...', e);
        const nomesServicos = (servicos || []).map(s => s.nome);
        const sugestaoServicos = nomesServicos.slice(0, 3).join(', ');

        if (!contexto?.servico_id) {
          resposta = `Olá! 💜 Qual serviço você quer agendar? Ex: ${sugestaoServicos} 🫶🏾`;
        } else if (!contexto?.data) {
          resposta = 'Perfeito! Para qual dia você prefere? ✨';
        } else if (!contexto?.horario) {
          resposta = 'E qual horário? 💆🏽‍♀️';
        } else if (!contexto?.cliente_nome) {
          resposta = 'Qual seu nome para confirmar o agendamento? 🫶🏾';
        } else {
          resposta = 'Tudo certo! Posso confirmar seu agendamento? ✨';
        }
      }
    }

    if (!resposta) {
      resposta = 'Tive um pico de uso agora, mas já estou aqui! Pode repetir por favor?';
    }

    // Detectar intenções e atualizar contexto
    let novoContexto = { ...contexto };

    // Detectar intenção usando IA (mais inteligente que palavras-chave)
    console.log('🔍 Analisando mensagem:', mensagem);
    console.log('📍 Etapa atual:', novoContexto.etapa);
    
    let intencao: 'agendar' | 'cancelar' | 'reagendar' | 'conversa' = 'conversa';
    
    // Usar IA para detectar intenção se houver agendamentos futuros
    if (agendamentosFuturos && agendamentosFuturos.length > 0) {
      try {
        const promptIntencao = `Analise a seguinte mensagem do cliente e identifique a intenção:
"${mensagem}"

Contexto: O cliente já tem um agendamento marcado.

Responda APENAS com uma dessas palavras:
- "cancelar" se o cliente quer cancelar/desmarcar o agendamento
- "reagendar" se o cliente quer remarcar/mudar horário/data
- "agendar" se o cliente quer fazer um novo agendamento
- "conversa" se é apenas uma conversa normal (agradecimento, confirmação, etc)`;

        const { data: intencaoData } = await supabase.functions.invoke('chat-assistente', {
          body: { 
            messages: [{ role: 'user', content: promptIntencao }]
          }
        });

        const detectedIntencao = (intencaoData?.generatedText || 'conversa').toLowerCase().trim();
        if (['cancelar', 'reagendar', 'agendar', 'conversa'].includes(detectedIntencao)) {
          intencao = detectedIntencao as typeof intencao;
          console.log('🎯 Intenção detectada pela IA:', intencao);
        }
      } catch (e) {
        console.error('⚠️ Erro ao detectar intenção, usando fallback');
        if (/\b(cancelar|desmarcar|não quero mais|não vou conseguir)\b/i.test(mensagemLower)) {
          intencao = 'cancelar';
        } else if (/\b(reagendar|remarcar|mudar|trocar|preciso mudar|quero mudar|tenho que mudar)\b/i.test(mensagemLower)) {
          intencao = 'reagendar';
        }
      }
    }

    // Verificar políticas de cancelamento/reagendamento
    const calcularDiasAteAgendamento = (dataAgendamento: string): number => {
      const dataHoje = new Date();
      dataHoje.setHours(0, 0, 0, 0);
      const dataAg = new Date(dataAgendamento + 'T00:00:00');
      const diffMs = dataAg.getTime() - dataHoje.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    // Processar cancelamento
    if (intencao === 'cancelar' && agendamentosFuturos && agendamentosFuturos.length > 0) {
      const agendamento = agendamentosFuturos[0];
      const diasAte = calcularDiasAteAgendamento(agendamento.data);
      
      if (diasAte < 5) {
        resposta = `Querida, nossa política de cancelamento permite até 5 dias antes do horário. Seu agendamento é em ${diasAte} dia(s). Precisa muito cancelar? 😔`;
      } else {
        const { error } = await supabase
          .from('agendamentos')
          .update({ status: 'Cancelado' })
          .eq('id', agendamento.id);
        
        if (!error) {
          const [yyyy, mm, dd] = agendamento.data.split('-');
          const horarioFormatado = agendamento.horario.slice(0, 5);
          resposta = `Tudo bem, amor! Seu agendamento de ${agendamento.servico_nome} do dia ${dd}/${mm} às ${horarioFormatado} foi cancelado. 💜 Se precisar agendar de novo, é só chamar!`;
          novoContexto = {};
          console.log('✅ Cancelamento realizado');
        } else {
          console.error('❌ Erro ao cancelar:', error);
          resposta = 'Ops, tive um problema ao cancelar. Pode tentar novamente? 😊';
        }
      }
    }
    // Processar reagendamento
    else if (intencao === 'reagendar' && agendamentosFuturos && agendamentosFuturos.length > 0) {
      const agendamento = agendamentosFuturos[0];
      const diasAte = calcularDiasAteAgendamento(agendamento.data);
      
      if (diasAte < 2) {
        resposta = `Querida, nossa política de reagendamento permite até 2 dias antes do horário. Seu agendamento é em ${diasAte} dia(s). Não consigo remarcar tão perto. 😔`;
      } else {
        novoContexto.acao = 'reagendar';
        novoContexto.agendamento_id = agendamento.id;
        novoContexto.servico_id = agendamento.servico_id;
        novoContexto.servico_nome = agendamento.servico_nome;
        novoContexto.cliente_nome = agendamento.cliente_nome;
        novoContexto.etapa = 'escolher_data';
        const [yyyy, mm, dd] = agendamento.data.split('-');
        const horarioFormatado = agendamento.horario.slice(0, 5);
        resposta = `Claro, amor! Vou remarcar seu ${agendamento.servico_nome} que estava agendado para ${dd}/${mm} às ${horarioFormatado}. Qual nova data você prefere? 💜`;
        console.log('🔄 Iniciando reagendamento');
      }
    }
    // Detectar serviço escolhido (novo agendamento)
    else {
      if (servicoDetectadoObj && servicoDetectadoObj.confianca >= 2) {
        novoContexto.servico_id = servicoDetectadoObj.servico.id;
        novoContexto.servico_nome = servicoDetectadoObj.servico.nome;
        novoContexto.acao = 'agendar';
        if (!novoContexto.etapa || novoContexto.etapa === 'escolher_servico') {
          novoContexto.etapa = 'escolher_data';
        }
        console.log('✅ Serviço detectado:', servicoDetectadoObj.servico.nome);
      } else if (!novoContexto.servico_id) {
        // Se não detectou com confiança, procurar no histórico
        if (historicoMensagens) {
          const recentesCliente = (historicoMensagens as any[])
            .filter((m) => m.tipo === 'recebida')
            .slice(-6);
          for (const msg of recentesCliente) {
            const deteccao = detectarServico(msg.conteudo || '');
            if (deteccao && deteccao.confianca >= 2) {
              novoContexto.servico_id = deteccao.servico.id;
              novoContexto.servico_nome = deteccao.servico.nome;
              if (!novoContexto.etapa) novoContexto.etapa = 'escolher_data';
              console.log('✅ Serviço detectado no histórico:', deteccao.servico.nome);
              break;
            }
          }
        }
      }
    }

    // Canonicaliza resposta quando apenas o serviço foi definido
    if (novoContexto.servico_id && !novoContexto.data) {
      const nomeServ = novoContexto.servico_nome || 'serviço';
      resposta = `Perfeito! ${nomeServ} anotado. Para qual dia você prefere? ✨`;
    }

    // Função auxiliar para calcular datas relativas
    const calcularData = (referencia: string): string | null => {
      const now = new Date();
      const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      
      if (referencia.includes('amanhã') || referencia.includes('amanha')) {
        const amanha = new Date(now);
        amanha.setDate(amanha.getDate() + 1);
        return amanha.toISOString().split('T')[0];
      }
      
      if (referencia.includes('depois de amanhã') || referencia.includes('depois de amanha')) {
        const depoisAmanha = new Date(now);
        depoisAmanha.setDate(depoisAmanha.getDate() + 2);
        return depoisAmanha.toISOString().split('T')[0];
      }
      
      for (let i = 0; i < diasSemana.length; i++) {
        if (referencia.includes(diasSemana[i])) {
          const diaAtual = now.getDay();
          let diasParaSomar = i - diaAtual;
          
          if (diasParaSomar <= 0) diasParaSomar += 7;
          
          const dataCalculada = new Date(now);
          dataCalculada.setDate(dataCalculada.getDate() + diasParaSomar);
          return dataCalculada.toISOString().split('T')[0];
        }
      }
      
      return null;
    };

    // Helpers de horário e disponibilidade
    const parseHorario = (text: string): string | null => {
      const t = (text || '').toLowerCase();

      const patterns = [
        /\b(?:às|as|a partir das|depois das|por volta das)\s*(\d{1,2})(?:[:h](\d{2}))?\b/i,
        /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
        /\b(\d{1,2})\s*h(?:oras?)?\b/,
      ];

      for (const p of patterns) {
        const m = t.match(p);
        if (m) {
          let hh = m[1];
          let mm = (m[2] ?? '00');
          hh = hh.padStart(2, '0');
          mm = mm.padStart(2, '0');

          const idx = t.indexOf(m[0]);
          if (idx > 0 && (t[idx - 1] === '/' || t[idx] === '/')) continue;

          return `${hh}:${mm}`;
        }
      }
      return null;
    };

    const isValidHorario = (hhmm: string): boolean => {
      const [hh, mm] = hhmm.split(':').map(Number);
      if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
      if (hh < 8 || hh > 21) return false;
      if (![0, 30].includes(mm)) return false;
      return true;
    };

    const gerarSlotsBloqueados = (inicio: string, duracaoMin: number): string[] => {
      const [h, m] = inicio.split(':').map(Number);
      const start = h * 60 + m;
      // Adicionar buffer de 60 min
      const end = start + duracaoMin + 60;
      const slots: string[] = [];
      for (let t = start; t < end; t += 30) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
      return slots;
    };

    // Detectar data (múltiplos formatos)
    const dataMatch = mensagem.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
    if (dataMatch) {
      const dia = dataMatch[1].padStart(2, '0');
      const mes = dataMatch[2].padStart(2, '0');
      const ano = dataMatch[4] || new Date().getFullYear().toString();
      const dataProvisoria = `${ano}-${mes}-${dia}`;
      
      // Validar se é domingo
      const dataTeste = new Date(dataProvisoria + 'T12:00:00');
      if (dataTeste.getDay() === 0) {
        resposta = 'Desculpa amor, não funcionamos aos domingos. Pode escolher outra data? 💜';
      } else {
        novoContexto.data = dataProvisoria;
        novoContexto.etapa = 'escolher_horario';
        console.log('📅 Data detectada:', novoContexto.data);
      }
    } else if (!novoContexto.data) {
      const dataRelativa = calcularData(mensagemLower);
      if (dataRelativa) {
        const dataTeste = new Date(dataRelativa + 'T12:00:00');
        if (dataTeste.getDay() === 0) {
          resposta = 'Desculpa amor, não funcionamos aos domingos. Pode escolher outra data? 💜';
        } else {
          novoContexto.data = dataRelativa;
          novoContexto.etapa = 'escolher_horario';
          console.log('📅 Data detectada (relativa):', novoContexto.data);
        }
      }

      if (!novoContexto.data && historicoMensagens) {
        const recentes = (historicoMensagens as any[])
          .filter((m) => m.tipo === 'recebida')
          .slice(-6);
        for (const msg of recentes) {
          const txt = (msg.conteudo || '').toLowerCase();
          const m = txt.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
          if (m) {
            const dia = m[1].padStart(2, '0');
            const mes = m[2].padStart(2, '0');
            const ano = m[4] || new Date().getFullYear().toString();
            const dataProvisoria = `${ano}-${mes}-${dia}`;
            const dataTeste = new Date(dataProvisoria + 'T12:00:00');
            if (dataTeste.getDay() !== 0) {
              novoContexto.data = dataProvisoria;
              novoContexto.etapa = 'escolher_horario';
              console.log('📅 Data detectada no histórico:', novoContexto.data);
              break;
            }
          }
          const relativa = calcularData(txt);
          if (relativa) {
            const dataTeste = new Date(relativa + 'T12:00:00');
            if (dataTeste.getDay() !== 0) {
              novoContexto.data = relativa;
              novoContexto.etapa = 'escolher_horario';
              console.log('📅 Data detectada no histórico (relativa):', novoContexto.data);
              break;
            }
          }
        }
      }
    }

    // Se já temos data e serviço mas falta horário, gerar sugestões de horários disponíveis
    if (novoContexto.data && novoContexto.servico_id && !novoContexto.horario) {
      try {
        // Buscar config do dia
        const { data: cfg } = await supabase
          .from('agenda_config')
          .select('*')
          .eq('data', novoContexto.data)
          .maybeSingle();

        if (cfg?.fechado) {
          resposta = 'Esse dia está fechado. Quer tentar outra data, querida? 💜';
          novoContexto.etapa = 'escolher_data';
        } else {
          // Gerar horários base (08:00 - 21:00, intervalos de 30min)
          const horariosBase: string[] = [];
          for (let h = 8; h <= 20; h++) {
            horariosBase.push(`${String(h).padStart(2, '0')}:00`);
            if (h < 20) horariosBase.push(`${String(h).padStart(2, '0')}:30`);
          }

          // Buscar agendamentos do dia
          const { data: ags } = await supabase
            .from('agendamentos')
            .select('horario, servico_id')
            .eq('data', novoContexto.data)
            .neq('status', 'Cancelado');

          const bloqueados = new Set<string>();
          (ags || []).forEach((a: any) => {
            const serv = (servicos || []).find(s => s.id === a.servico_id);
            if (serv?.duracao) {
              gerarSlotsBloqueados(a.horario as string, serv.duracao).forEach((x) => bloqueados.add(x));
            } else {
              bloqueados.add(a.horario as string);
            }
          });
          (cfg?.horarios_bloqueados || []).forEach((h: string) => bloqueados.add(h));

          // Filtrar disponíveis
          const disponiveisFiltrados = horariosBase.filter(h => !bloqueados.has(h));

          // Validar que o serviço cabe antes de 21:00
          const servicoAtual = servicos?.find(s => s.id === novoContexto.servico_id);
          const horariosValidos: string[] = [];
          if (servicoAtual?.duracao) {
            for (const h of disponiveisFiltrados) {
              const [hh, mm] = h.split(':').map(Number);
              const inicioMin = hh * 60 + mm;
              const fimMin = inicioMin + servicoAtual.duracao + 60; // com buffer
              if (fimMin <= 21 * 60) {
                horariosValidos.push(h);
              }
            }
          } else {
            horariosValidos.push(...disponiveisFiltrados);
          }

          if (horariosValidos.length > 0) {
            const primeiros = horariosValidos.slice(0, 8).join(', ');
            const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
            const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
            const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
            const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
            resposta = `Perfeito! Em ${ddmm} (${wd}). Horários disponíveis: ${primeiros}... 💜`;
          } else {
            resposta = 'Esse dia não tem horários disponíveis. Pode escolher outro dia? 💜';
            novoContexto.etapa = 'escolher_data';
          }
        }
      } catch (err) {
        console.error('Erro ao gerar horários:', err);
      }
    }

    // Detectar horário
    if (!novoContexto.horario) {
      const hor = parseHorario(mensagem);
      if (hor && isValidHorario(hor)) {
        novoContexto.horario = hor;
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

      if (!novoContexto.horario && historicoMensagens) {
        const recentes = (historicoMensagens as any[])
          .filter((m) => m.tipo === 'recebida')
          .slice(-6);
        for (const m of recentes) {
          const h2 = parseHorario(m.conteudo || '');
          if (h2 && isValidHorario(h2)) {
            novoContexto.horario = h2;
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

    // Detectar nome
    if (!novoContexto.cliente_nome && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario) {
      const candidato = mensagem.trim();
      const lower = candidato.toLowerCase();
      const stop = [
        'ok','obrigado','obrigada','valeu','isso','sim','nao','não','ta','tá','tudo bem','perfeito','certo','confirmo','claro','por favor','bom dia','boa tarde','boa noite','ate','até','agradeco','agradeço','beleza'
      ];
      const contemTermosNaoNome = /[0-9\/?.,!]/.test(candidato) || stop.some(w => lower.startsWith(w) || lower === w || lower.includes(` ${w} `));
      const palavras = candidato.split(/\s+/).filter(Boolean);
      const duasPalavrasMin = palavras.length >= 2 && palavras.every((p: string) => p.length >= 2 && !stop.includes(p.toLowerCase()));
      const somenteLetras = /^[A-Za-zÀ-ÿ' ]{2,60}$/.test(candidato);
      const ehNomeProvavel = somenteLetras && duasPalavrasMin && !contemTermosNaoNome;
      if (ehNomeProvavel) {
        novoContexto.cliente_nome = candidato;
        novoContexto.etapa = 'criar_agendamento';
        console.log('👤 Nome detectado:', novoContexto.cliente_nome);
      }
    }

    // Não agendar sem nome válido
    if (!novoContexto.cliente_nome && novoContexto.servico_id && novoContexto.data && novoContexto.horario) {
      novoContexto.etapa = 'confirmar_nome';
      try {
        const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
        const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
        const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
        const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
        const nomeServ = novoContexto.servico_nome || 'serviço';
        resposta = `Perfeito! ${nomeServ} em ${ddmm} (${wd}) às ${novoContexto.horario}. Qual seu nome completo para confirmar? 💜`;
      } catch {}
      console.log('👤 Aguardando nome válido.');
    }

    // Criar agendamento se todas as informações estiverem completas
    if (novoContexto.etapa === 'criar_agendamento' && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario && 
        novoContexto.cliente_nome) {
      
      if (!isValidHorario(novoContexto.horario)) {
        resposta = 'Esse horário não é válido (funcionamos de 08:00 às 21:00, a cada 30 min). Me diga outro, amor 💜';
        novoContexto.etapa = 'escolher_horario';
      } else {
        const { data: cfg } = await supabase
          .from('agenda_config')
          .select('*')
          .eq('data', novoContexto.data)
          .maybeSingle();

        if (cfg?.fechado) {
          resposta = 'Esse dia está fechado. Quer tentar outra data, querida? 💜';
          novoContexto.etapa = 'escolher_data';
        } else {
          const { data: ags } = await supabase
            .from('agendamentos')
            .select('horario, servico_id')
            .eq('data', novoContexto.data)
            .neq('status', 'Cancelado');

          const bloqueados = new Set<string>();
          (ags || []).forEach((a: any) => {
            const serv = (servicos || []).find(s => s.id === a.servico_id);
            if (serv?.duracao) {
              gerarSlotsBloqueados(a.horario as string, serv.duracao).forEach((x) => bloqueados.add(x));
            } else {
              bloqueados.add(a.horario as string);
            }
          });
          (cfg?.horarios_bloqueados || []).forEach((h: string) => bloqueados.add(h));

          if (bloqueados.has(novoContexto.horario)) {
            resposta = 'Esse horário já está ocupado. Pode escolher outro pra mim? 💜';
            novoContexto.etapa = 'escolher_horario';
          } else {
            const servEsc = (servicos || []).find(s => s.id === novoContexto.servico_id);
            if (servEsc?.duracao) {
              const bloqueiosNecessarios = gerarSlotsBloqueados(novoContexto.horario, servEsc.duracao);
              const slotsIndisponiveis = bloqueiosNecessarios.filter((x) => bloqueados.has(x));
              const horFimMin = parseInt(novoContexto.horario.split(':')[0]) * 60 + parseInt(novoContexto.horario.split(':')[1]) + servEsc.duracao + 60;
              const ultrapassaHorario = (horFimMin > 21 * 60);

              if (slotsIndisponiveis.length > 0) {
                resposta = `Esse horário não dá, amor. O ${servEsc.nome} precisa de ${servEsc.duracao} min e alguns horários já estão ocupados. Pode escolher outro? 💜`;
                novoContexto.etapa = 'escolher_horario';
              } else if (ultrapassaHorario) {
                resposta = `Esse horário não funciona, querida. O ${servEsc.nome} leva ${servEsc.duracao} min e terminaria após 21h. Pode escolher um horário antes? 💜`;
                novoContexto.etapa = 'escolher_horario';
              } else {
                // Se for reagendamento, ATUALIZAR
                if (novoContexto.acao === 'reagendar' && novoContexto.agendamento_id) {
                  console.log('💾 Atualizando agendamento:', novoContexto.agendamento_id);

                  const { data: agendamentoAtualizado, error: agendamentoError } = await supabase
                    .from('agendamentos')
                    .update({
                      data: novoContexto.data,
                      horario: novoContexto.horario,
                      status: 'Confirmado'
                    })
                    .eq('id', novoContexto.agendamento_id)
                    .select();

                  if (agendamentoError) {
                    console.error('❌ Erro ao atualizar:', agendamentoError);
                  } else {
                    console.log('✅ Agendamento atualizado!', agendamentoAtualizado);
                    
                    try {
                      const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
                      const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
                      const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
                      const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
                      const nomeServ = novoContexto.servico_nome || 'serviço';
                      const nomeCliente = novoContexto.cliente_nome!;
                      resposta = `Prontinho, ${nomeCliente}! Seu ${nomeServ} foi reagendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                    } catch {}
                    novoContexto = {};
                  }
                } else {
                  // Criar novo
                  console.log('💾 Criando novo agendamento');

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
                    console.error('❌ Erro ao criar:', agendamentoError);
                  } else {
                    console.log('✅ Agendamento criado!', agendamentoCriado);
                    
                    try {
                      const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
                      const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
                      const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
                      const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
                      const nomeServ = novoContexto.servico_nome || 'serviço';
                      const nomeCliente = novoContexto.cliente_nome!;
                      resposta = `Prontinho, ${nomeCliente}! ${nomeServ} agendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                    } catch {}
                    novoContexto = {};
                  }
                }
              }
            } else {
              // Fallback sem duração
              console.log('💾 Criando sem validação de duração');

              if (novoContexto.acao === 'reagendar' && novoContexto.agendamento_id) {
                const { error: agendamentoError } = await supabase
                  .from('agendamentos')
                  .update({
                    data: novoContexto.data,
                    horario: novoContexto.horario,
                    status: 'Confirmado'
                  })
                  .eq('id', novoContexto.agendamento_id);

                if (!agendamentoError) {
                  try {
                    const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
                    const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
                    const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
                    const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
                    resposta = `Prontinho! Reagendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                  } catch {}
                  novoContexto = {};
                }
              } else {
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

                if (!agendamentoError) {
                  try {
                    const [yyyy, mm, dd] = (novoContexto.data as string).split('-').map(Number);
                    const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
                    const wd = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
                    const ddmm = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
                    resposta = `Prontinho! Agendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                  } catch {}
                  novoContexto = {};
                }
              }
            }
          }
        }
      }
    }

    // Atualizar contexto e último contato
    await supabase
      .from('bot_conversas')
      .update({
        contexto: novoContexto,
        ultimo_contato: new Date().toISOString(),
      })
      .eq('id', conversa!.id);

    // Registrar mensagem enviada
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
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

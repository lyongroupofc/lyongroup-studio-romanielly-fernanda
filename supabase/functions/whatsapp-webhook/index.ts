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
  agendamento_id?: string; // Para cancelamento/reagendamento
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
      return new Response(JSON.stringify({ resposta: 'Bot desativado para esta conversa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar mensagem recebida
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa!.id,
      telefone,
      tipo: 'recebida',
      conteudo: mensagem,
    });

    let contexto = conversa!.contexto as Contexto || {};

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
      return diff < 30000; // Criado nos últimos 30 segundos
    });

    if (temAgendamentoRecente && contexto.etapa === 'criar_agendamento') {
      console.log('✅ Agendamento recente detectado, resetando contexto');
      contexto = {}; // Resetar contexto para evitar loop
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
    const dataAtual = new Date();
    const dataAtualFormatada = dataAtual.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

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
    
    // Adicionar mensagem atual do usuário
    mensagensFormatadas.push({
      role: 'user',
      content: mensagem
    });

    // Resposta determinística para perguntas sobre serviços/valores
    let resposta: string | null = null;
    const ml = (mensagem || '').toLowerCase();
    const pedeLista = /(lista de serviços|lista de servicos|quais.*serviç|quais.*servic|tem.*serviç|tem.*servic|que serviço|que servico)/i.test(ml);
    let servicoDetectado: any = null;
    for (const s of (servicos || [])) {
      if (ml.includes((s.nome || '').toLowerCase())) { servicoDetectado = s; break; }
    }
    const perguntaPreco = /(quanto custa|preço|preco|valor)/i.test(ml);

    if (pedeLista && (servicos || []).length > 0) {
      resposta = `Tenho sim, amor! 💜\n\n${servicosFormatados}`;
    } else if (perguntaPreco && servicoDetectado) {
      const s = servicoDetectado as any;
      const duracaoTexto = s.duracao >= 60 
        ? `${Math.floor(s.duracao / 60)}h${s.duracao % 60 > 0 ? ` ${s.duracao % 60}min` : ''}`
        : `${s.duracao} min`;
      resposta = `${s.nome} custa R$ ${Number(s.preco).toFixed(2).replace('.', ',')} e dura ${duracaoTexto}.`;
    }

    // Só chama IA se ainda não geramos resposta específica
    if (!resposta) {
      console.log('🤖 Enviando para Lovable AI (L&J)');
      try {
        // Chamar edge function chat-assistente com contexto de serviços
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
        console.error('⚠️ Lovable AI indisponível. Ativando fallback resiliente...', e);
        // Fallback determinístico para NUNCA ficar sem resposta
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
    const mensagemLower = mensagem.toLowerCase();
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
        // Fallback para palavras-chave
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
          resposta = `Tudo bem, amor! Seu agendamento de ${agendamento.servico_nome} do dia ${dd}/${mm} às ${agendamento.horario} foi cancelado. 💜 Se precisar agendar de novo, é só chamar!`;
          novoContexto = {}; // Resetar contexto
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
        resposta = `Claro, amor! Vou remarcar seu ${agendamento.servico_nome} que estava agendado para ${dd}/${mm} às ${agendamento.horario}. Qual nova data você prefere? 💜`;
        console.log('🔄 Iniciando reagendamento');
      }
    }
    // Detectar serviço escolhido (novo agendamento)
    else {
      servicos?.forEach(s => {
        if (mensagemLower.includes(s.nome.toLowerCase())) {
          novoContexto.servico_id = s.id;
          novoContexto.servico_nome = s.nome;
          novoContexto.acao = 'agendar';
          if (!novoContexto.etapa || novoContexto.etapa === 'escolher_servico') {
            novoContexto.etapa = 'escolher_data';
          }
          console.log('✅ Serviço detectado:', s.nome);
        }
      });
    }

    // Canonicaliza resposta quando apenas o serviço foi definido
    if (novoContexto.servico_id && !novoContexto.data) {
      const nomeServ = novoContexto.servico_nome || 'serviço';
      resposta = `Perfeito! ${nomeServ} anotado. Para qual dia você prefere? ✨`;
    }

    // Se ainda não detectou, procurar no histórico (apenas mensagens do cliente e mais recentes)
    if (!novoContexto.servico_id && historicoMensagens) {
      const recentesCliente = (historicoMensagens as any[])
        .filter((m) => m.tipo === 'recebida')
        .slice(-6);
      for (const s of servicos || []) {
        const nomeLower = s.nome.toLowerCase();
        if (recentesCliente.some((m) => (m.conteudo || '').toLowerCase().includes(nomeLower))) {
          novoContexto.servico_id = s.id;
          novoContexto.servico_nome = s.nome;
          if (!novoContexto.etapa) novoContexto.etapa = 'escolher_data';
          console.log('✅ Serviço detectado no histórico (cliente):', s.nome);
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

    // Helpers de horário e disponibilidade
    const parseHorario = (text: string): string | null => {
      const t = (text || '').toLowerCase();

      // Prioriza formatos com conectores de tempo em PT-BR
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

          // Evita capturar o dia do mês em datas do tipo 31/10
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
      if (hh < 8 || hh > 21) return false; // horário comercial definido
      if (![0, 30].includes(mm)) return false; // intervalos de 30min
      return true;
    };

    const gerarSlotsBloqueados = (inicio: string, duracaoMin: number): string[] => {
      const [h, m] = inicio.split(':').map(Number);
      const start = h * 60 + m;
      const end = start + duracaoMin;
      const slots: string[] = [];
      for (let t = start; t < end; t += 30) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
      return slots;
    };

    // Detectar data (múltiplos formatos) - SEMPRE processa para permitir correções
    // Formato DD/MM/YYYY ou DD/MM tem prioridade sobre data existente
    const dataMatch = mensagem.match(/(\d{1,2})\/(\d{1,2})(\/(\d{4}))?/);
    if (dataMatch) {
      const dia = dataMatch[1].padStart(2, '0');
      const mes = dataMatch[2].padStart(2, '0');
      const ano = dataMatch[4] || new Date().getFullYear().toString();
      novoContexto.data = `${ano}-${mes}-${dia}`;
      novoContexto.etapa = 'escolher_horario';
      console.log('📅 Data detectada (formato):', novoContexto.data);
    } else if (!novoContexto.data) {
      // Só tenta detectar referências relativas se não tem data explícita
      const dataRelativa = calcularData(mensagemLower);
      if (dataRelativa) {
        novoContexto.data = dataRelativa;
        novoContexto.etapa = 'escolher_horario';
        console.log('📅 Data detectada (relativa):', novoContexto.data);
      }

      // Se ainda não detectou, procurar no histórico (recente e apenas mensagens do cliente)
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
            novoContexto.data = `${ano}-${mes}-${dia}`;
            novoContexto.etapa = 'escolher_horario';
            console.log('📅 Data detectada no histórico (recente):', novoContexto.data);
            break;
          }
          const relativa = calcularData(txt);
          if (relativa) {
            novoContexto.data = relativa;
            novoContexto.etapa = 'escolher_horario';
            console.log('📅 Data detectada no histórico (relativa/recente):', novoContexto.data);
            break;
          }
        }
      }
    }

     // Se já temos data e serviço mas falta horário, padroniza a resposta com data correta
     if (novoContexto.data && novoContexto.servico_id && !novoContexto.horario) {
       try {
         const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
         const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
         const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
         const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
         const nomeServ = novoContexto.servico_nome || 'serviço';
         resposta = `Perfeito! ${nomeServ} em ${ddmm} (${wd}). Qual horário você prefere? 💜`;
       } catch {}
     }
 
     // Detectar horário (múltiplos formatos)
    if (!novoContexto.horario) {
      // Primeiro tenta padrões robustos e válidos
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

      // Se ainda não detectou, procurar no histórico (recente, do cliente e com validação)
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
            console.log('⏰ Horário detectado no histórico (recente):', novoContexto.horario);
            break;
          }
          const txt = (m.conteudo || '').toLowerCase();
          if (txt.includes('meio dia') || txt.includes('meio-dia')) {
            novoContexto.horario = '12:00';
            if (novoContexto.data && novoContexto.servico_id) {
              novoContexto.etapa = 'confirmar_nome';
            }
            console.log('⏰ Horário detectado no histórico (meio dia/recente):', novoContexto.horario);
            break;
          }
        }
      }
    }

    // Detectar nome - só detecta se todas as outras info já estão preenchidas
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
        const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
        const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
        const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
        const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
        const nomeServ = novoContexto.servico_nome || 'serviço';
        resposta = `Perfeito! ${nomeServ} em ${ddmm} (${wd}) às ${novoContexto.horario}. Qual seu nome completo para confirmar? 💜`;
      } catch {}
      console.log('👤 Aguardando nome válido do cliente para prosseguir.');
    }

    // Criar agendamento se todas as informações estiverem completas
    if (novoContexto.etapa === 'criar_agendamento' && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario && 
        novoContexto.cliente_nome) {
      
      // Validações de horário e disponibilidade
      if (!isValidHorario(novoContexto.horario)) {
        resposta = 'Esse horário não é válido (funcionamos de 08:00 às 21:00, a cada 30 min). Me diga outro, amor 💜';
        novoContexto.etapa = 'escolher_horario';
      } else {
        // Verificar configuração do dia
        const { data: cfg } = await supabase
          .from('agenda_config')
          .select('*')
          .eq('data', novoContexto.data)
          .maybeSingle();

        if (cfg?.fechado) {
          resposta = 'Esse dia está fechado. Quer tentar outra data, querida? 💜';
          novoContexto.etapa = 'escolher_data';
        } else {
          // Calcular horários indisponíveis
          const { data: ags } = await supabase
            .from('agendamentos')
            .select('horario, servico_id')
            .eq('data', novoContexto.data);

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
            // Validar horários suficientes para a duração do serviço
            const servEsc = (servicos || []).find(s => s.id === novoContexto.servico_id);
            if (servEsc?.duracao) {
              const bloqueiosNecessarios = gerarSlotsBloqueados(novoContexto.horario, servEsc.duracao);
              const slotsIndisponiveis = bloqueiosNecessarios.filter((x) => bloqueados.has(x));
              const horFimMin = parseInt(novoContexto.horario.split(':')[0]) * 60 + parseInt(novoContexto.horario.split(':')[1]) + servEsc.duracao;
              const ultrapassaHorario = (horFimMin > 21 * 60); // termina depois das 21:00

              if (slotsIndisponiveis.length > 0) {
                resposta = `Esse horário não dá, amor. O ${servEsc.nome} precisa de ${servEsc.duracao} min e alguns horários já estão ocupados. Pode escolher outro? 💜`;
                novoContexto.etapa = 'escolher_horario';
              } else if (ultrapassaHorario) {
                resposta = `Esse horário não funciona, querida. O ${servEsc.nome} leva ${servEsc.duracao} min e terminaria após 21h. Pode escolher um horário antes? 💜`;
                novoContexto.etapa = 'escolher_horario';
              } else {
                // Se for reagendamento, ATUALIZAR o agendamento existente
                if (novoContexto.acao === 'reagendar' && novoContexto.agendamento_id) {
                  console.log('💾 Atualizando agendamento existente:', {
                    id: novoContexto.agendamento_id,
                    nova_data: novoContexto.data,
                    novo_horario: novoContexto.horario
                  });

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
                    console.error('❌ Erro ao atualizar agendamento:', agendamentoError);
                  } else {
                    console.log('✅ Agendamento atualizado com sucesso!', agendamentoAtualizado);
                    
                    try {
                      const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
                      const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
                      const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
                      const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
                      const nomeServ = novoContexto.servico_nome || 'serviço';
                      const nomeCliente = novoContexto.cliente_nome!;
                      resposta = `Prontinho, ${nomeCliente}! Seu ${nomeServ} foi reagendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                    } catch {}
                    novoContexto = {}; // Resetar contexto
                  }
                } else {
                  // Criar novo agendamento
                  console.log('💾 Criando novo agendamento:', {
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
                    
                    try {
                      const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
                      const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
                      const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
                      const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
                      const nomeServ = novoContexto.servico_nome || 'serviço';
                      const nomeCliente = novoContexto.cliente_nome!;
                      resposta = `Prontinho, ${nomeCliente}! ${nomeServ} agendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                    } catch {}
                    novoContexto = {}; // Resetar contexto
                  }
                }
              }
            } else {
              // Sem info de duração, prosseguir (fallback)
              console.log('💾 Tentando criar agendamento (sem duração definida):', {
                cliente_nome: novoContexto.cliente_nome,
                telefone,
                servico_id: novoContexto.servico_id,
                data: novoContexto.data,
                horario: novoContexto.horario
              });

              // Se for reagendamento, ATUALIZAR o agendamento existente
              if (novoContexto.acao === 'reagendar' && novoContexto.agendamento_id) {
                console.log('💾 Atualizando agendamento existente (sem duração):', {
                  id: novoContexto.agendamento_id,
                  nova_data: novoContexto.data,
                  novo_horario: novoContexto.horario
                });

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
                  console.error('❌ Erro ao atualizar agendamento:', agendamentoError);
                } else {
                  console.log('✅ Agendamento atualizado com sucesso!', agendamentoAtualizado);
                  
                  try {
                    const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
                    const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
                    const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
                    const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
                    const nomeServ = novoContexto.servico_nome || 'serviço';
                    const nomeCliente = novoContexto.cliente_nome!;
                    resposta = `Prontinho, ${nomeCliente}! Seu ${nomeServ} foi reagendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                  } catch {}
                  novoContexto = {};
                }
              } else {
                // Criar novo agendamento
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
                  
                  try {
                    const [yyyyNum, mmNum, ddNum] = (novoContexto.data as string).split('-').map(Number);
                    const d = new Date(Date.UTC(yyyyNum, mmNum - 1, ddNum, 12, 0, 0));
                    const wd = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getUTCDay()];
                    const ddmm = `${String(ddNum).padStart(2,'0')}/${String(mmNum).padStart(2,'0')}`;
                    const nomeServ = novoContexto.servico_nome || 'serviço';
                    const nomeCliente = novoContexto.cliente_nome!;
                    resposta = `Prontinho, ${nomeCliente}! ${nomeServ} agendado para ${ddmm} (${wd}) às ${novoContexto.horario}. 💜`;
                  } catch {}
                  novoContexto = {};
                }
              }
            }
          }
        }
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

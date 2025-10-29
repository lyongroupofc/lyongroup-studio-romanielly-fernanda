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

    console.log('🤖 Enviando para Lovable AI (L&J)');

    let resposta: string | null = null;
    try {
      // Chamar edge function chat-assistente
      const { data: chatData, error: chatError } = await supabase.functions.invoke('chat-assistente', {
        body: { messages: mensagensFormatadas }
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

    if (!resposta) {
      resposta = 'Tive um pico de uso agora, mas já estou aqui! Pode repetir por favor?';
    }


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

      // Se ainda não detectou, procurar no histórico (com validação)
      if (!novoContexto.horario && historicoMensagens) {
        for (const m of historicoMensagens) {
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

    // Detectar nome - só detecta se todas as outras info já estão preenchidas
    if (!novoContexto.cliente_nome && 
        novoContexto.servico_id && 
        novoContexto.data && 
        novoContexto.horario) {
      const candidato = mensagem.trim();
      const contemTermosNaoNome = /[0-9\/?]/.test(candidato) || /(dia|vaga|hora|tem|pode|amanh|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)/i.test(candidato);
      const ehNomeProvavel = /^[A-Za-zÀ-ÿ' ]{2,60}$/.test(candidato) && !contemTermosNaoNome;
      if (ehNomeProvavel) {
        novoContexto.cliente_nome = candidato;
        novoContexto.etapa = 'criar_agendamento';
        console.log('👤 Nome detectado:', novoContexto.cliente_nome);
      }
    }

    // Não agendar sem nome válido
    if (!novoContexto.cliente_nome && novoContexto.servico_id && novoContexto.data && novoContexto.horario) {
      novoContexto.etapa = 'confirmar_nome';
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
              // Confirmação padrão caso a IA não tenha confirmado
              if (!resposta || resposta.trim() === '') {
                try {
                  const [yyyy, mm, dd] = (novoContexto.data as string).split('-');
                  resposta = `Pronto! Agendei para ${dd}/${mm} às ${novoContexto.horario} 💜`;
                } catch {}
              }
              novoContexto = {}; // Resetar contexto
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

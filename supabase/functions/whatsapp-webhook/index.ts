import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validate webhook input
    const webhookSchema = z.object({
      telefone: z.string().min(1, 'Phone number required').max(50, 'Phone number too long'),
      mensagem: z.string().min(1, 'Message required').max(5000, 'Message too long')
    });
    
    const body = await req.json();
    const validated = webhookSchema.parse(body);
    const { telefone, mensagem } = validated;

    console.log('📱 Mensagem recebida:', { telefone, mensagem });

    // Verificar se bot está ativo globalmente
    const { data: configAtivo } = await supabase
      .from('bot_config')
      .select('valor')
      .eq('chave', 'ativo')
      .maybeSingle();

    if (configAtivo?.valor?.valor === false) {
      console.log('🤖 Bot desativado globalmente');
      return new Response(JSON.stringify({ resposta: 'Bot desativado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se número está bloqueado
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
      .maybeSingle();

    if (!conversa) {
      const { data: novaConversa } = await supabase
        .from('bot_conversas')
        .insert({ telefone, contexto: {}, bot_ativo: true })
        .select()
        .single();
      conversa = novaConversa;
    }

    if (!conversa?.bot_ativo) {
      console.log('🔇 Bot desativado para esta conversa');
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Registrar mensagem recebida
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa.id,
      telefone,
      tipo: 'recebida',
      conteudo: mensagem,
    });

    // Buscar histórico de mensagens
    const { data: historicoMensagens } = await supabase
      .from('bot_mensagens')
      .select('*')
      .eq('conversa_id', conversa.id)
      .order('timestamp', { ascending: true })
      .limit(20);

    // Buscar serviços e profissionais
    const { data: servicos } = await supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    const { data: profissionais } = await supabase
      .from('profissionais')
      .select('*')
      .eq('ativo', true);

    // Formatar serviços para o prompt
    const servicosFormatados = (servicos || []).map(s => {
      const duracaoTexto = s.duracao >= 60 
        ? `${Math.floor(s.duracao / 60)}h${s.duracao % 60 > 0 ? ` ${s.duracao % 60}min` : ''}`
        : `${s.duracao} min`;
      return `• ${s.nome} - R$ ${Number(s.preco).toFixed(2).replace('.', ',')} (${duracaoTexto})`;
    }).join('\n');

    const profissionaisFormatados = (profissionais || []).map(p => 
      `• ${p.nome}${p.especialidades?.length ? ` - ${p.especialidades.join(', ')}` : ''}`
    ).join('\n');

    // Preparar mensagens para IA
    const mensagensIA = (historicoMensagens || []).map(msg => ({
      role: msg.tipo === 'recebida' ? 'user' : 'assistant',
      content: msg.conteudo
    }));

    mensagensIA.push({
      role: 'user',
      content: mensagem
    });

    // Data atual para contexto da IA
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=domingo, 1=segunda, etc
    const dataAtualFormatada = hoje.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calcular próximas segundas
    const proximaSegunda = new Date(hoje);
    const diasAteSegunda = (8 - diaSemana) % 7 || 7;
    proximaSegunda.setDate(hoje.getDate() + diasAteSegunda);
    
    const segundaSeguinte = new Date(proximaSegunda);
    segundaSeguinte.setDate(proximaSegunda.getDate() + 7);
    
    // System prompt
    const systemPrompt = `Você é a L&J, assistente virtual do Studio Jennifer Silva, um salão de beleza especializado em cabelos afro e cacheados.

**INFORMAÇÕES DE DATA (MUITO IMPORTANTE):**
- **HOJE É: ${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()} (${dataAtualFormatada})**
- **Próxima segunda-feira:** ${proximaSegunda.getDate().toString().padStart(2, '0')}/${(proximaSegunda.getMonth() + 1).toString().padStart(2, '0')}/${proximaSegunda.getFullYear()}
- **Segunda seguinte:** ${segundaSeguinte.getDate().toString().padStart(2, '0')}/${(segundaSeguinte.getMonth() + 1).toString().padStart(2, '0')}/${segundaSeguinte.getFullYear()}

ATENÇÃO: Quando a cliente disser "próxima segunda" ou "segunda que vem", use a data da próxima segunda-feira mostrada acima!

**Sua Personalidade:**
- Acolhedora, empática e carinhosa
- Use emojis com moderação (💜, ✨, 😊)
- Trate as clientes como "amor", "querida", "linda"
- Seja natural e conversacional

**Serviços Disponíveis:**
${servicosFormatados}

**Profissionais:**
${profissionaisFormatados}

**Horário de Funcionamento:**
- Segunda a Sábado: 08:00 às 21:00
- Domingo: FECHADO

**Regras Importantes:**
1. NÃO funcionamos aos domingos - sempre informe isso se cliente escolher domingo
2. Para agendar, você PRECISA de: serviço, data, horário e nome da cliente
3. O TELEFONE já está disponível no sistema - NÃO PERGUNTE o telefone da cliente
4. Escolha SEMPRE um serviço usando exatamente um dos nomes listados em "Serviços Disponíveis". Não invente nomes.
5. Não invente IDs de serviço. Se não souber o servico_id, deixe-o em branco; o sistema resolve pelo nome.
6. Use a ferramenta criar_agendamento SOMENTE quando tiver TODAS as informações (serviço, data, horário e nome)
7. A ferramenta vai validar se há disponibilidade e criar o agendamento automaticamente
8. Se não houver vaga, a ferramenta vai retornar sugestões de horários alternativos
**Política de Cancelamento:**
- Cancelamento: permitido até 5 dias antes
- Reagendamento: permitido até 2 dias antes

**Fluxo de Agendamento:**
1. Identifique o serviço desejado
2. Pergunte a data preferida (use as datas de referência acima)
3. Pergunte o horário preferido  
4. Pergunte o nome da cliente
5. Assim que tiver TODAS essas 4 informações, chame a ferramenta criar_agendamento
6. NÃO peça telefone - ele já está no sistema
7. Confirme o agendamento com data/hora formatada

**Importante:**
- Se a cliente mencionar "alisamento" ou "cabelo afro", ajude a identificar o serviço correto
- Seja específica sobre qual serviço está sendo agendado
- Sempre confirme os dados antes de chamar a ferramenta`;

    // Definir ferramenta de agendamento
    const tools = [
      {
        type: "function",
          function: {
          name: "criar_agendamento",
          description: "Cria um agendamento no sistema. IMPORTANTE: Esta ferramenta valida automaticamente a disponibilidade considerando a duração do serviço. Use apenas quando tiver TODOS os dados: servico_nome, data (YYYY-MM-DD), horario (HH:MM) e cliente_nome. O telefone já está disponível no contexto da conversa. Não invente IDs de serviço; se não souber o servico_id, deixe-o vazio que o sistema resolve pelo nome.",
          parameters: {
            type: "object",
            properties: {
              servico_id: {
                type: "string",
                description: "ID do serviço escolhido (opcional)"
              },
              servico_nome: {
                type: "string",
                description: "Nome do serviço para confirmação"
              },
              data: {
                type: "string",
                description: "Data do agendamento no formato YYYY-MM-DD"
              },
              horario: {
                type: "string",
                description: "Horário no formato HH:MM (ex: 10:00)"
              },
              cliente_nome: {
                type: "string",
                description: "Nome completo da cliente"
              }
            },
            required: ["servico_nome", "data", "horario", "cliente_nome"]
          }
        }
      }
    ];

    // Chamar Lovable AI
    console.log('🤖 Chamando Lovable AI...');
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
          ...mensagensIA
        ],
        tools,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na IA:', aiResponse.status, errorText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('✅ Resposta da IA:', JSON.stringify(aiData, null, 2));

    let resposta = aiData.choices[0]?.message?.content || 'Desculpe, não entendi. Pode reformular?';
    const toolCalls = aiData.choices[0]?.message?.tool_calls;

    // Processar tool calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'criar_agendamento') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('📝 Criando agendamento:', args);

          // Resolver serviço por ID válido ou por nome normalizado
          const normalize = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          let servico = servicos?.find(s => s.id === args.servico_id);

          if (!servico && args.servico_nome) {
            const alvo = normalize(args.servico_nome);
            servico = servicos?.find(s => normalize(s.nome) === alvo)
              ?? servicos?.find(s => normalize(s.nome).includes(alvo) || alvo.includes(normalize(s.nome)));
          }

          // Fallback raro: alguns modelos podem enviar o preço no campo servico_id
          if (!servico && args.servico_id && /^[0-9]+([.,][0-9]+)?$/.test(String(args.servico_id))) {
            const precoAlvo = Number(String(args.servico_id).replace(',', '.'));
            servico = servicos?.find(s => Number(s.preco) === precoAlvo);
          }

          if (!servico) {
            resposta = 'Ops, não encontrei esse serviço. Pode escolher um nome exatamente como na lista acima?';
            continue;
          }

          // Garanta consistência dos argumentos resolvidos
          args.servico_id = servico.id;
          args.servico_nome = servico.nome;

          // Verificar se é domingo
          const dataAgendamento = new Date(args.data + 'T12:00:00');
          if (dataAgendamento.getDay() === 0) {
            resposta = 'Desculpa amor, não funcionamos aos domingos. Pode escolher outra data? 💜';
            continue;
          }

          // Buscar config do dia
          const { data: config } = await supabase
            .from('agenda_config')
            .select('*')
            .eq('data', args.data)
            .maybeSingle();

          if (config?.fechado) {
            resposta = 'Esse dia está fechado. Quer tentar outra data, querida? 💜';
            continue;
          }

          // Gerar todos os slots ocupados
          const { data: agendamentosExistentes } = await supabase
            .from('agendamentos')
            .select('horario, servico_id')
            .eq('data', args.data)
            .neq('status', 'Cancelado');

          const slotsOcupados = new Set<string>();
          
          // Adicionar slots bloqueados por agendamentos existentes
          (agendamentosExistentes || []).forEach((ag: any) => {
            const servicoAg = servicos?.find(s => s.id === ag.servico_id);
            if (servicoAg?.duracao) {
              const [h, m] = ag.horario.split(':').map(Number);
              const inicioMin = h * 60 + m;
              const fimMin = inicioMin + servicoAg.duracao;
              
              for (let t = inicioMin; t < fimMin; t += 30) {
                const hh = String(Math.floor(t / 60)).padStart(2, '0');
                const mm = String(t % 60).padStart(2, '0');
                slotsOcupados.add(`${hh}:${mm}`);
              }
            }
          });

          // Adicionar slots bloqueados manualmente
          (config?.horarios_bloqueados || []).forEach((h: string) => slotsOcupados.add(h));

          // Verificar se o horário solicitado está disponível
          const [h, m] = args.horario.split(':').map(Number);
          const inicioMin = h * 60 + m;
          const fimMin = inicioMin + servico.duracao;

          // Verificar se todos os slots necessários estão disponíveis
          let disponivel = true;
          const slotsNecessarios: string[] = [];
          
          for (let t = inicioMin; t < fimMin; t += 30) {
            const hh = String(Math.floor(t / 60)).padStart(2, '0');
            const mm = String(t % 60).padStart(2, '0');
            const slot = `${hh}:${mm}`;
            slotsNecessarios.push(slot);
            
            if (slotsOcupados.has(slot) || t >= 21 * 60) {
              disponivel = false;
              break;
            }
          }

          if (!disponivel) {
            // Gerar sugestões de horários disponíveis
            const horariosDisponiveis: string[] = [];
            
            for (let h = 8; h <= 20; h++) {
              for (let m = 0; m < 60; m += 30) {
                const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const [hh, mm] = horario.split(':').map(Number);
                const inicio = hh * 60 + mm;
                const fim = inicio + servico.duracao;
                
                if (fim > 21 * 60) continue;
                
                let isDisponivel = true;
                for (let t = inicio; t < fim; t += 30) {
                  const slotCheck = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                  if (slotsOcupados.has(slotCheck)) {
                    isDisponivel = false;
                    break;
                  }
                }
                
                if (isDisponivel) {
                  horariosDisponiveis.push(horario);
                }
              }
            }

            if (horariosDisponiveis.length > 0) {
              const [yyyy, mm, dd] = args.data.split('-');
              const sugestoes = horariosDisponiveis.slice(0, 5).join(', ');
              resposta = `Desculpa amor, ${args.horario} não está disponível para ${args.servico_nome} (${servico.duracao}min). Horários disponíveis em ${dd}/${mm}: ${sugestoes}... Qual prefere? 💜`;
            } else {
              resposta = `Esse dia não tem horários disponíveis para ${args.servico_nome}. Pode escolher outro dia, querida? 💜`;
            }
            continue;
          }

          // Criar agendamento
          const { data: novoAgendamento, error: erroAgendamento } = await supabase
            .from('agendamentos')
            .insert({
              servico_id: args.servico_id,
              servico_nome: args.servico_nome,
              data: args.data,
              horario: args.horario,
              cliente_nome: args.cliente_nome,
              cliente_telefone: telefone,
              status: 'Confirmado',
              origem: 'whatsapp',
              bot_conversa_id: conversa.id,
            })
            .select()
            .single();

          if (erroAgendamento) {
            console.error('❌ Erro ao criar agendamento:', erroAgendamento);
            resposta = 'Ops, tive um problema ao agendar. Pode tentar novamente? 😊';
            continue;
          }

          console.log('✅ Agendamento criado:', novoAgendamento);

          // Formatar resposta de confirmação
          const [yyyy, mm, dd] = args.data.split('-');
          const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
          const diaSemana = diasSemana[dataAgendamento.getUTCDay()];
          
          resposta = `Perfeito! ${args.servico_nome} agendado para ${dd}/${mm} (${diaSemana}) às ${args.horario}. Te aguardo, ${args.cliente_nome.split(' ')[0]}! 💜✨`;

          // Limpar contexto
          await supabase
            .from('bot_conversas')
            .update({ 
              contexto: {}, 
              ultimo_contato: new Date().toISOString() 
            })
            .eq('id', conversa.id);
        }
      }
    }

    // Registrar resposta
    await supabase.from('bot_mensagens').insert({
      conversa_id: conversa.id,
      telefone,
      tipo: 'enviada',
      conteudo: resposta,
    });

    // Atualizar último contato
    await supabase
      .from('bot_conversas')
      .update({ ultimo_contato: new Date().toISOString() })
      .eq('id', conversa.id);

    console.log('💬 Resposta:', resposta);

    return new Response(JSON.stringify({ resposta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: 'errors' in error ? error.errors : [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

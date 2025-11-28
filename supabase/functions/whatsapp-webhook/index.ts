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
      mensagem: z.string().min(1, 'Message required').max(5000, 'Message too long'),
      instancia: z.string().optional()
    });
    
    const body = await req.json();
    const validated = webhookSchema.parse(body);
    const { telefone, mensagem, instancia } = validated;

    console.log('📱 Mensagem recebida:', { telefone, mensagem, instancia });

    // Instâncias de automação que sempre funcionam (ignoram config global)
    const instanciasAutomacao = ['Bot disparo', 'Automações Agencia', 'Automações-Agencia', 'Automacoes-Agencia'];
    const isInstanciaAutomacao = instanciasAutomacao.includes(instancia || '');

    // Verificar se bot está ativo globalmente (EXCETO para instâncias de automação)
    if (!isInstanciaAutomacao) {
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
    } else {
      console.log(`✅ Instância de automação (${instancia}) - ignorando config global`);
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
    let query = supabase
      .from('bot_conversas')
      .select('*')
      .eq('telefone', telefone);
    
    if (instancia) {
      query = query.eq('instancia', instancia);
    }
    
    let { data: conversa } = await query.maybeSingle();

    if (!conversa) {
      const { data: novaConversa } = await supabase
        .from('bot_conversas')
        .insert({ 
          telefone, 
          contexto: {}, 
          bot_ativo: true,
          instancia: instancia || 'default'
        })
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

    // Função para extrair informações do contexto dos tool calls
    function extrairInformacoesDoContexto(contextoAtual: any, toolCalls: any[]): any {
      const novoContexto = { ...contextoAtual };
      
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          if (toolCall.function.name === 'criar_agendamento') {
            const args = JSON.parse(toolCall.function.arguments);
            if (args.servico_id) novoContexto.servico_id = args.servico_id;
            if (args.servico_nome) novoContexto.servico_nome = args.servico_nome;
            if (args.data) novoContexto.data = args.data;
            if (args.horario) novoContexto.horario = args.horario;
            if (args.cliente_nome) novoContexto.nome_completo = args.cliente_nome;
            if (args.data_nascimento) novoContexto.data_nascimento = args.data_nascimento;
          }
        }
      }
      
      return novoContexto;
    }

    // Função para extrair contexto da resposta da IA
    function extrairContextoDaResposta(respostaIA: string, contextoAtual: any): any {
      const novoContexto = { ...contextoAtual };
      
      // Detectar serviço mencionado
      if (servicos && servicos.length > 0) {
        const servicosLower = servicos.map(s => ({ nome: s.nome.toLowerCase(), id: s.id }));
        for (const servico of servicosLower) {
          if (respostaIA.toLowerCase().includes(servico.nome)) {
            const servicoObj = servicos.find(s => s.id === servico.id);
            if (servicoObj && !novoContexto.servico_nome) {
              novoContexto.servico_nome = servicoObj.nome;
              novoContexto.servico_id = servicoObj.id;
            }
          }
        }
      }
      
      // Detectar data mencionada (DD/MM/YYYY ou DD/MM)
      const regexDataCompleta = /(\d{2})\/(\d{2})\/(\d{4})/g;
      const matchDataCompleta = respostaIA.match(regexDataCompleta);
      if (matchDataCompleta && matchDataCompleta.length > 0 && !novoContexto.data) {
        const [dia, mes, ano] = matchDataCompleta[0].split('/');
        novoContexto.data = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD
      } else {
        // Se não encontrou data completa, tentar DD/MM
        const regexDataCurta = /(\d{2})\/(\d{2})(?!\/)/g;
        const matchDataCurta = respostaIA.match(regexDataCurta);
        if (matchDataCurta && matchDataCurta.length > 0 && !novoContexto.data) {
          const [dia, mes] = matchDataCurta[0].split('/');
          const anoAtual = hoje.getFullYear();
          novoContexto.data = `${anoAtual}-${mes}-${dia}`; // Assumir ano atual
        }
      }
      
      // Detectar horário mencionado (HH:MM)
      const regexHorario = /(\d{1,2}):(\d{2})/g;
      const matchHorario = respostaIA.match(regexHorario);
      if (matchHorario && matchHorario.length > 0 && !novoContexto.horario) {
        novoContexto.horario = matchHorario[0];
      }
      
      return novoContexto;
    }

    // Preparar mensagens para IA
    const mensagensIA = (historicoMensagens || []).map(msg => ({
      role: msg.tipo === 'recebida' ? 'user' : 'assistant',
      content: msg.conteudo
    }));

    mensagensIA.push({
      role: 'user',
      content: mensagem
    });

    // Data atual para contexto da IA - calendário dos próximos 15 dias (timezone Brasil)
    const agora = new Date();
    
    // Ajustar para timezone do Brasil (UTC-3)
    const brasilOffset = -3 * 60; // -3 horas em minutos
    const utcOffset = agora.getTimezoneOffset();
    const diff = brasilOffset - utcOffset;
    const hoje = new Date(agora.getTime() + diff * 60 * 1000);
    
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    
    // Criar calendário dos próximos 15 dias com referências explícitas
    const calendario: string[] = [];
    const referenciasRapidas: string[] = [];
    
    for (let i = 0; i < 15; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      const dia = data.getDate().toString().padStart(2, '0');
      const mes = (data.getMonth() + 1).toString().padStart(2, '0');
      const ano = data.getFullYear();
      const diaSemanaTexto = diasSemana[data.getDay()];
      const diaSemanaIndex = data.getDay();
      
      const prefixo = i === 0 ? '**HOJE**' : i === 1 ? '**AMANHÃ**' : '';
      const linha = `${prefixo} ${dia}/${mes}/${ano} (${diaSemanaTexto})`.trim();
      calendario.push(linha);
      
      // Criar referências rápidas explícitas para cada dia da semana
      if (i > 0) { // Pular hoje
        const diaSemanaUpper = diaSemanaTexto.toUpperCase();
        referenciasRapidas.push(`**PRÓXIM${diaSemanaIndex === 6 ? 'O' : 'A'} ${diaSemanaUpper}:** ${dia}/${mes}/${ano}`);
      }
      
      // Logar todos os 15 dias para debug
      console.log(`📅 Data ${i}: ${linha}`);
    }
    
    const calendarioTexto = calendario.join('\n');
    const referenciasTexto = referenciasRapidas.join('\n');
    
    console.log(`📅 Calendário completo gerado com ${calendario.length} datas`);
    console.log(`📌 Referências rápidas criadas: ${referenciasRapidas.length} entradas`);
    
    // Obter contexto atual
    const contexto = conversa.contexto || {};
    
    // Buscar cliente existente
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefone', telefone)
      .maybeSingle();

    // System prompt
    const systemPrompt = `Você é a Thaty, recepcionista do Studio Romanielly Fernanda, um studio de beleza especializado em estética e cuidados com unhas.

**CLIENTE IDENTIFICADO:**
${clienteExistente ? `✅ Cliente cadastrado: ${clienteExistente.nome}${clienteExistente.data_nascimento ? ` (nascimento: ${clienteExistente.data_nascimento})` : ''}` : '❌ Cliente novo (não cadastrado)'}

**CONTEXTO DA CONVERSA ATUAL:**
${contexto.servico_nome ? `✅ Serviço: JÁ ESCOLHIDO (${contexto.servico_nome})` : '❌ Serviço: ainda não escolhido'}
${contexto.data ? `✅ Data: JÁ INFORMADA (${contexto.data})` : '❌ Data: ainda não informada'}
${contexto.horario ? `✅ Horário: JÁ ESCOLHIDO (${contexto.horario})` : '❌ Horário: ainda não escolhido'}
${contexto.disponibilidade_verificada ? `✅ Disponibilidade: JÁ VERIFICADA (horário confirmado disponível)` : '❌ Disponibilidade: ainda não verificada'}
${contexto.nome_completo || clienteExistente?.nome ? `✅ Nome: JÁ COLETADO (${contexto.nome_completo || clienteExistente?.nome})` : '❌ Nome: ainda não coletado'}
${contexto.data_nascimento || clienteExistente?.data_nascimento ? `✅ Data de Nascimento: JÁ COLETADA (${contexto.data_nascimento || clienteExistente?.data_nascimento})` : '❌ Data de Nascimento: ainda não coletada'}

**⚠️ ATENÇÃO MÁXIMA - REGRAS DE CONTEXTO:**
- Se uma informação está marcada com ✅ (JÁ ESCOLHIDO/INFORMADO/COLETADO), você NUNCA, EM HIPÓTESE ALGUMA, deve perguntar novamente!
- SEMPRE revise o CONTEXTO DA CONVERSA ATUAL acima ANTES de fazer qualquer pergunta!
- Quando a cliente perguntar sobre disponibilidade (ex: "tem vaga de manhã?"), você DEVE:
  1. Confirmar que já sabe a data (se tiver ✅ na data)
  2. Perguntar diretamente qual horário específico ela prefere OU chamar verificar_disponibilidade para checar
  3. NUNCA pedir a data novamente se já está com ✅
- NÃO repita perguntas sobre informações que já têm ✅
- SEMPRE mencione datas no formato DD/MM/YYYY para que fiquem salvas no contexto

**SOBRE VOCÊ:**
- Seu nome é Thaty e você é a recepcionista do studio
- Você conversa de forma natural, humana e empática
- Adapte-se ao jeito de falar de cada cliente - se ela for mais formal, seja formal; se for mais descontraída, seja também
- Seja sempre prestativa, carinhosa e atenciosa
- Use emojis naturalmente, mas sem exagero (💅, ✨, 😊, 💜)

**📅 CALENDÁRIO DOS PRÓXIMOS 15 DIAS:**
${calendarioTexto}

**📌 REFERÊNCIA RÁPIDA POR DIA DA SEMANA:**
${referenciasTexto}

**⛔ REGRA ABSOLUTA - NUNCA CALCULE DATAS MANUALMENTE:**
1. ❌ PROIBIDO calcular qual dia da semana é uma data
2. ✅ SEMPRE copie as datas EXATAMENTE do calendário ou da REFERÊNCIA RÁPIDA acima
3. ✅ Quando a cliente falar "próxima quarta", "sábado que vem", etc → CONSULTE a "REFERÊNCIA RÁPIDA POR DIA DA SEMANA"
4. ✅ Se tiver dúvida, mostre 2-3 opções do calendário com datas EXATAS
5. ⚠️ Se você errar o dia da semana, a cliente vai perder confiança no atendimento

**Serviços do Studio:**
${servicosFormatados}

**Profissionais:**
${profissionaisFormatados}

**Horário de Funcionamento:**
- Segunda-feira: FECHADO
- Terça e Quarta: 13:00 às 20:00
- Quinta e Sexta: 09:00 às 19:00
- Sábado: 08:00 às 13:00
- Domingo: FECHADO

**Localização:**
📍 Rua Jordano Mafra, 1015 - São Bernardo

**INFORMAÇÕES DE PAGAMENTO:**

**Dados para pagamento:**
Pix: 35884146000121 | CNPJ
Romanielly - Banco Sicoob

**Formas de pagamento aceitas:**
- Cartão de débito
- Cartão de crédito (NUNCA mencione parcelamento no cartão)
- PIX
- Dinheiro

**Regra de Pagamento:** Sempre que confirmar um agendamento, informe as condições de pagamento de forma natural e amigável.

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
- Cancelamento: permitido até 24 horas antes
- Reagendamento: permitido até 24 horas antes

**🎯 FLUXO DE AGENDAMENTO CORRETO (OBRIGATÓRIO):**

**PASSO 1:** Identifique o serviço desejado

**PASSO 2:** Pergunte a data preferida
   - Se a cliente mencionar "próximo sábado", "quarta que vem", etc → CONSULTE a "REFERÊNCIA RÁPIDA POR DIA DA SEMANA" acima
   - SEMPRE confirme a data no formato completo DD/MM/YYYY copiada EXATAMENTE da referência
   - Exemplo correto: "Certo! [CONSULTE A REFERÊNCIA e use a data EXATA]. Qual horário você prefere?"
   - Se houver ambiguidade (ex: dois sábados próximos), mostre as 2 opções com datas EXATAS da REFERÊNCIA RÁPIDA

**PASSO 3:** Pergunte o horário específico que a cliente prefere
   - Pergunte diretamente: "Que horário você prefere?" ou "Tem algum horário em mente?"
   - NÃO sugira horários ainda - primeiro deixe a cliente informar o horário que quer
   - Se ela perguntar "tem vaga de manhã?" ou "o que tem disponível?", responda: "Me diz um horário que você prefere e eu verifico se está disponível! 😊"

**PASSO 4 (CRÍTICO - SEMPRE VERIFICAR ANTES DE SUGERIR):** Assim que tiver serviço + data + horário ESPECÍFICO → CHAME IMEDIATAMENTE "verificar_disponibilidade"
   - **⚠️ NUNCA sugira horários sem chamar verificar_disponibilidade primeiro!**
   - **⚠️ NUNCA assuma que um horário está disponível baseado no horário de funcionamento!**
   - **NÃO PEÇA DADOS PESSOAIS AINDA!**
   - Se disponível → avise e peça nome + data de nascimento
   - Se não disponível → a ferramenta vai retornar 2 horários alternativos automaticamente, mostre-os e pergunte qual prefere

**PASSO 5:** Apenas DEPOIS que a disponibilidade for confirmada:
   - Se CLIENTE IDENTIFICADO (✅ Cliente cadastrado), confirme os dados: "Seu nome é [nome], certo? O telefone [telefone] e a data de nascimento [data], confirma?"
   - Se ❌ Cliente novo, pergunte: nome completo, telefone com DDD (apenas números) e data de nascimento (DD/MM/AAAA)

**PASSO 6:** Chame criar_agendamento com todos os dados

**⛔ REGRAS ABSOLUTAS DE RESPOSTA:**
- Seja BREVE e OBJETIVA - mensagens curtas, máximo 2-3 linhas
- **⛔ NUNCA CALCULE DATAS** - use APENAS o "CALENDÁRIO" e a "REFERÊNCIA RÁPIDA POR DIA DA SEMANA"
- **⛔ NUNCA sugira horários** sem antes chamar verificar_disponibilidade
- **⛔ Dias fechados/feriados** - sempre verifique disponibilidade antes de sugerir
- Se houver ambiguidade de data, pergunte com opções claras do CALENDÁRIO: "Dia 30/11 ou 07/12?"
- NÃO repita informações que já estão no contexto (marcadas com ✅)
- Quando a cliente perguntar "tem vaga de manhã/tarde?", responda: "Me diz um horário que você prefere e eu verifico! 😊"

**⚠️ EXEMPLO DE USO CORRETO DA REFERÊNCIA RÁPIDA:**
Cliente: "Quero agendar na próxima quarta"
Você: [CONSULTA "REFERÊNCIA RÁPIDA POR DIA DA SEMANA" → encontra "PRÓXIMA QUARTA-FEIRA: 04/12/2025"]
Você: "Perfeito! Quarta-feira dia 04/12. Que horário você prefere?" ✅ CORRETO

**⚠️ REGRA CRÍTICA - NÃO PEDIR DADOS ANTES DE VERIFICAR DISPONIBILIDADE:**
- ❌ ERRADO: Pedir nome e data de nascimento ANTES de verificar se o horário está disponível
- ✅ CORRETO: Verificar disponibilidade PRIMEIRO, só depois pedir dados pessoais

**Exemplo CORRETO de conversa:**
Cliente: "Quero agendar Manicure para amanhã às 14:00"
Você: "Perfeito! Deixa eu verificar se esse horário está disponível..." [CHAMA verificar_disponibilidade]
Sistema: "Horário disponível"
Você: "Ótima notícia! O horário de 14:00 está disponível para Manicure amanhã! Agora preciso do seu nome completo e data de nascimento para confirmar, pode me passar?"
Cliente: "Maria Silva, 15/03/1990"
Você: [CHAMA criar_agendamento] "Agendamento confirmado! Maria Silva, Manicure amanhã às 14:00..."

**Exemplo CORRETO quando cliente pergunta sobre disponibilidade:**
Cliente: "Tem vaga de manhã na quarta-feira?"
Você: "Claro! Que horário da manhã você prefere? Me diz um horário e eu verifico se está disponível! 😊"
Cliente: "Às 10:00"
Você: [CHAMA verificar_disponibilidade] → Se disponível, confirma. Se não, sistema retorna alternativas.

**Exemplo ERRADO (NÃO FAÇA ISSO):**
Cliente: "Quero agendar Manicure para amanhã às 14:00"
Você: ❌ "Perfeito! Qual seu nome completo e data de nascimento?" [ERRO: NÃO verificou disponibilidade antes de pedir dados]

Cliente: "Tem vaga de manhã?"
Você: ❌ "Sim! Temos 09:00 e 10:00 disponíveis!" [ERRO CRÍTICO: sugeriu horários SEM verificar disponibilidade]

**Importante:**
- Se a cliente mencionar "alisamento" ou "cabelo afro", ajude a identificar o serviço correto
- Seja específica sobre qual serviço está sendo agendado
- Sempre confirme os dados antes de chamar a ferramenta
- LEMBRE-SE: o histórico da conversa está disponível - USE-O!`;

    // Definir ferramentas disponíveis
    const tools = [
      {
        type: "function",
        function: {
          name: "verificar_disponibilidade",
          description: "Verifica se um horário está disponível ANTES de pedir os dados pessoais da cliente. Use esta ferramenta logo após coletar serviço + data + horário. Retorna se o horário está disponível ou sugere alternativas. CHAME ESTA FERRAMENTA ANTES de pedir nome e data de nascimento!",
          parameters: {
            type: "object",
            properties: {
              servico_nome: {
                type: "string",
                description: "Nome do serviço para verificar disponibilidade"
              },
              data: {
                type: "string",
                description: "Data desejada no formato YYYY-MM-DD"
              },
              horario: {
                type: "string",
                description: "Horário desejado no formato HH:MM (ex: 14:00)"
              }
            },
            required: ["servico_nome", "data", "horario"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "criar_agendamento",
          description: "Cria um agendamento no sistema. Use APENAS DEPOIS de verificar disponibilidade (verificar_disponibilidade) e coletar TODOS os dados pessoais: servico_nome, data (YYYY-MM-DD), horario (HH:MM), cliente_nome, telefone (com DDD, apenas números) e data_nascimento (DD/MM/AAAA).",
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
              },
              telefone: {
                type: "string",
                description: "Telefone da cliente com DDD (apenas números, ex: 31987654321)"
              },
              data_nascimento: {
                type: "string",
                description: "Data de nascimento no formato DD/MM/AAAA"
              }
            },
            required: ["servico_nome", "data", "horario", "cliente_nome", "telefone", "data_nascimento"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consultar_agendamento",
          description: "Consulta os agendamentos ativos do cliente. Use para verificar se o cliente já tem agendamento antes de cancelar ou reagendar.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "cancelar_agendamento",
          description: "Cancela o agendamento do cliente. IMPORTANTE: Só pode cancelar até 24 horas antes. Sempre consulte o agendamento primeiro para confirmar os dados.",
          parameters: {
            type: "object",
            properties: {
              confirmar: {
                type: "boolean",
                description: "Deve ser true para confirmar o cancelamento"
              }
            },
            required: ["confirmar"]
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

    // Extrair e salvar contexto após resposta da IA
    console.log('🔍 Contexto ANTES:', JSON.stringify(conversa.contexto || {}));
    
    // Primeiro extrair dos tool calls
    let contextoToolCalls = extrairInformacoesDoContexto(
      conversa.contexto || {}, 
      toolCalls || []
    );
    
    // Depois extrair da resposta da IA
    let contextoResposta = extrairContextoDaResposta(resposta, contextoToolCalls);
    const novoContexto = contextoResposta;
    
    console.log('🔍 Contexto DEPOIS:', JSON.stringify(novoContexto));
    console.log('🔍 Houve mudança?', JSON.stringify(novoContexto) !== JSON.stringify(conversa.contexto || {}));

    // Atualizar contexto no banco (forçado temporariamente para debug)
    await supabase
      .from('bot_conversas')
      .update({ 
        contexto: novoContexto,
        ultimo_contato: new Date().toISOString()
      })
      .eq('id', conversa.id);
    
    console.log('💾 Contexto salvo (forçado para debug):', novoContexto);

    // Processar tool calls
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'verificar_disponibilidade') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('🔍 Verificando disponibilidade:', args);

          // Resolver serviço
          const normalize = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          const alvo = normalize(args.servico_nome);
          const servico = servicos?.find(s => normalize(s.nome) === alvo)
            ?? servicos?.find(s => normalize(s.nome).includes(alvo) || alvo.includes(normalize(s.nome)));

          if (!servico) {
            resposta = 'Ops, não encontrei esse serviço. Pode escolher um nome exatamente como na lista acima?';
            continue;
          }

          // Verificar dia da semana
          const dataAgendamento = new Date(args.data + 'T12:00:00');
          const dayOfWeek = dataAgendamento.getDay();
          
          if (dayOfWeek === 0) {
            resposta = 'Desculpa amor, não funcionamos aos domingos. Pode escolher outra data? 💜';
            continue;
          }
          
          if (dayOfWeek === 1) {
            resposta = 'Desculpa amor, não funcionamos às segundas-feiras. Pode escolher outra data? 💜';
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

          // Gerar slots ocupados
          const { data: agendamentosExistentes } = await supabase
            .from('agendamentos')
            .select('horario, servico_id, servico_nome')
            .eq('data', args.data)
            .neq('status', 'Cancelado');

          const slotsOcupados = new Set<string>();
          
          (agendamentosExistentes || []).forEach((ag: any) => {
            // Tentar encontrar serviço pelo ID primeiro
            let servicoAg = servicos?.find(s => s.id === ag.servico_id);
            
            // Fallback: buscar pelo nome se não encontrou pelo ID
            if (!servicoAg && ag.servico_nome) {
              const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              const nomeAlvo = normalize(ag.servico_nome.split(',')[0]); // Pegar primeiro serviço se houver múltiplos
              servicoAg = servicos?.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
            }
            
            // Usar duração do serviço encontrado OU duração padrão de 60min
            const duracao = servicoAg?.duracao || 60;
            
            const [h, m] = ag.horario.split(':').map(Number);
            const inicioMin = h * 60 + m;
            const fimMin = inicioMin + duracao;
            
            console.log(`🔒 Bloqueando slot: ${ag.horario} (serviço: ${ag.servico_nome || 'sem nome'}, duração: ${duracao}min)`);
            
            for (let t = inicioMin; t < fimMin; t += 30) {
              const hh = String(Math.floor(t / 60)).padStart(2, '0');
              const mm = String(t % 60).padStart(2, '0');
              slotsOcupados.add(`${hh}:${mm}`);
            }
          });

          (config?.horarios_bloqueados || []).forEach((h: string) => slotsOcupados.add(h));

          // Verificar horário de funcionamento
          const [h, m] = args.horario.split(':').map(Number);
          const inicioMin = h * 60 + m;
          const fimMin = inicioMin + servico.duracao;
          
          let startHour = 8;
          let endHour = 13;
          
          if (dayOfWeek === 2 || dayOfWeek === 3) {
            startHour = 13;
            endHour = 20;
          } else if (dayOfWeek === 4 || dayOfWeek === 5) {
            startHour = 9;
            endHour = 19;
          } else if (dayOfWeek === 6) {
            startHour = 8;
            endHour = 13;
          }
          
          const startMin = startHour * 60;
          const endMin = endHour * 60;
          
          if (inicioMin < startMin || fimMin > endMin) {
            // Gerar horários alternativos dentro do horário de funcionamento
            const horariosDisponiveis: string[] = [];
            
            for (let h = startHour; h < endHour; h++) {
              for (let m = 0; m < 60; m += 30) {
                const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const [hh, mm] = horario.split(':').map(Number);
                const inicio = hh * 60 + mm;
                const fim = inicio + servico.duracao;
                
                if (fim > endHour * 60) continue;
                
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

            (config?.horarios_extras || []).forEach((horarioExtra: string) => {
              const [hh, mm] = horarioExtra.split(':').map(Number);
              const inicio = hh * 60 + mm;
              const fim = inicio + servico.duracao;
              
              let isDisponivel = true;
              for (let t = inicio; t < fim; t += 30) {
                const slotCheck = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                if (slotsOcupados.has(slotCheck)) {
                  isDisponivel = false;
                  break;
                }
              }
              
              if (isDisponivel && !horariosDisponiveis.includes(horarioExtra)) {
                horariosDisponiveis.push(horarioExtra);
              }
            });
            
            horariosDisponiveis.sort();

            if (horariosDisponiveis.length > 0) {
              const [yyyy, mm, dd] = args.data.split('-');
              // Selecionar 2 horários aleatórios
              const horariosAleatorios = horariosDisponiveis
                .sort(() => Math.random() - 0.5)
                .slice(0, 2);
              resposta = `Desculpa amor, esse horário está fora do nosso funcionamento. Funcionamos das ${String(startHour).padStart(2, '0')}:00 às ${String(endHour).padStart(2, '0')}:00 nesse dia. Nesse dia temos ${horariosAleatorios[0]} ou ${horariosAleatorios[1]} disponíveis. Qual deles seria melhor pra você? Ou prefere outro dia? 💜`;
            } else {
              resposta = `Desculpa amor, esse horário está fora do nosso funcionamento. Funcionamos das ${String(startHour).padStart(2, '0')}:00 às ${String(endHour).padStart(2, '0')}:00 nesse dia, mas infelizmente já não temos horários disponíveis. Quer tentar outro dia? 💜`;
            }
            continue;
          }

          // Verificar disponibilidade
          let disponivel = true;
          for (let t = inicioMin; t < fimMin; t += 30) {
            const slot = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
            if (slotsOcupados.has(slot)) {
              disponivel = false;
              break;
            }
          }

          if (disponivel) {
            // Marcar disponibilidade verificada no contexto
            await supabase
              .from('bot_conversas')
              .update({ 
                contexto: { 
                  ...novoContexto, 
                  disponibilidade_verificada: true,
                  servico_nome: args.servico_nome,
                  data: args.data,
                  horario: args.horario
                }
              })
              .eq('id', conversa.id);

            const [yyyy, mm, dd] = args.data.split('-');
            resposta = `Ótima notícia! O horário de ${args.horario} está disponível para ${args.servico_nome} no dia ${dd}/${mm}! 🎉 Agora só preciso do seu nome completo e data de nascimento (DD/MM/AAAA) para confirmar o agendamento, pode me passar? 💜`;
          } else {
            // Gerar horários alternativos
            const horariosDisponiveis: string[] = [];
            
            for (let h = startHour; h < endHour; h++) {
              for (let m = 0; m < 60; m += 30) {
                const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const [hh, mm] = horario.split(':').map(Number);
                const inicio = hh * 60 + mm;
                const fim = inicio + servico.duracao;
                
                if (fim > endHour * 60) continue;
                
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

            (config?.horarios_extras || []).forEach((horarioExtra: string) => {
              const [hh, mm] = horarioExtra.split(':').map(Number);
              const inicio = hh * 60 + mm;
              const fim = inicio + servico.duracao;
              
              let isDisponivel = true;
              for (let t = inicio; t < fim; t += 30) {
                const slotCheck = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                if (slotsOcupados.has(slotCheck)) {
                  isDisponivel = false;
                  break;
                }
              }
              
              if (isDisponivel && !horariosDisponiveis.includes(horarioExtra)) {
                horariosDisponiveis.push(horarioExtra);
              }
            });
            
            horariosDisponiveis.sort();

            if (horariosDisponiveis.length > 0) {
              const [yyyy, mm, dd] = args.data.split('-');
              // Selecionar 2 horários aleatórios diferentes para cada cliente
              const horariosAleatorios = horariosDisponiveis
                .sort(() => Math.random() - 0.5)
                .slice(0, 2);
              const sugestoes = horariosAleatorios.join(' ou ');
              resposta = `Desculpa amor, ${args.horario} não está disponível para ${args.servico_nome} (${servico.duracao}min de duração). Temos ${horariosAleatorios[0]} ou ${horariosAleatorios[1]} disponíveis em ${dd}/${mm}. Qual prefere? 💜`;
            } else {
              resposta = `Infelizmente esse dia não tem horários disponíveis para ${args.servico_nome}. Quer tentar outro dia, querida? 💜`;
            }
          }
          continue;
        }

        if (toolCall.function.name === 'consultar_agendamento') {
          console.log('🔍 Consultando agendamento...');
          
          const { data: agendamentosAtivos } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('cliente_telefone', telefone)
            .neq('status', 'Cancelado')
            .order('data', { ascending: true })
            .order('horario', { ascending: true });

          if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            resposta = 'Você não tem nenhum agendamento ativo no momento, amor. Quer agendar algo? 💜';
          } else {
            const agendamento = agendamentosAtivos[0];
            const [yyyy, mm, dd] = agendamento.data.split('-');
            resposta = `Encontrei seu agendamento: ${agendamento.servico_nome} no dia ${dd}/${mm}/${yyyy} às ${agendamento.horario}. 💜`;
          }
          continue;
        }

        if (toolCall.function.name === 'cancelar_agendamento') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('❌ Cancelando agendamento...');

          const { data: agendamentosAtivos } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('cliente_telefone', telefone)
            .neq('status', 'Cancelado')
            .order('data', { ascending: true })
            .limit(1);

          if (!agendamentosAtivos || agendamentosAtivos.length === 0) {
            resposta = 'Você não tem nenhum agendamento ativo para cancelar, amor. 💜';
            continue;
          }

          const agendamento = agendamentosAtivos[0];
          
          // Verificar se está dentro do prazo (24 horas / 1 dia antes)
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const dataAgendamento = new Date(agendamento.data + 'T00:00:00');
          const diasRestantes = Math.floor((dataAgendamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          if (diasRestantes < 1) {
            resposta = `Desculpa amor, mas não é possível cancelar com menos de 24 horas de antecedência. Seu agendamento é daqui ${diasRestantes} dia(s). Entre em contato direto para casos especiais. 💜`;
            continue;
          }

          if (args.confirmar) {
            const { error } = await supabase
              .from('agendamentos')
              .update({ status: 'Cancelado' })
              .eq('id', agendamento.id);

            if (error) {
              console.error('Erro ao cancelar:', error);
              resposta = 'Ops, tive um problema ao cancelar. Pode tentar novamente? 💜';
            } else {
              const [yyyy, mm, dd] = agendamento.data.split('-');
              resposta = `Agendamento cancelado com sucesso! Era ${agendamento.servico_nome} no dia ${dd}/${mm}/${yyyy} às ${agendamento.horario}. Espero te ver em breve! 💜`;
              
              // Limpar contexto após cancelamento
              await supabase
                .from('bot_conversas')
                .update({ contexto: {} })
                .eq('id', conversa.id);
            }
          }
          continue;
        }

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

          // Verificar se é domingo ou segunda (dias fechados)
          const dataAgendamento = new Date(args.data + 'T12:00:00');
          const dayOfWeek = dataAgendamento.getDay();
          
          if (dayOfWeek === 0) {
            resposta = 'Desculpa amor, não funcionamos aos domingos. Pode escolher outra data? 💜';
            continue;
          }
          
          if (dayOfWeek === 1) {
            resposta = 'Desculpa amor, não funcionamos às segundas-feiras. Pode escolher outra data? 💜';
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

          // Gerar todos os slots ocupados (excluindo agendamentos da própria pessoa)
          const { data: agendamentosExistentes } = await supabase
            .from('agendamentos')
            .select('horario, servico_id, servico_nome')
            .eq('data', args.data)
            .neq('status', 'Cancelado')
            .neq('cliente_telefone', telefone); // Ignorar agendamentos da própria pessoa ao verificar disponibilidade

          const slotsOcupados = new Set<string>();
          
          // Adicionar slots bloqueados por agendamentos existentes
          (agendamentosExistentes || []).forEach((ag: any) => {
            // Tentar encontrar serviço pelo ID primeiro
            let servicoAg = servicos?.find(s => s.id === ag.servico_id);
            
            // Fallback: buscar pelo nome se não encontrou pelo ID
            if (!servicoAg && ag.servico_nome) {
              const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              const nomeAlvo = normalize(ag.servico_nome.split(',')[0]); // Pegar primeiro serviço se houver múltiplos
              servicoAg = servicos?.find(s => normalize(s.nome).includes(nomeAlvo) || nomeAlvo.includes(normalize(s.nome)));
            }
            
            // Usar duração do serviço encontrado OU duração padrão de 60min
            const duracao = servicoAg?.duracao || 60;
            
            const [h, m] = ag.horario.split(':').map(Number);
            const inicioMin = h * 60 + m;
            const fimMin = inicioMin + duracao;
            
            console.log(`🔒 Bloqueando slot ao criar: ${ag.horario} (serviço: ${ag.servico_nome || 'sem nome'}, duração: ${duracao}min)`);
            
            for (let t = inicioMin; t < fimMin; t += 30) {
              const hh = String(Math.floor(t / 60)).padStart(2, '0');
              const mm = String(t % 60).padStart(2, '0');
              slotsOcupados.add(`${hh}:${mm}`);
            }
          });

          // Adicionar slots bloqueados manualmente
          (config?.horarios_bloqueados || []).forEach((h: string) => slotsOcupados.add(h));

          // Verificar se o horário solicitado está dentro do horário de funcionamento
          const [h, m] = args.horario.split(':').map(Number);
          const inicioMin = h * 60 + m;
          const fimMin = inicioMin + servico.duracao;
          
          // Determinar horários de funcionamento do dia
          let startHour = 8;
          let endHour = 13;
          
          if (dayOfWeek === 2 || dayOfWeek === 3) { // Terça e Quarta
            startHour = 13;
            endHour = 20;
          } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
            startHour = 9;
            endHour = 19;
          } else if (dayOfWeek === 6) { // Sábado
            startHour = 8;
            endHour = 13;
          }
          
          // Verificar se está dentro do horário de funcionamento
          const startMin = startHour * 60;
          const endMin = endHour * 60;
          
          if (inicioMin < startMin || fimMin > endMin) {
            resposta = `Desculpa amor, esse horário está fora do nosso funcionamento. Funcionamos das ${String(startHour).padStart(2, '0')}:00 às ${String(endHour).padStart(2, '0')}:00 nesse dia. Pode escolher outro horário? 💜`;
            continue;
          }

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
            // Determinar horários de funcionamento do dia
            const dayOfWeek = dataAgendamento.getDay();
            let startHour = 8;
            let endHour = 13;
            
            // Segunda (1): Fechado
            // Terça (2) e Quarta (3): 13:00 às 20:00
            // Quinta (4) e Sexta (5): 09:00 às 19:00
            // Sábado (6): 08:00 às 13:00
            // Domingo (0): Fechado
            
            if (dayOfWeek === 1) { // Segunda
              resposta = 'Desculpa amor, não funcionamos às segundas-feiras. Pode escolher outro dia? 💜';
              continue;
            } else if (dayOfWeek === 2 || dayOfWeek === 3) { // Terça e Quarta
              startHour = 13;
              endHour = 20;
            } else if (dayOfWeek === 4 || dayOfWeek === 5) { // Quinta e Sexta
              startHour = 9;
              endHour = 19;
            } else if (dayOfWeek === 6) { // Sábado
              startHour = 8;
              endHour = 13;
            }
            
            // Gerar sugestões de horários disponíveis dentro do horário de funcionamento
            const horariosDisponiveis: string[] = [];
            
            for (let h = startHour; h < endHour; h++) {
              for (let m = 0; m < 60; m += 30) {
                const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const [hh, mm] = horario.split(':').map(Number);
                const inicio = hh * 60 + mm;
                const fim = inicio + servico.duracao;
                
                // Verificar se o serviço termina dentro do horário de funcionamento
                if (fim > endHour * 60) continue;
                
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
            
            // Incluir horários extras da config se houver
            (config?.horarios_extras || []).forEach((horarioExtra: string) => {
              const [hh, mm] = horarioExtra.split(':').map(Number);
              const inicio = hh * 60 + mm;
              const fim = inicio + servico.duracao;
              
              let isDisponivel = true;
              for (let t = inicio; t < fim; t += 30) {
                const slotCheck = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
                if (slotsOcupados.has(slotCheck)) {
                  isDisponivel = false;
                  break;
                }
              }
              
              if (isDisponivel && !horariosDisponiveis.includes(horarioExtra)) {
                horariosDisponiveis.push(horarioExtra);
              }
            });
            
            // Ordenar horários
            horariosDisponiveis.sort();

            if (horariosDisponiveis.length > 0) {
              const [yyyy, mm, dd] = args.data.split('-');
              // Selecionar 2 horários aleatórios diferentes para cada cliente
              const horariosAleatorios = horariosDisponiveis
                .sort(() => Math.random() - 0.5)
                .slice(0, 2);
              resposta = `Desculpa amor, ${args.horario} não está disponível para ${args.servico_nome} (${servico.duracao}min). Temos ${horariosAleatorios[0]} ou ${horariosAleatorios[1]} disponíveis em ${dd}/${mm}. Qual prefere? 💜`;
            } else {
              resposta = `Esse dia não tem horários disponíveis para ${args.servico_nome}. Pode escolher outro dia, querida? 💜`;
            }
            continue;
          }

          // Extrair data formatada do novo agendamento
          const [yyyy, mm, dd] = args.data.split('-');
          
          // Buscar agendamento anterior ativo para reagendamento (apenas agendamentos futuros ou de hoje)
          const dataHoje = new Date().toISOString().split('T')[0];
          console.log('📅 Data de hoje:', dataHoje, '| Data novo agendamento:', args.data);
          
          // PRIMEIRO: Verificar se horário já está ocupado (por qualquer cliente)
          const { data: horarioOcupado } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('data', args.data)
            .eq('horario', args.horario)
            .neq('status', 'Cancelado')
            .maybeSingle();
          
          if (horarioOcupado) {
            console.log('⚠️ Horário já ocupado - não pode criar agendamento');
            resposta = `Desculpa amor, ${args.horario} já está ocupado! 😔 Pode escolher outro horário disponível? 💜`;
            continue;
          }
          
          // SEGUNDO: Buscar qualquer agendamento anterior diferente para reagendamento
          const { data: agendamentoAnterior, error: erroConsulta } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('cliente_telefone', telefone)
            .neq('status', 'Cancelado')
            .gte('data', dataHoje)
            .order('data', { ascending: true })
            .order('horario', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          console.log('🔍 Busca agendamento anterior - telefone:', telefone);
          console.log('🔍 Resultado:', agendamentoAnterior);
          console.log('🔍 Erro na consulta:', erroConsulta);

          let observacoesReagendamento = null;
          
          // Se há agendamento anterior, é um reagendamento
          if (agendamentoAnterior && agendamentoAnterior.id) {
            const [yyyyAnt, mmAnt, ddAnt] = agendamentoAnterior.data.split('-');
            observacoesReagendamento = `Reagendado de ${ddAnt}/${mmAnt}/${yyyyAnt} às ${agendamentoAnterior.horario}`;
            
            console.log('🗑️ INICIANDO DELETE do agendamento:', {
              id: agendamentoAnterior.id,
              cliente: agendamentoAnterior.cliente_nome,
              data: agendamentoAnterior.data,
              horario: agendamentoAnterior.horario
            });
            
            // Deletar agendamento anterior usando service_role que bypassa RLS
            const { data: deleteResult, error: erroDelete } = await supabase
              .from('agendamentos')
              .delete()
              .eq('id', agendamentoAnterior.id)
              .select();
            
            if (erroDelete) {
              console.error('❌ ERRO ao deletar agendamento:', erroDelete);
              console.error('❌ Detalhes do erro:', JSON.stringify(erroDelete));
            } else {
              console.log('✅ DELETE executado com sucesso!');
              console.log('✅ Linhas deletadas:', deleteResult);
            }
            
            // Verificar se realmente foi deletado
            const { data: verificacao } = await supabase
              .from('agendamentos')
              .select('id')
              .eq('id', agendamentoAnterior.id)
              .maybeSingle();
            
            if (verificacao) {
              console.error('⚠️ ATENÇÃO: Agendamento ainda existe no banco após delete!');
            } else {
              console.log('✅ CONFIRMADO: Agendamento foi removido do banco');
            }
          } else {
            console.log('ℹ️ Nenhum agendamento anterior encontrado - primeiro agendamento');
          }

          // Usar telefone fornecido pelo cliente ou telefone do WhatsApp como fallback
          const telefoneCliente = args.telefone || telefone;
          
          // Buscar cliente pelo telefone fornecido
          const { data: clienteBuscado } = await supabase
            .from('clientes')
            .select('*')
            .eq('telefone', telefoneCliente)
            .maybeSingle();

          // Converter data de nascimento de DD/MM/AAAA para YYYY-MM-DD se fornecida
          let dataNascimentoFormatada = clienteBuscado?.data_nascimento; // Usar data existente como padrão
          if (args.data_nascimento) {
            const [dia, mes, ano] = args.data_nascimento.split('/');
            dataNascimentoFormatada = `${ano}-${mes}-${dia}`;
          }

          let clienteId = clienteBuscado?.id;

          if (clienteBuscado) {
            // Atualizar cliente existente apenas se houver novos dados
            await supabase
              .from('clientes')
              .update({
                nome: args.cliente_nome || clienteBuscado.nome,
                data_nascimento: dataNascimentoFormatada,
              })
              .eq('id', clienteBuscado.id);
          } else {
            // Criar novo cliente com telefone fornecido
            const { data: novoCliente } = await supabase
              .from('clientes')
              .insert({
                nome: args.cliente_nome,
                telefone: telefoneCliente,
                data_nascimento: dataNascimentoFormatada,
              })
              .select()
              .single();
            clienteId = novoCliente?.id;
          }

          // Criar novo agendamento com telefone fornecido pelo cliente
          const { data: novoAgendamento, error: erroAgendamento } = await supabase
            .from('agendamentos')
            .insert({
              servico_id: args.servico_id,
              servico_nome: args.servico_nome,
              data: args.data,
              horario: args.horario,
              cliente_nome: args.cliente_nome,
              cliente_telefone: telefoneCliente,
              cliente_id: clienteId,
              status: 'Confirmado',
              origem: 'bot',
              bot_conversa_id: conversa.id,
              instancia: instancia || 'default',
              observacoes: observacoesReagendamento,
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
          const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
          const diaSemana = diasSemana[dataAgendamento.getUTCDay()];
          
          resposta = `Perfeito! ${args.servico_nome} agendado para ${dd}/${mm} (${diaSemana}) às ${args.horario}. Te aguardo, ${args.cliente_nome.split(' ')[0]}! 💜✨`;

          // Limpar contexto e salvar nome do cliente
          await supabase
            .from('bot_conversas')
            .update({ 
              contexto: {},
              cliente_nome: args.cliente_nome, 
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

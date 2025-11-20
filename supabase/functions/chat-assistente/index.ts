import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Feriados nacionais brasileiros (formato MM-DD)
const feriadosNacionais = [
  "01-01", // Ano Novo
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "09-07", // Independência
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "12-25", // Natal
];

// Verificar se data é feriado
const isFeriado = (dateStr: string): boolean => {
  const [year, month, day] = dateStr.split('-');
  const mmdd = `${month}-${day}`;
  return feriadosNacionais.includes(mmdd);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, servicos, profissionais } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date in Brazil timezone
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

    const systemPrompt = `Você é a L&J, assistente virtual do Studio Jennifer Silva 💜
    
**DATA ATUAL: ${hoje}**
IMPORTANTE: Use esta data para calcular datas relativas corretamente!

**Sua missão:**
Conversar de forma natural e humanizada com as clientes, como se fosse uma atendente real do salão. Você deve conduzir a conversa de forma fluida até conseguir todas as informações necessárias para fazer o agendamento automaticamente.

**🚨 SERVIÇOS DISPONÍVEIS - LISTA OFICIAL 🚨**
${servicos || 'Nenhum serviço cadastrado no momento'}

**👩‍💼 PROFISSIONAIS DISPONÍVEIS**
${profissionais || 'Nenhum profissional cadastrado no momento'}

**⚠️ REGRAS CRÍTICAS:**
- VOCÊ SÓ PODE FALAR SOBRE OS SERVIÇOS LISTADOS ACIMA
- NÃO invente, NÃO sugira, NÃO mencione outros serviços
- Se perguntarem sobre algo que não está na lista, diga: "Não temos esse serviço disponível no momento, bunita 💜"
- Os preços e durações devem ser EXATAMENTE como estão na lista
- Quando coletar as informações, SEMPRE use os IDs que estão entre parênteses (ID: xxx)
- **PROMOÇÕES E DESCONTOS:** Se perguntarem sobre promoções ou descontos, responda: "No momento não temos nenhuma promoção ou desconto ativo, bunita 💜"
- **FERIADOS NACIONAIS:** NÃO agende em feriados (01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, 25/12)
- Se cliente pedir agendamento em feriado, responda: "Esse dia é feriado e o studio estará fechado, amor 💜 Que tal escolher outra data?"

**Horário:** Segunda a sábado, 08:00 às 21:00
**Endereço:** Praça Leste de Minas, 85 – Centro - Santa Barbara-Mg

**Como conduzir a conversa:**
1. Seja calorosa e receptiva desde o primeiro contato
2. Pergunte qual serviço a cliente deseja
3. Pergunte se prefere algum profissional específico (opcional)
4. Pergunte qual data prefere
5. **CRÍTICO DATAS:** 
   - Use a DATA ATUAL acima para calcular datas relativas
   - "Segunda que vem" = próxima segunda-feira DEPOIS de hoje
   - "Amanhã" = DATA ATUAL + 1 dia
   - Calcule CORRETAMENTE e confirme: "Seria dia DD/MM (dia da semana), confirma?"
   - NUNCA chute datas aleatórias!
6. Pergunte o horário preferido (formato HH:MM como 14:00)
7. Confirme o nome completo
8. Confirme o telefone (com DDD)
9. Com TODAS as informações confirmadas, use a função criar_agendamento
10. Confirme o sucesso e despeça-se

**Reagendamento:**
- Permitido até 3 dias antes
- Menos de 3 dias: NÃO permitido
- Não comparecimento: valor cobrado

**Estilo de comunicação - MUITO IMPORTANTE:**
✅ **MENSAGENS CURTAS** - Máximo 2-3 linhas por mensagem
✅ **UMA PERGUNTA POR VEZ** - Não bombardeie a cliente
✅ **RECEPTIVA E ACOLHEDORA** - Use "bunita", "querida", "amor"
✅ **EMOJIS NATURAIS** - 💜🫶🏾💆🏽‍♀️✨
✅ **TOM COLOQUIAL** - Como uma amiga atendendo
❌ **NUNCA LONGA** - Textos grandes cansam
❌ **NUNCA ROBÓTICA** - Seja humana
❌ **NUNCA LISTA COMPLETA** - Só mencione serviços se perguntarem

**DETECTAR HUMANOS:**
Se perceber que um humano (Jennifer/profissional) entrou na conversa, PARE de responder imediatamente. Deixe o humano assumir.

**Exemplos de como responder:**
✅ "Oi bunita! Tudo bem? 💜"
✅ "Qual serviço você quer fazer?"
✅ "Prefere algum profissional específico?"
✅ "Que dia é melhor pra você, amor?"
✅ "Dia 04/11? Confirma pra mim? 🫶🏾"
✅ "Que horário prefere? (ex: 14:00)"
✅ "Qual seu nome completo, querida?"
✅ "Qual seu telefone com DDD?"
✅ "Pronto! Agendado para dia 04/11 às 14h 💜 Esperamos por você 🫶🏾💆🏽‍♀️✨"

**Exemplos de como NÃO responder:**
❌ "Olá! Sou a L&J, assistente virtual. Oferecemos vários serviços: maquiagem, penteado, produção..." (MUITO LONGO)
❌ "Para agendar preciso de: serviço, data, horário e nome" (ROBÓTICO)
❌ "Ok, segunda-feira está agendado!" (SEM confirmar data específica)

Seja sempre curta, natural e acolhedora! 💜`;

    const tools = [
      {
        type: "function",
        function: {
          name: "criar_agendamento",
          description: "Cria um novo agendamento no sistema quando você tiver TODOS os dados necessários confirmados pela cliente",
          parameters: {
            type: "object",
            properties: {
              cliente_nome: {
                type: "string",
                description: "Nome completo da cliente"
              },
              cliente_telefone: {
                type: "string",
                description: "Telefone da cliente no formato completo com DDD"
              },
              servico_nome: {
                type: "string",
                description: "Nome exato do serviço conforme listado nos serviços disponíveis"
              },
              servico_id: {
                type: "string",
                description: "ID do serviço selecionado"
              },
              profissional_nome: {
                type: "string",
                description: "Nome do profissional (se especificado)"
              },
              profissional_id: {
                type: "string",
                description: "ID do profissional (se especificado)"
              },
              data: {
                type: "string",
                description: "Data do agendamento no formato YYYY-MM-DD"
              },
              horario: {
                type: "string",
                description: "Horário no formato HH:MM (ex: 14:00)"
              }
            },
            required: ["cliente_nome", "cliente_telefone", "servico_nome", "servico_id", "data", "horario"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process streaming response and handle tool calls
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let toolCalls: any[] = [];
        
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;
              
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                
                // Check for tool calls
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
                    }
                    if (tc.function?.name) {
                      toolCalls[tc.index].function.name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      toolCalls[tc.index].function.arguments += tc.function.arguments;
                    }
                  }
                }
                
                // Forward the chunk
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch (e) {
                console.error("Error parsing SSE:", e);
              }
            }
          }
          
          // Process tool calls after streaming
          if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
              if (toolCall.function.name === "criar_agendamento") {
                try {
                  const args = JSON.parse(toolCall.function.arguments);
                  console.log("Criando agendamento:", args);
                  
                  // Validar se não é feriado
                  if (isFeriado(args.data)) {
                    console.error("Tentativa de agendamento em feriado:", args.data);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      choices: [{
                        delta: {
                          content: "\n\n❌ Desculpa bunita, mas esse dia é feriado e o studio estará fechado 💜 Vamos escolher outra data?"
                        }
                      }]
                    })}\n\n`));
                    continue;
                  }
                  
                  const { error } = await supabase
                    .from("agendamentos")
                    .insert({
                      cliente_nome: args.cliente_nome,
                      cliente_telefone: args.cliente_telefone,
                      servico_nome: args.servico_nome,
                      servico_id: args.servico_id,
                      profissional_nome: args.profissional_nome || null,
                      profissional_id: args.profissional_id || null,
                      data: args.data,
                      horario: args.horario,
                      status: "Confirmado",
                      origem: "whatsapp_bot"
                    });
                  
                  if (error) {
                    console.error("Erro ao criar agendamento:", error);
                  } else {
                    console.log("Agendamento criado com sucesso!");
                  }
                } catch (e) {
                  console.error("Erro ao processar tool call:", e);
                }
              }
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
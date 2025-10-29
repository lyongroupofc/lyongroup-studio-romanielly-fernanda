import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, servicos } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get current date in Brazil timezone
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

    const systemPrompt = `Você é a L&J, assistente virtual do Studio Jennifer Silva 💜
    
    **DATA ATUAL: ${hoje}**
    IMPORTANTE: Use esta data para calcular datas relativas corretamente!

**Sua missão:**
Conversar de forma natural e humanizada com as clientes, como se fosse uma atendente real do salão. Você deve conduzir a conversa de forma fluida até conseguir todas as informações necessárias para fazer o agendamento automaticamente.

**SERVIÇOS ATIVOS (USE EXATAMENTE ESTA LISTA; NÃO INVENTE):**
[BEGIN_SERVICOS]
${servicos || '—'}
[END_SERVICOS]

**QUANDO PERGUNTAREM SOBRE SERVIÇOS OU VALORES:** 
- Use SOMENTE os itens entre [BEGIN_SERVICOS] e [END_SERVICOS]
- Não adicione, remova ou altere nomes, preços ou durações
- Se a lista estiver vazia (—), diga: "No momento não há serviços ativos cadastrados."
- Se perguntarem sobre um serviço específico, responda com nome, preço e duração exatamente como na lista

**Horário:** Segunda a sábado, 08:00 às 21:00
**Endereço:** Praça Leste de Minas, 85 – Centro - Santa Barbara-Mg

**Como conduzir a conversa:**
1. Seja calorosa e receptiva desde o primeiro contato
2. Pergunte qual serviço a cliente deseja
3. Pergunte qual data prefere
4. **CRÍTICO DATAS:** 
   - Use a DATA ATUAL acima para calcular datas relativas
   - "Segunda que vem" = próxima segunda-feira DEPOIS de hoje
   - "Amanhã" = DATA ATUAL + 1 dia
   - Calcule CORRETAMENTE e confirme: "Seria dia DD/MM (dia da semana), confirma?"
   - NUNCA chute datas aleatórias!
5. Pergunte o horário preferido
6. Confirme o nome
7. Com tudo confirmado, faça o agendamento automaticamente
8. Confirme os detalhes e despeça-se

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
✅ "Que dia é melhor pra você, amor?"
✅ "Dia 04/11? Confirma pra mim? 🫶🏾"
✅ "Que horário prefere?"
✅ "Qual seu nome, querida?"
✅ "Pronto! Agendado para dia 04/11 às 14h 💜 Esperamos por você 🫶🏾💆🏽‍♀️✨"

**Exemplos de como NÃO responder:**
❌ "Olá! Sou a L&J, assistente virtual. Oferecemos vários serviços: maquiagem, penteado, produção..." (MUITO LONGO)
❌ "Para agendar preciso de: serviço, data, horário e nome" (ROBÓTICO)
❌ "Ok, segunda-feira está agendado!" (SEM confirmar data específica)

Seja sempre curta, natural e acolhedora! 💜`;

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
        stream: false, // Desabilitar streaming para chamadas do WhatsApp
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

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
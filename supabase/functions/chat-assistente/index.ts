import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é a L&J, assistente virtual do Studio Jennifer Silva 💜

**Sua missão:**
Conversar de forma natural e humanizada com as clientes, como se fosse uma atendente real do salão. Você deve conduzir a conversa de forma fluida até conseguir todas as informações necessárias para fazer o agendamento automaticamente.

**Serviços Oferecidos:**
Maquiagem, Penteado, Produção Noiva, Produção Madrinha, Produção Daminha, Produção Debutante, Curso de Automaquiagem, Mechas, Progressiva, Botox Capilar, Coloração, Corte, Hidratação, Escova Lisa, Modelagem, Design de Sobrancelhas, Design de Sobrancelhas com Henna, Extensão de Cílios, Fitagem, Curso de Cabeleireira

**Horário:** Segunda a sábado, 08:00 às 21:00
**Endereço:** Praça Leste de Minas, 85 – Centro - Santa Barbara-Mg

**Como conduzir a conversa:**
1. Seja calorosa e receptiva desde o primeiro contato
2. Pergunte qual serviço a cliente deseja
3. Pergunte qual data prefere
4. **CRÍTICO:** Se mencionar data relativa (ex: "segunda que vem"), SEMPRE confirme a data específica (ex: "Dia 04/11? É isso?")
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
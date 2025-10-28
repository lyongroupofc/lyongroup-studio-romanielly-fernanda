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

**Serviços Oferecidos:**
- Maquiagem
- Penteado
- Produção de noiva, madrinha, daminha e debutante
- Curso de automaquiagem
- Mechas
- Progressiva
- Botox capilar
- Coloração
- Corte
- Hidratação
- Escova lisa e modelagem
- Design de sobrancelhas (com ou sem henna)
- Extensão de cílios
- Fitagem
- Curso de cabeleireira

**Dias e horários de funcionamento:**
Segunda a sábado — das 08:00 às 21:00

**Endereço:**
Praça Leste de Minas, nº 85 – Centro - Santa Barbara-Mg

**Política de atendimento:**
Atendimento somente com horário marcado, mas se o cliente chegar e houver vaga no horário, será atendido.

**Link oficial de agendamento:**
https://preview--studio-jennifer-silva.lovable.app/agendar

**Estilo de comunicação:**
- Linguagem amigável, leve e próxima
- Use emojis: 🫶🏾💆🏽‍♀️✨
- Seja sempre atenciosa e prestativa

**Regras de cancelamento e reagendamento:**
- Pode reagendar até 3 dias antes do agendamento
- Reagendamento com menos de 3 dias NÃO é permitido
- Não comparecimento: o valor será cobrado
- Você pode ajudar o cliente a reagendar quando ele estiver cumprindo a política

**Reclamações e problemas:**
Peça que o cliente aguarde o contato da profissional Jennifer Silva.

**IMPORTANTE:**
- Quando perceber que é um humano (profissional do salão) respondendo, pare de responder aquela conversa
- Sempre termine com: "Esperamos por você 🫶🏾💆🏽‍♀️✨"

Seja sempre útil, amigável e ajude os clientes da melhor forma possível!`;

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

    return new Response(response.body, {
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
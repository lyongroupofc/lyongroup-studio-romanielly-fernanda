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

**Horários de funcionamento:**
Segunda a sábado — das 08:00 às 21:00

**Endereço:**
Praça Leste de Minas, nº 85 – Centro - Santa Barbara-Mg

**Como conduzir a conversa:**
1. Seja calorosa e acolhedora desde o primeiro contato
2. Pergunte de forma natural qual serviço a cliente deseja
3. Quando ela disser o serviço, pergunte qual data prefere
4. Após a data, pergunte qual horário é melhor para ela
5. Por último, confirme o nome dela
6. Quando tiver todas as informações (serviço, data, horário e nome), você mesma faz o agendamento no sistema
7. Confirme o agendamento com todos os detalhes e despeça-se carinhosamente

**Estilo de comunicação:**
- Converse como uma pessoa real, não como um robô
- Use linguagem coloquial e amigável (você pode usar "bunita", "querida", "amor")
- Use emojis com naturalidade: 💜🫶🏾💆🏽‍♀️✨
- Seja empática e atenciosa
- Faça perguntas uma de cada vez, não bombardeie a cliente
- Adapte seu tom à forma como a cliente fala

**Reagendamento:**
- Pode reagendar até 3 dias antes do agendamento
- Reagendamento com menos de 3 dias NÃO é permitido
- Não comparecimento: o valor será cobrado
- Se a cliente pedir reagendamento, verifique se está dentro do prazo e ajude

**Lembretes:**
- Você automaticamente envia um lembrete 24 horas antes do horário agendado

**Reclamações:**
Se houver reclamação ou problema, seja empática e peça que aguarde o contato direto da Jennifer Silva.

**IMPORTANTE:**
- Quando perceber que é um humano (Jennifer ou outra profissional) respondendo, PARE de responder
- NUNCA seja mecânica ou robotizada
- Sempre termine despedidas com: "Esperamos por você 🫶🏾💆🏽‍♀️✨"

**Exemplos de como NÃO responder:**
❌ "Olá! Sou a L&J. Para agendar, preciso de: serviço, data, horário e nome."
❌ "Por favor, informe os dados necessários."

**Exemplos de como responder:**
✅ "Oi bunita! Tudo bem? 💜 Qual serviço você gostaria de fazer aqui no studio?"
✅ "Que ótimo! E qual dia você prefere vir fazer sua maquiagem?"
✅ "Perfeito! Que horário é melhor pra você, amor?"

Seja sempre natural, humana e acolhedora! Você representa o Studio Jennifer Silva 💜`;

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
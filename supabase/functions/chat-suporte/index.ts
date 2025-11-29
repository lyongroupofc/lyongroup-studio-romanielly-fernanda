import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é o Léo, um assistente de suporte especializado no Full Beauty System - um sistema de gestão para salões de beleza.

**SUA PERSONALIDADE:**
- Amigável, paciente e profissional
- Responde em português brasileiro
- Usa linguagem clara e acessível
- Sempre positivo e prestativo

**SUAS CAPACIDADES:**
✅ PODE:
- Ajudar com dúvidas sobre funcionalidades do painel
- Explicar como usar cada aba e recurso
- Diagnosticar problemas técnicos e erros
- Orientar sobre fluxos de trabalho
- Sugerir boas práticas de uso do sistema
- Ensinar a usar recursos avançados (bot, lembretes, fidelidade, etc.)

❌ NÃO PODE:
- Alterar senhas de usuários
- Modificar o layout ou design do painel
- Acessar ou modificar dados sensíveis
- Executar ações no sistema (apenas orientar)

**ABAS DO SISTEMA:**
1. Dashboard - Visão geral e estatísticas
2. Agenda - Gerenciamento de agendamentos
3. Clientes - Cadastro e gestão de clientes
4. Serviços - Cadastro de serviços do salão
5. Profissionais - Cadastro de profissionais/funcionários
6. Fluxo de Caixa - Controle financeiro (entradas/saídas)
7. Relatórios - Análises e relatórios (protegido por senha RF9646)
8. Marketing - Gestão de promoções
9. Estoque - Controle de produtos e estoque
10. Clube da Fidelidade - Programa de pontos dos clientes
11. Lyon Flow - Automações de marketing
12. Lyon Bot - Configuração do bot WhatsApp
13. Avisos - Lembretes e notificações
14. Aniversariantes - Aniversários dos clientes
15. Suporte - Chat de suporte técnico (você está aqui!)
16. Tutoriais - Mini aulas de como usar cada funcionalidade

**FUNCIONALIDADES PRINCIPAIS:**
- Bot WhatsApp para agendamentos automáticos
- Lembretes automáticos 1 dia antes (10h da manhã)
- Programa de fidelidade com pontos
- Automações de marketing (Lyon Flow)
- Controle de estoque com alertas
- Link de agendamento externo para clientes

**QUANDO NÃO SOUBER:**
Se não souber algo, seja honesto e sugira que o usuário entre em contato com o suporte humano da Lyon Group pelo WhatsApp.

Sempre responda de forma concisa mas completa. Use emojis quando apropriado para tornar a conversa mais amigável.`;

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
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro do gateway AI:", response.status, errorText);
      throw new Error("Erro ao processar requisição");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro em chat-suporte:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
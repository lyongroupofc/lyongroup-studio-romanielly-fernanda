import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ferramentas que o Léo pode usar
const tools = [
  {
    type: "function",
    function: {
      name: "listar_agendamentos",
      description: "Lista agendamentos de uma data específica ou de um cliente",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD (opcional)" },
          cliente_nome: { type: "string", description: "Nome do cliente para buscar (opcional)" },
          telefone: { type: "string", description: "Telefone do cliente (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelar_agendamento",
      description: "Cancela um agendamento específico pelo ID",
      parameters: {
        type: "object",
        properties: {
          agendamento_id: { type: "string", description: "ID do agendamento a cancelar" },
          motivo: { type: "string", description: "Motivo do cancelamento (opcional)" },
        },
        required: ["agendamento_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reagendar_agendamento",
      description: "Reagenda um agendamento para nova data e/ou horário",
      parameters: {
        type: "object",
        properties: {
          agendamento_id: { type: "string", description: "ID do agendamento" },
          nova_data: { type: "string", description: "Nova data no formato YYYY-MM-DD" },
          novo_horario: { type: "string", description: "Novo horário no formato HH:MM" },
        },
        required: ["agendamento_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_agendamento",
      description: "Cria um novo agendamento",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Nome do cliente" },
          cliente_telefone: { type: "string", description: "Telefone do cliente" },
          servico_nome: { type: "string", description: "Nome do serviço" },
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          horario: { type: "string", description: "Horário no formato HH:MM" },
          profissional_nome: { type: "string", description: "Nome do profissional (opcional)" },
        },
        required: ["cliente_nome", "cliente_telefone", "servico_nome", "data", "horario"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_clientes",
      description: "Lista clientes cadastrados, podendo filtrar por nome ou telefone",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente para buscar (opcional)" },
          telefone: { type: "string", description: "Telefone do cliente (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_cliente",
      description: "Edita dados de um cliente",
      parameters: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          nome: { type: "string", description: "Novo nome (opcional)" },
          telefone: { type: "string", description: "Novo telefone (opcional)" },
          email: { type: "string", description: "Novo email (opcional)" },
          data_nascimento: { type: "string", description: "Nova data de nascimento YYYY-MM-DD (opcional)" },
        },
        required: ["cliente_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_servicos",
      description: "Lista todos os serviços disponíveis",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_servico",
      description: "Edita um serviço existente",
      parameters: {
        type: "object",
        properties: {
          servico_id: { type: "string", description: "ID do serviço" },
          nome: { type: "string", description: "Novo nome (opcional)" },
          preco: { type: "number", description: "Novo preço (opcional)" },
          duracao: { type: "number", description: "Nova duração em minutos (opcional)" },
          descricao: { type: "string", description: "Nova descrição (opcional)" },
        },
        required: ["servico_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ativar_desativar_bot",
      description: "Ativa ou desativa o bot WhatsApp",
      parameters: {
        type: "object",
        properties: {
          ativo: { type: "boolean", description: "true para ativar, false para desativar" },
        },
        required: ["ativo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_config_bot",
      description: "Atualiza configurações do bot WhatsApp",
      parameters: {
        type: "object",
        properties: {
          chave: { type: "string", description: "Nome da configuração (mensagem_boas_vindas, mensagem_ausencia, horario_funcionamento)" },
          valor: { type: "string", description: "Novo valor da configuração" },
        },
        required: ["chave", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_faturamento",
      description: "Consulta o faturamento de um período",
      parameters: {
        type: "object",
        properties: {
          periodo: { type: "string", enum: ["hoje", "mes", "ano"], description: "Período do faturamento" },
        },
        required: ["periodo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bloquear_horario",
      description: "Bloqueia um horário específico na agenda",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          horario: { type: "string", description: "Horário a bloquear no formato HH:MM" },
        },
        required: ["data", "horario"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "desbloquear_horario",
      description: "Desbloqueia um horário específico na agenda",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          horario: { type: "string", description: "Horário a desbloquear no formato HH:MM" },
        },
        required: ["data", "horario"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fechar_dia",
      description: "Fecha um dia inteiro na agenda (não permite agendamentos)",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          motivo: { type: "string", description: "Motivo do fechamento (opcional)" },
        },
        required: ["data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reabrir_dia",
      description: "Reabre um dia fechado na agenda",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
        },
        required: ["data"],
      },
    },
  },
];

// Funções para executar as ações
async function executarTool(supabase: any, toolName: string, args: any): Promise<string> {
  console.log(`[Léo] Executando tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "listar_agendamentos": {
        let query = supabase
          .from("agendamentos")
          .select("*")
          .not("status", "in", "(Cancelado,Excluido)")
          .order("horario", { ascending: true });

        if (args.data) {
          query = query.eq("data", args.data);
        }
        if (args.cliente_nome) {
          query = query.ilike("cliente_nome", `%${args.cliente_nome}%`);
        }
        if (args.telefone) {
          query = query.ilike("cliente_telefone", `%${args.telefone}%`);
        }

        const { data, error } = await query.limit(20);
        if (error) throw error;

        if (!data || data.length === 0) {
          return "Nenhum agendamento encontrado com os filtros informados.";
        }

        return `Encontrados ${data.length} agendamento(s):\n${data.map((a: any) => 
          `- ${a.data} às ${a.horario}: ${a.cliente_nome} - ${a.servico_nome} (ID: ${a.id.slice(0,8)}...)`
        ).join("\n")}`;
      }

      case "cancelar_agendamento": {
        const { data: agendamento, error: fetchError } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("id", args.agendamento_id)
          .single();

        if (fetchError || !agendamento) {
          return `Agendamento não encontrado com ID: ${args.agendamento_id}`;
        }

        const { error } = await supabase
          .from("agendamentos")
          .update({ 
            status: "Cancelado",
            observacoes: agendamento.observacoes 
              ? `${agendamento.observacoes}\n[Cancelado via Suporte Léo: ${args.motivo || "Sem motivo informado"}]`
              : `[Cancelado via Suporte Léo: ${args.motivo || "Sem motivo informado"}]`
          })
          .eq("id", args.agendamento_id);

        if (error) throw error;
        return `✅ Agendamento cancelado com sucesso!\nCliente: ${agendamento.cliente_nome}\nData: ${agendamento.data} às ${agendamento.horario}\nServiço: ${agendamento.servico_nome}`;
      }

      case "reagendar_agendamento": {
        const { data: agendamento, error: fetchError } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("id", args.agendamento_id)
          .single();

        if (fetchError || !agendamento) {
          return `Agendamento não encontrado com ID: ${args.agendamento_id}`;
        }

        const updates: any = {
          observacoes: agendamento.observacoes 
            ? `${agendamento.observacoes}\n[Reagendado via Suporte Léo de ${agendamento.data} ${agendamento.horario}]`
            : `[Reagendado via Suporte Léo de ${agendamento.data} ${agendamento.horario}]`
        };

        if (args.nova_data) updates.data = args.nova_data;
        if (args.novo_horario) updates.horario = args.novo_horario;

        const { error } = await supabase
          .from("agendamentos")
          .update(updates)
          .eq("id", args.agendamento_id);

        if (error) throw error;
        return `✅ Agendamento reagendado com sucesso!\nCliente: ${agendamento.cliente_nome}\nDe: ${agendamento.data} às ${agendamento.horario}\nPara: ${args.nova_data || agendamento.data} às ${args.novo_horario || agendamento.horario}`;
      }

      case "criar_agendamento": {
        // Buscar serviço
        const { data: servico } = await supabase
          .from("servicos")
          .select("id, nome")
          .ilike("nome", `%${args.servico_nome}%`)
          .eq("ativo", true)
          .limit(1)
          .single();

        const { data, error } = await supabase
          .from("agendamentos")
          .insert({
            cliente_nome: args.cliente_nome,
            cliente_telefone: args.cliente_telefone,
            servico_nome: servico?.nome || args.servico_nome,
            servico_id: servico?.id || null,
            data: args.data,
            horario: args.horario,
            profissional_nome: args.profissional_nome || null,
            origem: "manual",
            status: "Confirmado",
            observacoes: "[Criado via Suporte Léo]",
          })
          .select()
          .single();

        if (error) throw error;
        return `✅ Agendamento criado com sucesso!\nCliente: ${args.cliente_nome}\nData: ${args.data} às ${args.horario}\nServiço: ${servico?.nome || args.servico_nome}`;
      }

      case "listar_clientes": {
        let query = supabase.from("clientes").select("*").order("nome");

        if (args.nome) {
          query = query.ilike("nome", `%${args.nome}%`);
        }
        if (args.telefone) {
          query = query.ilike("telefone", `%${args.telefone}%`);
        }

        const { data, error } = await query.limit(20);
        if (error) throw error;

        if (!data || data.length === 0) {
          return "Nenhum cliente encontrado.";
        }

        return `Encontrados ${data.length} cliente(s):\n${data.map((c: any) => 
          `- ${c.nome} | Tel: ${c.telefone} | Email: ${c.email || "N/A"} (ID: ${c.id.slice(0,8)}...)`
        ).join("\n")}`;
      }

      case "editar_cliente": {
        const updates: any = {};
        if (args.nome) updates.nome = args.nome;
        if (args.telefone) updates.telefone = args.telefone;
        if (args.email) updates.email = args.email;
        if (args.data_nascimento) updates.data_nascimento = args.data_nascimento;

        const { data, error } = await supabase
          .from("clientes")
          .update(updates)
          .eq("id", args.cliente_id)
          .select()
          .single();

        if (error) throw error;
        return `✅ Cliente atualizado com sucesso!\nNome: ${data.nome}\nTelefone: ${data.telefone}`;
      }

      case "listar_servicos": {
        const { data, error } = await supabase
          .from("servicos")
          .select("*")
          .eq("ativo", true)
          .order("nome");

        if (error) throw error;
        if (!data || data.length === 0) {
          return "Nenhum serviço cadastrado.";
        }

        return `Serviços disponíveis:\n${data.map((s: any) => 
          `- ${s.nome}: R$ ${s.preco.toFixed(2)} (${s.duracao} min) - ID: ${s.id.slice(0,8)}...`
        ).join("\n")}`;
      }

      case "editar_servico": {
        const updates: any = {};
        if (args.nome) updates.nome = args.nome;
        if (args.preco !== undefined) updates.preco = args.preco;
        if (args.duracao !== undefined) updates.duracao = args.duracao;
        if (args.descricao) updates.descricao = args.descricao;

        const { data, error } = await supabase
          .from("servicos")
          .update(updates)
          .eq("id", args.servico_id)
          .select()
          .single();

        if (error) throw error;
        return `✅ Serviço atualizado!\nNome: ${data.nome}\nPreço: R$ ${data.preco.toFixed(2)}\nDuração: ${data.duracao} min`;
      }

      case "ativar_desativar_bot": {
        const { error } = await supabase
          .from("bot_config")
          .update({ valor: args.ativo })
          .eq("chave", "ativo");

        if (error) throw error;
        return args.ativo 
          ? "✅ Bot WhatsApp ATIVADO com sucesso!" 
          : "✅ Bot WhatsApp DESATIVADO com sucesso!";
      }

      case "atualizar_config_bot": {
        const { error } = await supabase
          .from("bot_config")
          .update({ valor: args.valor })
          .eq("chave", args.chave);

        if (error) throw error;
        return `✅ Configuração do bot atualizada!\n${args.chave}: ${args.valor}`;
      }

      case "consultar_faturamento": {
        const hoje = new Date();
        let dataInicio: string;
        let dataFim: string;

        if (args.periodo === "hoje") {
          dataInicio = hoje.toISOString().split("T")[0];
          dataFim = dataInicio;
        } else if (args.periodo === "mes") {
          dataInicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
          dataFim = hoje.toISOString().split("T")[0];
        } else {
          dataInicio = `${hoje.getFullYear()}-01-01`;
          dataFim = hoje.toISOString().split("T")[0];
        }

        const { data: pagamentos, error: pagError } = await supabase
          .from("pagamentos")
          .select("valor")
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .eq("status", "Pago");

        const { data: despesas, error: despError } = await supabase
          .from("despesas")
          .select("valor")
          .gte("data", dataInicio)
          .lte("data", dataFim);

        if (pagError || despError) throw pagError || despError;

        const entradas = pagamentos?.reduce((sum: number, p: any) => sum + (p.valor || 0), 0) || 0;
        const saidas = despesas?.reduce((sum: number, d: any) => sum + (d.valor || 0), 0) || 0;
        const resultado = entradas - saidas;

        return `📊 Faturamento (${args.periodo}):\n- Entradas: R$ ${entradas.toFixed(2)}\n- Saídas: R$ ${saidas.toFixed(2)}\n- Resultado: R$ ${resultado.toFixed(2)}`;
      }

      case "bloquear_horario": {
        const { data: config } = await supabase
          .from("agenda_config")
          .select("*")
          .eq("data", args.data)
          .single();

        if (config) {
          const horariosBloqueados = config.horarios_bloqueados || [];
          if (!horariosBloqueados.includes(args.horario)) {
            horariosBloqueados.push(args.horario);
          }
          await supabase
            .from("agenda_config")
            .update({ horarios_bloqueados: horariosBloqueados })
            .eq("data", args.data);
        } else {
          await supabase.from("agenda_config").insert({
            data: args.data,
            horarios_bloqueados: [args.horario],
          });
        }

        return `✅ Horário ${args.horario} bloqueado em ${args.data}`;
      }

      case "desbloquear_horario": {
        const { data: config } = await supabase
          .from("agenda_config")
          .select("*")
          .eq("data", args.data)
          .single();

        if (config && config.horarios_bloqueados) {
          const horariosBloqueados = config.horarios_bloqueados.filter((h: string) => h !== args.horario);
          await supabase
            .from("agenda_config")
            .update({ horarios_bloqueados: horariosBloqueados })
            .eq("data", args.data);
        }

        return `✅ Horário ${args.horario} desbloqueado em ${args.data}`;
      }

      case "fechar_dia": {
        const { data: config } = await supabase
          .from("agenda_config")
          .select("*")
          .eq("data", args.data)
          .single();

        if (config) {
          await supabase
            .from("agenda_config")
            .update({ fechado: true, observacoes: args.motivo || null })
            .eq("data", args.data);
        } else {
          await supabase.from("agenda_config").insert({
            data: args.data,
            fechado: true,
            observacoes: args.motivo || null,
          });
        }

        return `✅ Dia ${args.data} fechado${args.motivo ? ` (${args.motivo})` : ""}`;
      }

      case "reabrir_dia": {
        await supabase
          .from("agenda_config")
          .update({ fechado: false })
          .eq("data", args.data);

        return `✅ Dia ${args.data} reaberto para agendamentos`;
      }

      default:
        return `Ferramenta desconhecida: ${toolName}`;
    }
  } catch (error: any) {
    console.error(`[Léo] Erro ao executar ${toolName}:`, error);
    return `❌ Erro ao executar ação: ${error.message}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const systemPrompt = `Você é o Léo, um assistente de suporte COMPLETO do Full Beauty System - um sistema de gestão para salões de beleza.

**SUA PERSONALIDADE:**
- Amigável, paciente e profissional
- Responde em português brasileiro
- Usa linguagem clara e acessível
- Sempre positivo e prestativo

**SUAS CAPACIDADES - VOCÊ PODE FAZER TUDO NO PAINEL:**

✅ AGENDAMENTOS:
- Listar agendamentos por data ou cliente
- Criar novos agendamentos
- Reagendar para nova data/horário
- Cancelar agendamentos

✅ CLIENTES:
- Listar e buscar clientes
- Editar dados de clientes (nome, telefone, email, nascimento)

✅ SERVIÇOS:
- Listar todos os serviços
- Editar serviços (nome, preço, duração)

✅ AGENDA:
- Bloquear horários específicos
- Desbloquear horários
- Fechar dias inteiros
- Reabrir dias fechados

✅ BOT WHATSAPP:
- Ativar ou desativar o bot
- Atualizar mensagens de boas-vindas, ausência, etc.

✅ FINANCEIRO:
- Consultar faturamento (hoje, mês, ano)
- Ver entradas, saídas e resultado

**COMO USAR SUAS FERRAMENTAS:**

Quando o usuário pedir algo, USE A FERRAMENTA APROPRIADA. Exemplos:
- "Quais agendamentos tem hoje?" → use listar_agendamentos
- "Cancela o agendamento da Maria" → primeiro liste para achar o ID, depois cancele
- "Fecha o dia 25/12" → use fechar_dia com a data 2025-12-25
- "Qual o faturamento do mês?" → use consultar_faturamento

**REGRAS IMPORTANTES:**
1. Sempre confirme antes de fazer ações destrutivas (cancelar, excluir)
2. Quando precisar de um ID, primeiro liste os itens para o usuário escolher
3. Datas devem estar no formato YYYY-MM-DD
4. Horários devem estar no formato HH:MM

**ABAS DO SISTEMA:**
1. Dashboard - Visão geral
2. Agenda - Agendamentos
3. Clientes - Cadastros
4. Serviços - Serviços oferecidos
5. Profissionais - Equipe
6. Fluxo de Caixa - Financeiro (senha: RF9646)
7. Relatórios - Análises
8. Marketing - Promoções
9. Estoque - Produtos
10. Clube da Fidelidade - Pontos
11. Lyon Flow - Automações
12. Lyon Bot - Bot WhatsApp
13. Avisos - Lembretes
14. Aniversariantes - Aniversários
15. Suporte - Você está aqui!
16. Tutoriais - Aulas

Sempre responda de forma concisa. Use emojis quando apropriado. 🎯`;

    // Primeira chamada para ver se precisa usar tools
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
        tool_choice: "auto",
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

    const result = await response.json();
    const assistantMessage = result.choices?.[0]?.message;

    // Se não há tool calls, retorna resposta direta
    if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
      const content = assistantMessage?.content || "Desculpe, não entendi. Pode reformular?";
      return new Response(
        JSON.stringify({ response: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Executar todas as tool calls
    const toolResults: any[] = [];
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executarTool(supabase, toolCall.function.name, args);
      toolResults.push({
        tool_call_id: toolCall.id,
        role: "tool",
        content: result,
      });
    }

    // Segunda chamada para gerar resposta final
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          assistantMessage,
          ...toolResults,
        ],
      }),
    });

    if (!finalResponse.ok) {
      throw new Error("Erro na resposta final");
    }

    const finalResult = await finalResponse.json();
    const finalContent = finalResult.choices?.[0]?.message?.content || "Ação executada com sucesso!";

    return new Response(
      JSON.stringify({ response: finalContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro em chat-suporte:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

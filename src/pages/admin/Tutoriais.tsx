import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, GraduationCap, LayoutDashboard, Calendar, Users, Scissors, DollarSign, BarChart3, Sparkle, Package, Award, Workflow, Bot, Bell, Cake } from "lucide-react";

type Tutorial = {
  icon: any;
  title: string;
  description: string;
  steps: string[];
};

const tutorials: Tutorial[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Como interpretar os dados do painel principal",
    steps: [
      "O Dashboard mostra uma visão geral do seu negócio",
      "Veja os 'Atendimentos Hoje' para saber quantos clientes tem hoje",
      "O 'Total de Agendamentos' mostra todos os agendamentos futuros",
      "A seção 'Agendamentos de Amanhã' lista os clientes de amanhã",
      "Use o resumo do dia para ter uma visão rápida da situação atual"
    ]
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Como criar e gerenciar agendamentos",
    steps: [
      "Clique em uma data no calendário para ver os horários",
      "Use o botão 'Novo Agendamento' para criar um agendamento manual",
      "Escolha entre 'Novo Cliente' ou 'Cliente Já Cadastrado'",
      "O sistema mostra horários ocupados em vermelho",
      "Você pode editar, cancelar ou excluir agendamentos clicando neles",
      "Use 'Gerenciar Dia' para fechar dias ou adicionar horários extras"
    ]
  },
  {
    icon: Users,
    title: "Clientes",
    description: "Como cadastrar e buscar clientes",
    steps: [
      "Veja todos os clientes cadastrados no sistema",
      "Use o botão '+ Novo Cliente' para cadastrar manualmente",
      "Preencha nome, telefone, data de nascimento e email (opcional)",
      "Use a busca para encontrar clientes rapidamente",
      "Clique em 'Editar' para atualizar dados do cliente",
      "Clique em 'Apagar' para remover um cliente (cuidado: ação irreversível)"
    ]
  },
  {
    icon: Scissors,
    title: "Serviços",
    description: "Como gerenciar os serviços oferecidos",
    steps: [
      "Cadastre todos os serviços que você oferece",
      "Defina nome, descrição, duração (em minutos) e preço",
      "A duração é importante para calcular horários disponíveis",
      "Ative/desative serviços conforme necessário",
      "Os serviços aparecem no bot e no link de agendamento"
    ]
  },
  {
    icon: Users,
    title: "Profissionais",
    description: "Como cadastrar funcionários",
    steps: [
      "Cadastre você e seus funcionários",
      "Defina as especialidades de cada profissional",
      "Os profissionais aparecem no agendamento",
      "Ative/desative profissionais quando necessário"
    ]
  },
  {
    icon: DollarSign,
    title: "Fluxo de Caixa",
    description: "Como registrar entradas e saídas",
    steps: [
      "Digite a senha RF9646 para acessar (primeira vez)",
      "Registre todos os pagamentos recebidos nas 'Entradas'",
      "Registre todas as despesas nas 'Saídas'",
      "Categorize as despesas (Aluguel, Produtos, Marketing, etc.)",
      "Acompanhe o saldo diário, mensal e anual",
      "Use o botão 'Ver Relatórios' para análises detalhadas"
    ]
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description: "Como analisar o desempenho do negócio",
    steps: [
      "Digite a senha RF9646 para acessar",
      "A 'Análise Inteligente' usa IA para avaliar seu negócio",
      "Veja relatórios de Dia, Semana, Mês e Ano",
      "Acompanhe receita, despesa e lucro de cada período",
      "Use as sugestões da IA para melhorar seu negócio"
    ]
  },
  {
    icon: Sparkle,
    title: "Marketing",
    description: "Como criar e gerenciar promoções",
    steps: [
      "Crie promoções com desconto em % ou valor fixo",
      "Defina data de início e fim da promoção",
      "Adicione um motivo/descrição para a promoção",
      "Ative/desative promoções conforme necessário",
      "Use as promoções para atrair e reter clientes"
    ]
  },
  {
    icon: Package,
    title: "Estoque",
    description: "Como controlar produtos",
    steps: [
      "Cadastre todos os produtos que você usa",
      "Defina quantidade mínima para receber alertas",
      "Registre entradas e saídas de produtos",
      "Acompanhe o custo e preço de venda",
      "O Dashboard mostra alertas de estoque baixo"
    ]
  },
  {
    icon: Award,
    title: "Clube da Fidelidade",
    description: "Como funciona o programa de pontos",
    steps: [
      "Configure quantos pontos o cliente ganha por real gasto",
      "Configure quantos pontos são necessários para resgatar desconto",
      "Defina o valor do desconto de resgate",
      "Os pontos são acumulados automaticamente ao registrar pagamentos",
      "Clientes Bronze, Prata e Ouro são definidos pelo valor total gasto"
    ]
  },
  {
    icon: Workflow,
    title: "Lyon Flow",
    description: "Como criar automações de marketing",
    steps: [
      "Escolha um fluxo pré-configurado (Dia das Mães, Ano Novo, etc.)",
      "Personalize a mensagem com o nome do cliente usando {nome}",
      "Ative o fluxo para que as mensagens sejam enviadas automaticamente",
      "As mensagens são enviadas na data configurada",
      "Acompanhe os envios na aba 'Avisos'"
    ]
  },
  {
    icon: Bot,
    title: "Lyon Bot",
    description: "Como configurar o bot WhatsApp",
    steps: [
      "O bot responde automaticamente mensagens no WhatsApp",
      "Ele agenda horários, responde dúvidas e coleta dados dos clientes",
      "Use o botão 'Adicionar Informação' (senha RF9646) para ensinar coisas ao bot",
      "Veja as conversas recentes e o histórico de mensagens",
      "Ative/desative o bot quando necessário",
      "Bloqueie números indesejados na seção de bloqueios"
    ]
  },
  {
    icon: Bell,
    title: "Avisos",
    description: "Como funcionam os lembretes automáticos",
    steps: [
      "Lembretes são enviados automaticamente 1 dia antes às 10h",
      "Veja o histórico de lembretes enviados",
      "Acompanhe mensagens do Lyon Flow",
      "Veja as respostas automáticas do bot",
      "Todas as mensagens automáticas são registradas aqui"
    ]
  },
  {
    icon: Cake,
    title: "Aniversariantes",
    description: "Como usar o calendário de aniversários",
    steps: [
      "Veja o calendário com dias marcados (🎂) que têm aniversariantes",
      "Clique em um dia para ver quem faz aniversário",
      "Use o botão WhatsApp para enviar mensagem de parabéns",
      "Na lista à direita, veja todos os aniversariantes do mês",
      "Use isso para criar campanhas de aniversário e fidelizar clientes"
    ]
  }
];

const Tutoriais = () => {
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          Mini Aulas da Plataforma
        </h1>
        <p className="text-muted-foreground">
          Aprenda como usar cada funcionalidade do sistema passo a passo
        </p>
      </div>

      <div className="grid gap-4">
        {tutorials.map((tutorial) => {
          const isOpen = openTutorial === tutorial.title;
          const Icon = tutorial.icon;
          
          return (
            <Card key={tutorial.title} className="hover:shadow-lg transition-shadow">
              <Collapsible
                open={isOpen}
                onOpenChange={(open) => setOpenTutorial(open ? tutorial.title : null)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {tutorial.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3 pl-12">
                      {tutorial.steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Tutoriais;

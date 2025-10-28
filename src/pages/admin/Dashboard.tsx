import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Clock, Plus, Sparkles } from "lucide-react";

import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = [
    {
      title: "Agendamentos do Mês",
      value: "142",
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Clientes Atendidos",
      value: "98",
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Clientes Pendentes",
      value: "12",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Horários Disponíveis",
      value: "32",
      icon: Calendar,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  const todayStats = [
    { label: "Atendimentos Hoje", value: "8" },
    { label: "Faturamento do Dia", value: "R$ 1.240,00" },
    { label: "Profissional Mais Requisitado", value: "Jennifer Silva" },
  ];

  return (
    <div className="space-y-8">
      {/* Header com saudação */}
      <div className="flex items-center gap-3 p-6 rounded-xl gradient-primary shadow-soft">
        <Sparkles className="w-8 h-8 text-white" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Bem-vinda, Jennifer Silva ✨
          </h1>
          <p className="text-white/90 text-lg">
            Que o seu dia seja incrível!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Resumo Diário */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Resumo do Dia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {todayStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Atalhos Rápidos */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Atalhos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/admin/agenda")}> 
            <Plus className="w-5 h-5" />
            <span>Novo Agendamento</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/admin/servicos")}>
            <Plus className="w-5 h-5" />
            <span>Novo Serviço</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/admin/profissionais")}>
            <Plus className="w-5 h-5" />
            <span>Novo Profissional</span>
          </Button>
        </div>
      </Card>

      {/* Gráfico Placeholder */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">
          Evolução de Agendamentos e Faturamento
        </h2>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Gráfico será implementado com dados reais
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;

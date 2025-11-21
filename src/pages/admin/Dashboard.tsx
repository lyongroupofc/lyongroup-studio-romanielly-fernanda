import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Plus, Eye, EyeOff, Palette, Brush, Sparkle, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { MotivationalMessage } from "@/components/MotivationalMessage";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showTotal, setShowTotal] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { agendamentos, loading: loadingAgendamentos, refetch: refetchAgendamentos } = useAgendamentos();
  const { pagamentos, loading: loadingPagamentos, refetch: refetchPagamentos } = usePagamentos();

  // Timer atualiza a cada segundo
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };
    
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Desabilitado polling automático para evitar sobrecarga
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!document.hidden) {
  //       refetchAgendamentos();
  //       refetchPagamentos();
  //     }
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Cálculos de estatísticas com useMemo para performance
  const stats = useMemo(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    const mesAtual = format(new Date(), "yyyy-MM");
    
    // Filtros otimizados com early returns
    let agendamentosMes = 0;
    let agendamentosHoje = 0;
    let clientesAtendidos = 0;
    let clientesPendentes = 0;
    
    agendamentos.forEach(ag => {
      if (ag.data?.startsWith(mesAtual)) agendamentosMes++;
      if (ag.data === hoje) agendamentosHoje++;
      if (ag.status === "Concluído") clientesAtendidos++;
      if (ag.status === "Confirmado" && ag.data >= hoje) clientesPendentes++;
    });
    
    const faturamentoHoje = pagamentos
      .filter(p => p.data === hoje)
      .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);

    return { agendamentosMes, agendamentosHoje, clientesAtendidos, clientesPendentes, faturamentoHoje, hoje };
  }, [agendamentos, pagamentos]);
  
  // Dados para o gráfico dos últimos 7 dias com useMemo
  const dadosGrafico = useMemo(() => {
    const ultimosDias = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, "yyyy-MM-dd");
    });

    return ultimosDias.map((data) => {
      const faturamentoDia = pagamentos
        .filter((p) => p.data === data)
        .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);
      const agendamentosDia = agendamentos.filter(ag => ag.data === data).length;
      return {
        dia: format(new Date(data), "dd/MM"),
        faturamento: faturamentoDia,
        agendamentos: agendamentosDia,
      };
    });
  }, [agendamentos, pagamentos]);

  const statsCards = [
    {
      title: "Agendamentos do Mês",
      value: stats.agendamentosMes.toString(),
      icon: Brush,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Clientes Atendidos",
      value: stats.clientesAtendidos.toString(),
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Clientes Pendentes de Atendimento",
      value: stats.clientesPendentes.toString(),
      icon: Sparkle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Agendamentos Hoje",
      value: stats.agendamentosHoje.toString(),
      icon: Gem,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  const todayStats = [
    { label: "Atendimentos Hoje", value: stats.agendamentosHoje.toString() },
    { label: "Faturamento do Dia", value: `R$ ${stats.faturamentoHoje.toFixed(2).replace(".", ",")}` },
    { label: "Total de Agendamentos", value: agendamentos.length.toString() },
  ];

  return (
    <div className="space-y-8 relative">
      <AnimatedBackground />
      
      {/* Header Minimalista */}
      <Card className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-primary-hover/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold">
              {getGreeting()}, Seja bem-vinda!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              <span className="sm:hidden">{format(currentTime, "dd/MM/yyyy", { locale: ptBR })}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Mensagem Motivacional */}
      <MotivationalMessage />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="p-4 sm:p-6 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Resumo Diário */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Resumo do Dia</h2>
          <Button variant="outline" size="sm" onClick={() => setShowTotal(!showTotal)}>
            {showTotal ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            <span className="hidden sm:inline">{showTotal ? "Ocultar" : "Mostrar"} valores</span>
            <span className="sm:hidden">{showTotal ? "Ocultar" : "Mostrar"}</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {todayStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xl sm:text-2xl font-bold">
                {stat.label === "Faturamento do Dia" ? (showTotal ? stat.value : "R$ •••,••") : stat.value}
              </p>
            </div>
          ))}
        </div>
        
        {/* Lista de Clientes Agendados Hoje */}
        {stats.agendamentosHoje > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Agendamentos de Hoje</h3>
            <div className="space-y-2">
              {agendamentos
                .filter(ag => ag.data === stats.hoje && ag.status !== 'Cancelado' && ag.status !== 'Reagendado')
                .sort((a, b) => a.horario.localeCompare(b.horario))
                .map((ag) => (
                  <div 
                    key={ag.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{ag.cliente_nome}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{ag.horario.substring(0, 5)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>

      {/* Atalhos Rápidos */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Atalhos Rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Button className="h-auto py-3 sm:py-4 flex-col gap-2" onClick={() => navigate("/admin/agenda")}> 
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Novo Agendamento</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-2" onClick={() => navigate("/admin/servicos")}>
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Novo Serviço</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col gap-2" onClick={() => navigate("/admin/profissionais")}>
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Novo Profissional</span>
          </Button>
        </div>
      </Card>

      {/* Gráfico de Agendamentos e Faturamento */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-base sm:text-xl font-semibold mb-4 sm:mb-6">
          <span className="hidden sm:inline">Evolução de Agendamentos e Faturamento (Últimos 7 Dias)</span>
          <span className="sm:hidden">Últimos 7 Dias</span>
        </h2>
        {loadingAgendamentos || loadingPagamentos ? (
          <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : pagamentos.length === 0 && agendamentos.length === 0 ? (
          <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Os dados serão exibidos conforme você registrar agendamentos e pagamentos</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "faturamento") {
                    return [`R$ ${value.toFixed(2).replace(".", ",")}`, "Faturamento"];
                  }
                  return [value, "Agendamentos"];
                }}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar yAxisId="left" dataKey="faturamento" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="faturamento" />
              <Bar yAxisId="right" dataKey="agendamentos" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} name="agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Clock, Plus, Eye, EyeOff, Palette, Brush, Sparkle, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
  const { agendamentos, loading: loadingAgendamentos } = useAgendamentos();
  const { pagamentos, loading: loadingPagamentos } = usePagamentos();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Cálculos de estatísticas
  const hoje = format(new Date(), "yyyy-MM-dd");
  const mesAtual = format(new Date(), "yyyy-MM");
  
  const agendamentosMes = agendamentos.filter(ag => ag.data?.startsWith(mesAtual)).length;
  const agendamentosHoje = agendamentos.filter(ag => ag.data === hoje).length;
  const clientesAtendidos = agendamentos.filter(ag => ag.status === "Concluído").length;
  const clientesPendentes = agendamentos.filter(ag => ag.status === "Confirmado" && ag.data >= hoje).length;
  
  const faturamentoHoje = pagamentos
    .filter(p => p.data === hoje)
    .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);
  
  // Dados para o gráfico dos últimos 7 dias
  const ultimosDias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return format(date, "yyyy-MM-dd");
  });

  const dadosGrafico = ultimosDias.map((data) => {
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

  const stats = [
    {
      title: "Agendamentos do Mês",
      value: agendamentosMes.toString(),
      icon: Brush,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Clientes Atendidos",
      value: clientesAtendidos.toString(),
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Clientes Pendentes",
      value: clientesPendentes.toString(),
      icon: Sparkle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Agendamentos Hoje",
      value: agendamentosHoje.toString(),
      icon: Gem,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  const todayStats = [
    { label: "Atendimentos Hoje", value: agendamentosHoje.toString() },
    { label: "Faturamento do Dia", value: `R$ ${faturamentoHoje.toFixed(2).replace(".", ",")}` },
    { label: "Total de Agendamentos", value: agendamentos.length.toString() },
  ];

  return (
    <div className="space-y-8 relative">
      <AnimatedBackground />
      
      {/* Header com saudação dinâmica */}
      <div className="relative overflow-hidden rounded-xl shadow-soft">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-hover to-accent opacity-95"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full -ml-48 -mb-48 blur-3xl"></div>
        
        <div className="relative p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-foreground/10 backdrop-blur-sm rounded-xl border border-primary-foreground/20">
                  <Gem className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-sm font-medium tracking-wide uppercase">
                    Studio Romanielly Fernanda
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                    {getGreeting()}, Seja bem-vinda!
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-primary-foreground/90">
                <Calendar className="w-4 h-4" />
                <p className="text-sm md:text-base font-medium">
                  {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-lg border border-primary-foreground/20">
                <Sparkle className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">Painel Administrativo</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3 px-6 py-4 bg-primary-foreground/10 backdrop-blur-sm rounded-xl border border-primary-foreground/20">
                <Clock className="w-6 h-6 text-primary-foreground" />
                <span className="text-3xl md:text-4xl font-bold tabular-nums text-primary-foreground">
                  {format(currentTime, "HH:mm:ss")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mensagem Motivacional */}
      <MotivationalMessage />

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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Resumo do Dia</h2>
          <Button variant="outline" size="sm" onClick={() => setShowTotal(!showTotal)}>
            {showTotal ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {showTotal ? "Ocultar" : "Mostrar"} valores
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {todayStats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">
                {stat.label === "Faturamento do Dia" ? (showTotal ? stat.value : "R$ •••,••") : stat.value}
              </p>
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

      {/* Gráfico de Agendamentos e Faturamento */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">
          Evolução de Agendamentos e Faturamento (Últimos 7 Dias)
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

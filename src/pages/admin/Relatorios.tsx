import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Filter, TrendingUp, Users, DollarSign, Calendar as CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { useServicos } from "@/hooks/useServicos";
import { useProfissionais } from "@/hooks/useProfissionais";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const Relatorios = () => {
  const { agendamentos } = useAgendamentos();
  const { pagamentos } = usePagamentos();
  const { despesas } = useDespesas();
  const { servicos } = useServicos();
  const { profissionais } = useProfissionais();

  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));
  const [servicoFiltro, setServicoFiltro] = useState<string>("todos");
  const [profissionalFiltro, setProfissionalFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [metodoFiltro, setMetodoFiltro] = useState<string>("todos");

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    let agendamentosFiltrados = agendamentos;
    let pagamentosFiltrados = pagamentos;
    let despesasFiltradas = despesas;

    // Filtro de data
    if (dataInicio && dataFim) {
      const inicioStr = format(dataInicio, "yyyy-MM-dd");
      const fimStr = format(dataFim, "yyyy-MM-dd");
      
      agendamentosFiltrados = agendamentosFiltrados.filter(
        (a) => a.data >= inicioStr && a.data <= fimStr
      );
      
      pagamentosFiltrados = pagamentosFiltrados.filter(
        (p) => p.data >= inicioStr && p.data <= fimStr
      );
      
      despesasFiltradas = despesasFiltradas.filter(
        (d) => d.data >= inicioStr && d.data <= fimStr
      );
    }

    // Filtro de serviço
    if (servicoFiltro !== "todos") {
      agendamentosFiltrados = agendamentosFiltrados.filter(
        (a) => a.servico_id === servicoFiltro
      );
    }

    // Filtro de profissional
    if (profissionalFiltro !== "todos") {
      agendamentosFiltrados = agendamentosFiltrados.filter(
        (a) => a.profissional_id === profissionalFiltro
      );
    }

    // Filtro de status
    if (statusFiltro !== "todos") {
      agendamentosFiltrados = agendamentosFiltrados.filter(
        (a) => a.status === statusFiltro
      );
    }

    // Filtro de método de pagamento
    if (metodoFiltro !== "todos") {
      pagamentosFiltrados = pagamentosFiltrados.filter(
        (p) => p.metodo_pagamento === metodoFiltro
      );
    }

    return {
      agendamentos: agendamentosFiltrados,
      pagamentos: pagamentosFiltrados,
      despesas: despesasFiltradas,
    };
  }, [agendamentos, pagamentos, despesas, dataInicio, dataFim, servicoFiltro, profissionalFiltro, statusFiltro, metodoFiltro]);

  // Calcular métricas
  const metricas = useMemo(() => {
    const totalAgendamentos = dadosFiltrados.agendamentos.length;
    const agendamentosConfirmados = dadosFiltrados.agendamentos.filter(a => a.status === "Confirmado").length;
    const agendamentosCancelados = dadosFiltrados.agendamentos.filter(a => a.status === "Cancelado").length;
    const totalReceita = dadosFiltrados.pagamentos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const totalDespesas = dadosFiltrados.despesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    const lucroLiquido = totalReceita - totalDespesas;
    const ticketMedio = totalAgendamentos > 0 ? totalReceita / totalAgendamentos : 0;
    const clientesUnicos = new Set(dadosFiltrados.agendamentos.map(a => a.cliente_telefone)).size;

    return {
      totalAgendamentos,
      agendamentosConfirmados,
      agendamentosCancelados,
      totalReceita,
      totalDespesas,
      lucroLiquido,
      ticketMedio,
      clientesUnicos,
    };
  }, [dadosFiltrados]);

  // Dados para gráfico de linha (tendência diária)
  const dadosLinha = useMemo(() => {
    if (!dataInicio || !dataFim) return [];

    const dias = eachDayOfInterval({ start: dataInicio, end: dataFim });
    
    return dias.map(dia => {
      const diaStr = format(dia, "yyyy-MM-dd");
      const agendamentosDia = dadosFiltrados.agendamentos.filter(a => a.data === diaStr).length;
      const receitaDia = dadosFiltrados.pagamentos
        .filter(p => p.data === diaStr)
        .reduce((acc, p) => acc + Number(p.valor || 0), 0);
      const despesasDia = dadosFiltrados.despesas
        .filter(d => d.data === diaStr)
        .reduce((acc, d) => acc + Number(d.valor || 0), 0);
      
      return {
        data: format(dia, "dd/MM"),
        agendamentos: agendamentosDia,
        receita: receitaDia,
        despesas: despesasDia,
        lucro: receitaDia - despesasDia,
      };
    });
  }, [dataInicio, dataFim, dadosFiltrados]);

  // Dados para gráfico de pizza (serviços mais populares)
  const dadosPizza = useMemo(() => {
    const contagemServicos = dadosFiltrados.agendamentos.reduce((acc, a) => {
      const servico = a.servico_nome || "Sem serviço";
      acc[servico] = (acc[servico] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(contagemServicos)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [dadosFiltrados.agendamentos]);

  // Dados para gráfico de barras (profissionais)
  const dadosBarras = useMemo(() => {
    const contagemProfissionais = dadosFiltrados.agendamentos.reduce((acc, a) => {
      const profissional = a.profissional_nome || "Sem profissional";
      acc[profissional] = (acc[profissional] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(contagemProfissionais)
      .map(([nome, atendimentos]) => ({ nome, atendimentos }))
      .sort((a, b) => b.atendimentos - a.atendimentos);
  }, [dadosFiltrados.agendamentos]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(var(--muted))', 'hsl(var(--success))'];

  // Exportar para CSV
  const exportarCSV = () => {
    const headers = [
      "Data",
      "Horário",
      "Cliente",
      "Telefone",
      "Serviço",
      "Profissional",
      "Status",
      "Valor Pago",
      "Método Pagamento"
    ];

    const rows = dadosFiltrados.agendamentos.map(ag => {
      const pagamento = dadosFiltrados.pagamentos.find(p => p.agendamento_id === ag.id);
      return [
        format(parseISO(ag.data), "dd/MM/yyyy"),
        ag.horario,
        ag.cliente_nome,
        ag.cliente_telefone,
        ag.servico_nome,
        ag.profissional_nome || "-",
        ag.status,
        pagamento ? `R$ ${Number(pagamento.valor).toFixed(2)}` : "Pendente",
        pagamento?.metodo_pagamento || "-"
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
    link.click();

    toast.success("Relatório exportado com sucesso!");
  };

  const limparFiltros = () => {
    setDataInicio(startOfMonth(new Date()));
    setDataFim(endOfMonth(new Date()));
    setServicoFiltro("todos");
    setProfissionalFiltro("todos");
    setStatusFiltro("todos");
    setMetodoFiltro("todos");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Análises</h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de desempenho e tendências
          </p>
        </div>
        <Button onClick={exportarCSV} className="hover-lift">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros Avançados */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Filtros Avançados</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Período */}
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={setDataInicio}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={setDataFim}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={servicoFiltro} onValueChange={setServicoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os serviços" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os serviços</SelectItem>
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={profissionalFiltro} onValueChange={setProfissionalFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os profissionais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os profissionais</SelectItem>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Confirmado">Confirmado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <Select value={metodoFiltro} onValueChange={setMetodoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os métodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os métodos</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={limparFiltros} className="w-full">
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
              <p className="text-2xl font-bold">{metricas.totalAgendamentos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <p className="text-2xl font-bold">R$ {metricas.totalReceita.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <p className="text-2xl font-bold">R$ {metricas.lucroLiquido.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-xl">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes Únicos</p>
              <p className="text-2xl font-bold">{metricas.clientesUnicos}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Ticket Médio</p>
          <p className="text-3xl font-bold text-primary">
            R$ {metricas.ticketMedio.toFixed(2)}
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Taxa de Confirmação</p>
          <p className="text-3xl font-bold text-success">
            {metricas.totalAgendamentos > 0
              ? ((metricas.agendamentosConfirmados / metricas.totalAgendamentos) * 100).toFixed(1)
              : 0}%
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total de Despesas</p>
          <p className="text-3xl font-bold text-destructive">
            R$ {metricas.totalDespesas.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Gráfico de Linha - Tendências */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Tendências Diárias</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dadosLinha}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="agendamentos" stroke="hsl(var(--primary))" name="Agendamentos" strokeWidth={2} />
            <Line type="monotone" dataKey="receita" stroke="hsl(var(--success))" name="Receita (R$)" strokeWidth={2} />
            <Line type="monotone" dataKey="lucro" stroke="hsl(var(--accent))" name="Lucro (R$)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráficos de Pizza e Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Serviços Mais Populares */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Serviços Mais Populares</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dadosPizza}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ nome, quantidade }) => `${nome}: ${quantidade}`}
                outerRadius={100}
                fill="hsl(var(--primary))"
                dataKey="quantidade"
              >
                {dadosPizza.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Atendimentos por Profissional */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Atendimentos por Profissional</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dadosBarras}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="atendimentos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Relatorios;

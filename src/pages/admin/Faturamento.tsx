import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, TrendingDown, Calendar, CalendarIcon, Plus, Trash2, Lock, Package, BarChart3, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { useServicos } from "@/hooks/useServicos";
import { format, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const Faturamento = () => {
  const navigate = useNavigate();
  const [showTotal, setShowTotal] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const { agendamentos, loading: loadingAgendamentos, updateAgendamento } = useAgendamentos();
  const { pagamentos, loading: loadingPagamentos, addPagamento } = usePagamentos();
  const { despesas, loading: loadingDespesas, addDespesa, deleteDespesa } = useDespesas();
  const { servicos } = useServicos();
  const [openPagamentoDialog, setOpenPagamentoDialog] = useState(false);
  const [openDespesaDialog, setOpenDespesaDialog] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("PIX");
  const [servicoSelecionado, setServicoSelecionado] = useState<string>("");
  const [valorEditado, setValorEditado] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  const [descricaoDespesa, setDescricaoDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");
  const [categoriaDespesa, setCategoriaDespesa] = useState("Outros");
  const [categoriaCustom, setCategoriaCustom] = useState("");
  const [usarCategoriaCustom, setUsarCategoriaCustom] = useState(false);
  const [dataDespesa, setDataDespesa] = useState<Date | undefined>(new Date());
  const [metodoDespesa, setMetodoDespesa] = useState("PIX");

  // Categorias padrão + categorias customizadas extraídas das despesas existentes
  const categoriasDisponiveis = useMemo(() => {
    const categoriasBase = ["Aluguel", "Produtos", "Manutenção", "Marketing", "Outros"];
    const categoriasExistentes = despesas
      .map(d => d.categoria)
      .filter((c): c is string => !!c && !categoriasBase.includes(c));
    const todasCategorias = [...new Set([...categoriasBase, ...categoriasExistentes])];
    return todasCategorias.sort();
  }, [despesas]);

  const handlePasswordSubmit = () => {
    if (passwordInput === "RF9646") {
      setAuthenticated(true);
      setPasswordInput("");
      toast.success("Acesso liberado!");
    } else {
      toast.error("Senha incorreta!");
      setPasswordInput("");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center space-y-6">
            <Lock className="w-16 h-16 mx-auto text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Área Protegida</h2>
              <p className="text-muted-foreground mt-2">
                Insira a senha para acessar o Fluxo de Caixa
              </p>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Digite a senha"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handlePasswordSubmit();
                }}
              />
              <Button onClick={handlePasswordSubmit} className="w-full">
                Acessar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const agendamentosPendentes = agendamentos.filter(
    (ag) => !pagamentos.some((pag) => pag.agendamento_id === ag.id)
  );

  const abrirDialogPagamento = (agendamento: any) => {
    setAgendamentoSelecionado(agendamento);
    setMetodoSelecionado("PIX");
    setServicoSelecionado(agendamento.servico_nome || "");
    setValorEditado("");
    setObservacoes("");
    setOpenPagamentoDialog(true);
  };

  const registrarPagamento = async () => {
    if (!agendamentoSelecionado) return;

    const valorFinal = valorEditado ? parseFloat(valorEditado) : 0;
    const servicoFinal = servicoSelecionado || agendamentoSelecionado.servico_nome;

    // Se o serviço foi alterado, atualiza também o agendamento
    if (servicoFinal !== agendamentoSelecionado.servico_nome) {
      const servicoEncontrado = servicos.find(s => s.nome === servicoFinal);
      await updateAgendamento(agendamentoSelecionado.id, {
        servico_nome: servicoFinal,
        servico_id: servicoEncontrado?.id || null,
      });
    }

    await addPagamento({
      agendamento_id: agendamentoSelecionado.id,
      cliente_nome: agendamentoSelecionado.cliente_nome,
      servico: servicoFinal,
      valor: valorFinal,
      metodo_pagamento: metodoSelecionado,
      status: "Pago",
      data: agendamentoSelecionado.data,
    });

    setOpenPagamentoDialog(false);
    setAgendamentoSelecionado(null);
  };

  const hoje = format(new Date(), "yyyy-MM-dd");
  const faturamentoHoje = pagamentos
    .filter((p) => p.data === hoje)
    .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);

  const mesAtual = format(new Date(), "yyyy-MM");
  const faturamentoMes = pagamentos
    .filter((p) => p.data && p.data.startsWith(mesAtual))
    .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);

  const anoAtual = format(new Date(), "yyyy");
  const faturamentoAno = pagamentos
    .filter((p) => p.data && p.data.startsWith(anoAtual))
    .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);

  const despesasHoje = despesas
    .filter((d) => d.data === hoje)
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  const despesasMes = despesas
    .filter((d) => d.data && d.data.startsWith(mesAtual))
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  const despesasAno = despesas
    .filter((d) => d.data && d.data.startsWith(anoAtual))
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  const saldoHoje = faturamentoHoje - despesasHoje;
  const saldoMes = faturamentoMes - despesasMes;
  const saldoAno = faturamentoAno - despesasAno;

  const faturamentoPeriodo = dataInicio && dataFim
    ? pagamentos
        .filter((p) => {
          if (!p.data) return false;
          const pData = parseISO(p.data);
          return pData >= dataInicio && pData <= dataFim;
        })
        .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0)
    : 0;

  const abrirDialogDespesa = () => {
    setDescricaoDespesa("");
    setValorDespesa("");
    setCategoriaDespesa("Outros");
    setCategoriaCustom("");
    setUsarCategoriaCustom(false);
    setDataDespesa(new Date());
    setMetodoDespesa("PIX");
    setOpenDespesaDialog(true);
  };

  const registrarDespesa = async () => {
    if (!descricaoDespesa || !valorDespesa || !dataDespesa) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const categoriaFinal = usarCategoriaCustom && categoriaCustom.trim() 
      ? categoriaCustom.trim() 
      : categoriaDespesa;

    await addDespesa({
      descricao: descricaoDespesa,
      valor: parseFloat(valorDespesa),
      categoria: categoriaFinal,
      data: format(dataDespesa, "yyyy-MM-dd"),
      metodo_pagamento: metodoDespesa,
    });

    setOpenDespesaDialog(false);
  };

  let dadosGrafico;
  let labelGrafico = "Entradas x Saídas (Últimos 7 Dias)";

  if (dataInicio && dataFim) {
    labelGrafico = `Faturamento de ${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;
    const dias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasPeriodo = Array.from({ length: dias }, (_, i) => {
      const date = new Date(dataInicio);
      date.setDate(date.getDate() + i);
      return format(date, "yyyy-MM-dd");
    });

    dadosGrafico = diasPeriodo.map((data) => {
      const entradasDia = pagamentos
        .filter((p) => p.data === data)
        .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);
      const saidasDia = despesas
        .filter((d) => d.data === data)
        .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);
      return {
        dia: format(new Date(data), "dd/MM"),
        entradas: entradasDia,
        saidas: saidasDia,
      };
    });
  } else {
    const ultimosDias = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, "yyyy-MM-dd");
    });

    dadosGrafico = ultimosDias.map((data) => {
      const entradasDia = pagamentos
        .filter((p) => p.data === data)
        .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);
      const saidasDia = despesas
        .filter((d) => d.data === data)
        .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);
      return {
        dia: format(new Date(data), "dd/MM"),
        entradas: entradasDia,
        saidas: saidasDia,
      };
    });
  }

  const stats = [
    {
      label: "Saldo Hoje",
      value: `R$ ${saldoHoje.toFixed(2).replace(".", ",")}`,
      icon: DollarSign,
      color: saldoHoje >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Saldo do Mês",
      value: `R$ ${saldoMes.toFixed(2).replace(".", ",")}`,
      icon: TrendingUp,
      color: saldoMes >= 0 ? "text-primary" : "text-destructive",
    },
    {
      label: "Saldo do Ano",
      value: `R$ ${saldoAno.toFixed(2).replace(".", ",")}`,
      icon: TrendingUp,
      color: saldoAno >= 0 ? "text-primary" : "text-destructive",
    },
    {
      label: "Pendentes",
      value: `${agendamentosPendentes.length}`,
      icon: Calendar,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie entradas e saídas do salão
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/relatorios")}
          className="gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Ver Relatórios
        </Button>
      </div>

      {/* Cards de Entradas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entradas Hoje</p>
              <p className="text-2xl font-bold text-success">
                {showTotal ? `R$ ${faturamentoHoje.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entradas do Mês</p>
              <p className="text-2xl font-bold text-success">
                {showTotal ? `R$ ${faturamentoMes.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entradas do Ano</p>
              <p className="text-2xl font-bold text-success">
                {showTotal ? `R$ ${faturamentoAno.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cards de Saídas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-xl">
              <Package className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saídas Hoje</p>
              <p className="text-2xl font-bold text-destructive">
                {showTotal ? `R$ ${despesasHoje.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-xl">
              <Package className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saídas do Mês</p>
              <p className="text-2xl font-bold text-destructive">
                {showTotal ? `R$ ${despesasMes.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-xl">
              <Package className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saídas do Ano</p>
              <p className="text-2xl font-bold text-destructive">
                {showTotal ? `R$ ${despesasAno.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cards de Resultado (Entrada - Saída) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-lift border-2 border-primary/30">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${(faturamentoHoje - despesasHoje) >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Scale className={`w-6 h-6 ${(faturamentoHoje - despesasHoje) >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Resultado do Dia</p>
              <p className={`text-2xl font-bold ${(faturamentoHoje - despesasHoje) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {showTotal ? `R$ ${(faturamentoHoje - despesasHoje).toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift border-2 border-primary/30">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${(faturamentoMes - despesasMes) >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Scale className={`w-6 h-6 ${(faturamentoMes - despesasMes) >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Resultado do Mês</p>
              <p className={`text-2xl font-bold ${(faturamentoMes - despesasMes) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {showTotal ? `R$ ${(faturamentoMes - despesasMes).toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift border-2 border-primary/30">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${(faturamentoAno - despesasAno) >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Scale className={`w-6 h-6 ${(faturamentoAno - despesasAno) >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Resultado do Ano</p>
              <p className={`text-2xl font-bold ${(faturamentoAno - despesasAno) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {showTotal ? `R$ ${(faturamentoAno - despesasAno).toFixed(2).replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cards de Promoções */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover-lift border-primary/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingDown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Promoções Aplicadas (Mês)</p>
              <p className="text-2xl font-bold">
                {agendamentos.filter(a => (a as any).promocao_id && a.data.startsWith(mesAtual)).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift border-primary/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Descontos Concedidos (Mês)</p>
              <p className="text-2xl font-bold text-primary">
                {showTotal ? `R$ ${agendamentos
                  .filter(a => a.data.startsWith(mesAtual))
                  .reduce((sum, a) => sum + ((a as any).desconto_aplicado || 0), 0)
                  .toFixed(2)
                  .replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 hover-lift border-primary/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Potencial Perdida</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {showTotal ? `R$ ${agendamentos
                  .filter(a => a.data.startsWith(mesAtual))
                  .reduce((sum, a) => sum + ((a as any).desconto_aplicado || 0), 0)
                  .toFixed(2)
                  .replace(".", ",")}` : "R$ •••,••"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Filtrar por Período</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dataInicio}
                  onSelect={setDataInicio}
                  initialFocus
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
                    "w-[240px] justify-start text-left font-normal",
                    !dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dataFim}
                  onSelect={setDataFim}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {(dataInicio || dataFim) && (
            <Button
              variant="outline"
              onClick={() => {
                setDataInicio(undefined);
                setDataFim(undefined);
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
        {dataInicio && dataFim && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Faturamento do Período Selecionado</p>
            <p className="text-3xl font-bold">
              {showTotal ? `R$ ${faturamentoPeriodo.toFixed(2).replace(".", ",")}` : "R$ •••,••"}
            </p>
          </div>
        )}
      </Card>

      
      
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Registrar Saída/Despesa</h2>
          <Button onClick={abrirDialogDespesa}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
        {loadingDespesas ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : despesas.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma despesa registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Descrição</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-left p-3">Valor</th>
                  <th className="text-left p-3">Método</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((desp) => (
                  <tr key={desp.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{desp.descricao}</td>
                    <td className="p-3">{desp.categoria || "-"}</td>
                    <td className="p-3 font-semibold text-destructive">
                      {showTotal ? `R$ ${Number(desp.valor).toFixed(2).replace(".", ",")}` : "R$ •••,••"}
                    </td>
                    <td className="p-3">{desp.metodo_pagamento || "-"}</td>
                    <td className="p-3 text-muted-foreground">{format(parseISO(desp.data), "dd/MM/yyyy")}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDespesa(desp.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Agendamentos Pendentes de Pagamento</h2>
        {loadingAgendamentos ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : agendamentosPendentes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum agendamento pendente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Serviço</th>
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Horário</th>
                  <th className="text-left p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {agendamentosPendentes.map((ag) => (
                  <tr key={ag.id} className="border-b hover:bg-muted/50">
                    <td 
                      className="p-3 text-primary hover:underline cursor-pointer"
                      onClick={() => navigate(`/admin/agenda?date=${ag.data}&highlight=${ag.id}`)}
                    >
                      {ag.cliente_nome}
                    </td>
                    <td className="p-3">{ag.servico_nome}</td>
                    <td className="p-3">{format(parseISO(ag.data), "dd/MM/yyyy")}</td>
                    <td className="p-3">{ag.horario ? ag.horario.substring(0, 5) : "-"}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        onClick={() => abrirDialogPagamento(ag)}
                      >
                        Registrar Pagamento
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">{labelGrafico}</h2>
        {loadingPagamentos || loadingDespesas ? (
          <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="entradas" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} name="Entradas" />
              <Bar dataKey="saidas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Dialog Pagamento */}
      <Dialog open={openPagamentoDialog} onOpenChange={setOpenPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input value={agendamentoSelecionado?.cliente_nome || ""} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Serviço</Label>
              <Select value={servicoSelecionado} onValueChange={setServicoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.filter(s => s.ativo).map((servico) => (
                    <SelectItem key={servico.id} value={servico.nome}>
                      {servico.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={valorEditado}
                onChange={(e) => setValorEditado(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select value={metodoSelecionado} onValueChange={setMetodoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenPagamentoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={registrarPagamento}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Despesa */}
      <Dialog open={openDespesaDialog} onOpenChange={setOpenDespesaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa/Saída</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="desc">Descrição *</Label>
              <Input
                id="desc"
                value={descricaoDespesa}
                onChange={(e) => setDescricaoDespesa(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="usarCategoriaCustom"
                  checked={usarCategoriaCustom}
                  onChange={(e) => setUsarCategoriaCustom(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="usarCategoriaCustom" className="text-sm text-muted-foreground">
                  Criar nova categoria
                </label>
              </div>
              {usarCategoriaCustom ? (
                <Input
                  placeholder="Digite o nome da nova categoria"
                  value={categoriaCustom}
                  onChange={(e) => setCategoriaCustom(e.target.value)}
                />
              ) : (
                <Select value={categoriaDespesa} onValueChange={setCategoriaDespesa}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDisponiveis.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="valor-despesa">Valor *</Label>
              <Input
                id="valor-despesa"
                type="number"
                step="0.01"
                value={valorDespesa}
                onChange={(e) => setValorDespesa(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataDespesa && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataDespesa ? format(dataDespesa, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dataDespesa}
                    onSelect={setDataDespesa}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select value={metodoDespesa} onValueChange={setMetodoDespesa}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDespesaDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={registrarDespesa}>Registrar Despesa</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturamento;

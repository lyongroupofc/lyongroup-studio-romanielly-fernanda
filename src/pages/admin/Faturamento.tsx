import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Eye, EyeOff, CalendarIcon, Plus, Trash2, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const Faturamento = () => {
  const [showTotal, setShowTotal] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const { agendamentos, loading: loadingAgendamentos } = useAgendamentos();
  const { pagamentos, loading: loadingPagamentos, addPagamento } = usePagamentos();
  const { despesas, loading: loadingDespesas, addDespesa, deleteDespesa } = useDespesas();
  const [openPagamentoDialog, setOpenPagamentoDialog] = useState(false);
  const [openDespesaDialog, setOpenDespesaDialog] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("PIX");
  const [valorEditado, setValorEditado] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  
  // Estados para despesa
  const [descricaoDespesa, setDescricaoDespesa] = useState("");
  const [valorDespesa, setValorDespesa] = useState("");
  const [categoriaDespesa, setCategoriaDespesa] = useState("Outros");
  const [dataDespesa, setDataDespesa] = useState<Date | undefined>(new Date());
  const [metodoDespesa, setMetodoDespesa] = useState("PIX");

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
    setValorEditado("");
    setObservacoes("");
    setOpenPagamentoDialog(true);
  };

  const registrarPagamento = async () => {
    if (!agendamentoSelecionado) return;

    const valorFinal = valorEditado ? parseFloat(valorEditado) : 0;

    await addPagamento({
      agendamento_id: agendamentoSelecionado.id,
      cliente_nome: agendamentoSelecionado.cliente_nome,
      servico: observacoes || agendamentoSelecionado.servico_nome,
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

  // Calcular despesas
  const despesasHoje = despesas
    .filter((d) => d.data === hoje)
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  const despesasMes = despesas
    .filter((d) => d.data && d.data.startsWith(mesAtual))
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  const despesasAno = despesas
    .filter((d) => d.data && d.data.startsWith(anoAtual))
    .reduce((acc, d) => acc + parseFloat(String(d.valor || 0)), 0);

  // Calcular saldo
  const saldoHoje = faturamentoHoje - despesasHoje;
  const saldoMes = faturamentoMes - despesasMes;
  const saldoAno = faturamentoAno - despesasAno;

  // Faturamento do período personalizado
  const faturamentoPeriodo = dataInicio && dataFim
    ? pagamentos
        .filter((p) => {
          if (!p.data) return false;
          const pData = new Date(p.data);
          return pData >= dataInicio && pData <= dataFim;
        })
        .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0)
    : 0;

  const abrirDialogDespesa = () => {
    setDescricaoDespesa("");
    setValorDespesa("");
    setCategoriaDespesa("Outros");
    setDataDespesa(new Date());
    setMetodoDespesa("PIX");
    setOpenDespesaDialog(true);
  };

  const registrarDespesa = async () => {
    if (!descricaoDespesa || !valorDespesa || !dataDespesa) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    await addDespesa({
      descricao: descricaoDespesa,
      valor: parseFloat(valorDespesa),
      categoria: categoriaDespesa,
      data: format(dataDespesa, "yyyy-MM-dd"),
      metodo_pagamento: metodoDespesa,
    });

    setOpenDespesaDialog(false);
  };

  // Preparar dados para o gráfico comparativo
  let dadosGrafico;
  let labelGrafico = "Entradas x Saídas (Últimos 7 Dias)";

  if (dataInicio && dataFim) {
    // Gráfico do período personalizado
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
    // Gráfico padrão (últimos 7 dias)
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
          onClick={() => setShowTotal(!showTotal)}
        >
          {showTotal ? (
            <Eye className="w-4 h-4 mr-2" />
          ) : (
            <EyeOff className="w-4 h-4 mr-2" />
          )}
          {showTotal ? "Ocultar" : "Mostrar"} Valores
        </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-primary/10 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">
                  {showTotal ? stat.value : "R$ •••,••"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

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
                    <td className="p-3">{ag.cliente_nome}</td>
                    <td className="p-3">{ag.servico_nome}</td>
                    <td className="p-3">{format(new Date(ag.data), "dd/MM/yyyy")}</td>
                    <td className="p-3">{ag.horario}</td>
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
                    <td className="p-3 text-muted-foreground">{format(new Date(desp.data), "dd/MM/yyyy")}</td>
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
        <h2 className="text-xl font-semibold mb-6">{labelGrafico}</h2>
        {pagamentos.length === 0 && despesas.length === 0 ? (
          <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Os dados serão exibidos conforme você registrar entradas e saídas</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `R$ ${value.toFixed(2).replace(".", ",")}`, 
                  name === "entradas" ? "Entradas" : "Saídas"
                ]}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="entradas" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="saidas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Pagamentos Recebidos</h2>
        {loadingPagamentos ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : pagamentos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum pagamento registrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Serviço</th>
                  <th className="text-left p-3">Valor</th>
                  <th className="text-left p-3">Método</th>
                  <th className="text-left p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.map((pag) => (
                  <tr key={pag.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{pag.cliente_nome}</td>
                    <td className="p-3">{pag.servico}</td>
                    <td className="p-3 font-semibold">
                      {showTotal ? `R$ ${Number(pag.valor).toFixed(2).replace(".", ",")}` : "R$ •••,••"}
                    </td>
                    <td className="p-3">{pag.metodo_pagamento}</td>
                    <td className="p-3 text-muted-foreground">{format(new Date(pag.data), "dd/MM/yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={openPagamentoDialog} onOpenChange={setOpenPagamentoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {agendamentoSelecionado && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Cliente</Label>
                <p className="font-medium">{agendamentoSelecionado.cliente_nome}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Serviço Original</Label>
                <p className="text-sm">{agendamentoSelecionado.servico_nome}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor Recebido</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 50.00"
                  value={valorEditado}
                  onChange={(e) => setValorEditado(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metodo">Método de Pagamento</Label>
                <Select value={metodoSelecionado} onValueChange={setMetodoSelecionado}>
                  <SelectTrigger id="metodo">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs">Observações (produtos, serviços extras, etc.)</Label>
                <Textarea
                  id="obs"
                  placeholder="Ex: Corte + Barba, comprou shampoo..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpenPagamentoDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={registrarPagamento} disabled={!valorEditado}>
                  Registrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openDespesaDialog} onOpenChange={setOpenDespesaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder="Ex: Aluguel, Produtos, etc."
                value={descricaoDespesa}
                onChange={(e) => setDescricaoDespesa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorDesp">Valor *</Label>
              <Input
                id="valorDesp"
                type="number"
                step="0.01"
                placeholder="Ex: 150.00"
                value={valorDespesa}
                onChange={(e) => setValorDespesa(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoriaDespesa} onValueChange={setCategoriaDespesa}>
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Produtos">Produtos</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
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
                    {dataDespesa ? format(dataDespesa, "dd/MM/yyyy") : "Selecione a data"}
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
            <div className="space-y-2">
              <Label htmlFor="metodoDesp">Método de Pagamento</Label>
              <Select value={metodoDespesa} onValueChange={setMetodoDespesa}>
                <SelectTrigger id="metodoDesp">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpenDespesaDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={registrarDespesa} disabled={!descricaoDespesa || !valorDespesa || !dataDespesa}>
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturamento;

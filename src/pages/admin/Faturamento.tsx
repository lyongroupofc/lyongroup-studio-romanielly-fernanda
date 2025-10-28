import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Faturamento = () => {
  const [showTotal, setShowTotal] = useState(true);
  const { agendamentos, loading: loadingAgendamentos } = useAgendamentos();
  const { pagamentos, loading: loadingPagamentos, addPagamento } = usePagamentos();
  const [openPagamentoDialog, setOpenPagamentoDialog] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("PIX");
  const [valorEditado, setValorEditado] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");

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

  // Preparar dados para o gráfico (últimos 7 dias)
  const ultimosDias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return format(date, "yyyy-MM-dd");
  });

  const dadosGrafico = ultimosDias.map((data) => {
    const faturamentoDia = pagamentos
      .filter((p) => p.data === data)
      .reduce((acc, p) => acc + parseFloat(String(p.valor || 0)), 0);
    return {
      dia: format(new Date(data), "dd/MM"),
      valor: faturamentoDia,
    };
  });

  const stats = [
    {
      label: "Faturamento Hoje",
      value: `R$ ${faturamentoHoje.toFixed(2).replace(".", ",")}`,
      icon: DollarSign,
      color: "text-success",
    },
    {
      label: "Faturamento do Mês",
      value: `R$ ${faturamentoMes.toFixed(2).replace(".", ",")}`,
      icon: TrendingUp,
      color: "text-primary",
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
          <h1 className="text-3xl font-bold">Faturamento</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as finanças do salão
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <h2 className="text-xl font-semibold mb-6">Faturamento dos Últimos 7 Dias</h2>
        {pagamentos.length === 0 ? (
          <div className="h-80 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-muted-foreground">Os dados serão exibidos conforme você registrar pagamentos</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="dia" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => [`R$ ${value.toFixed(2).replace(".", ",")}`, "Faturamento"]}
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
    </div>
  );
};

export default Faturamento;

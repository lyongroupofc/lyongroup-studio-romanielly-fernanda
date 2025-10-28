import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Faturamento = () => {
  const [showTotal, setShowTotal] = useState(true);
  const [pagamentos, setPagamentos] = useState([
    {
      id: 1,
      cliente: "Maria Silva",
      servico: "Corte + Escova",
      valor: "R$ 140,00",
      metodo: "PIX",
      status: "Pago",
      data: "28/10/2025",
    },
    {
      id: 2,
      cliente: "Ana Santos",
      servico: "Hidratação",
      valor: "R$ 100,00",
      metodo: "Cartão de Crédito",
      status: "Pendente",
      data: "28/10/2025",
    },
  ]);
  const [openPagamentoDialog, setOpenPagamentoDialog] = useState(false);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<null | { id: number; cliente: string; servico: string; valor: string; metodo: string; status: string; data: string }>(null);
  const [metodoSelecionado, setMetodoSelecionado] = useState<string>("PIX");

  const abrirPagamento = (pag: { id: number; cliente: string; servico: string; valor: string; metodo: string; status: string; data: string }) => {
    setPagamentoSelecionado(pag);
    setMetodoSelecionado(pag.metodo || "PIX");
    setOpenPagamentoDialog(true);
  };

  const aprovarPagamento = () => {
    if (!pagamentoSelecionado) return;
    setPagamentos((prev) =>
      prev.map((p) =>
        p.id === pagamentoSelecionado.id
          ? { ...p, status: "Pago", metodo: metodoSelecionado }
          : p
      )
    );
    setOpenPagamentoDialog(false);
    setPagamentoSelecionado(null);
    toast.success("Pagamento aprovado!");
  };

  const stats = [
    {
      label: "Faturamento Hoje",
      value: "R$ 1.240,00",
      icon: DollarSign,
      color: "text-success",
    },
    {
      label: "Faturamento do Mês",
      value: "R$ 18.560,00",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Pendentes",
      value: "R$ 720,00",
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
        <h2 className="text-xl font-semibold mb-6">Gráfico de Faturamento</h2>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Gráfico interativo será implementado aqui
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Pagamentos Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Serviço</th>
                <th className="text-left p-3">Valor</th>
                <th className="text-left p-3">Método</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((pag) => (
                <tr key={pag.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <button type="button" className="underline text-primary" onClick={() => abrirPagamento(pag)}>
                      {pag.cliente}
                    </button>
                  </td>
                  <td className="p-3">{pag.servico}</td>
                  <td className="p-3 font-semibold">
                    {showTotal ? pag.valor : "R$ •••,••"}
                  </td>
                  <td className="p-3">{pag.metodo}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        pag.status === "Pago"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {pag.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{pag.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={openPagamentoDialog} onOpenChange={setOpenPagamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Pagamento</DialogTitle>
          </DialogHeader>
          {pagamentoSelecionado && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Cliente: <span className="font-medium text-foreground">{pagamentoSelecionado.cliente}</span></p>
                <p>Serviço: <span className="font-medium text-foreground">{pagamentoSelecionado.servico}</span></p>
                <p>Valor: <span className="font-medium text-foreground">{showTotal ? pagamentoSelecionado.valor : "R$ •••,••"}</span></p>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Método de Pagamento</label>
                <Select value={metodoSelecionado} onValueChange={setMetodoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenPagamentoDialog(false)}>Cancelar</Button>
                <Button onClick={aprovarPagamento}>Aprovar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Faturamento;

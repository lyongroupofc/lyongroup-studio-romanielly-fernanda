import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

const Relatorios = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [analiseIA, setAnaliseIA] = useState("");
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const { agendamentos } = useAgendamentos();
  const { pagamentos } = usePagamentos();
  const { despesas } = useDespesas();
  const { toast } = useToast();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "RF9646") {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      gerarAnaliseIA();
    } else {
      toast({
        title: "Senha incorreta",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const gerarAnaliseIA = async () => {
    setLoadingAnalise(true);
    try {
      const hoje = new Date();
      const inicioMes = startOfMonth(hoje);
      const fimMes = endOfMonth(hoje);

      const agendamentosDoMes = agendamentos.filter(a => {
        const dataAgendamento = new Date(a.data);
        return dataAgendamento >= inicioMes && dataAgendamento <= fimMes;
      });

      const totalAgendamentos = agendamentosDoMes.length;
      const cancelados = agendamentosDoMes.filter(a => a.status === 'cancelado').length;
      const concluidos = agendamentosDoMes.filter(a => a.status === 'concluido').length;
      const reagendamentos = agendamentosDoMes.filter(a => a.observacoes?.toLowerCase().includes('reagendado')).length;

      const receitaTotal = pagamentos
        .filter(p => {
          const dataPagamento = new Date(p.data);
          return dataPagamento >= inicioMes && dataPagamento <= fimMes;
        })
        .reduce((sum, p) => sum + p.valor, 0);

      const despesasPorCategoria = despesas
        .filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa >= inicioMes && dataDespesa <= fimMes;
        })
        .reduce((acc, d) => {
          const cat = d.categoria || 'Outros';
          acc[cat] = (acc[cat] || 0) + d.valor;
          return acc;
        }, {} as Record<string, number>);

      const despesaTotal = Object.values(despesasPorCategoria).reduce((sum, val) => sum + val, 0);
      const lucroLiquido = receitaTotal - despesaTotal;

      const prompt = `Analise os seguintes dados do negócio de beleza (Studio Romanielly Fernanda) e forneça uma análise detalhada em texto corrido, como se fosse um consultor de negócios falando diretamente com o dono:

DADOS DO MÊS:
- Total de agendamentos: ${totalAgendamentos}
- Agendamentos concluídos: ${concluidos}
- Agendamentos cancelados: ${cancelados}
- Reagendamentos: ${reagendamentos}
- Receita total: R$ ${receitaTotal.toFixed(2)}
- Despesas totais: R$ ${despesaTotal.toFixed(2)}
- Lucro líquido: R$ ${lucroLiquido.toFixed(2)}
- Despesas por categoria: ${JSON.stringify(despesasPorCategoria)}

Forneça uma análise completa e profissional apontando:
1. **O que está indo BEM** no negócio (pontos positivos com base nos números)
2. **O que precisa de ATENÇÃO** ou melhoria (pontos de alerta)
3. **Onde está gastando MAIS dinheiro** (categoria de maior despesa)
4. **Onde está LUCRANDO mais** (relação receita x despesa)
5. **Tendências de CRESCIMENTO ou DECLÍNIO** (baseado nos dados disponíveis)
6. **Sugestões PRÁTICAS** de melhoria (ações concretas que podem ser tomadas)

Seja direto, profissional e use linguagem acessível. Escreva em TEXTO CORRIDO (não use listas com marcadores). Fale como um consultor conversando com o cliente.`;

      const { data, error } = await supabase.functions.invoke('gerar-relatorio', {
        body: { prompt }
      });

      if (error) throw error;

      setAnaliseIA(data.generatedText || "Análise não disponível no momento.");
    } catch (error) {
      console.error("Erro ao gerar análise:", error);
      toast({
        title: "Erro ao gerar análise",
        description: "Não foi possível gerar a análise automática.",
        variant: "destructive",
      });
      setAnaliseIA("Erro ao gerar análise. Tente novamente mais tarde.");
    } finally {
      setLoadingAnalise(false);
    }
  };

  const calcularRelatorio = (periodo: 'dia' | 'semana' | 'mes' | 'ano') => {
    const hoje = new Date();
    let inicio: Date, fim: Date;

    switch (periodo) {
      case 'dia':
        inicio = startOfDay(hoje);
        fim = endOfDay(hoje);
        break;
      case 'semana':
        inicio = startOfWeek(hoje, { locale: ptBR });
        fim = endOfWeek(hoje, { locale: ptBR });
        break;
      case 'mes':
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case 'ano':
        inicio = startOfYear(hoje);
        fim = endOfYear(hoje);
        break;
    }

    const agendamentosPeriodo = agendamentos.filter(a => {
      const dataAgendamento = new Date(a.data);
      return dataAgendamento >= inicio && dataAgendamento <= fim;
    });

    const pagamentosPeriodo = pagamentos.filter(p => {
      const dataPagamento = new Date(p.data);
      return dataPagamento >= inicio && dataPagamento <= fim;
    });

    const despesasPeriodo = despesas.filter(d => {
      const dataDespesa = new Date(d.data);
      return dataDespesa >= inicio && dataDespesa <= fim;
    });

    const totalAgendamentos = agendamentosPeriodo.length;
    const cancelados = agendamentosPeriodo.filter(a => a.status === 'cancelado').length;
    const concluidos = agendamentosPeriodo.filter(a => a.status === 'concluido').length;
    const reagendamentos = agendamentosPeriodo.filter(a => a.observacoes?.toLowerCase().includes('reagendado')).length;
    const taxaConclusao = totalAgendamentos > 0 ? ((concluidos / totalAgendamentos) * 100).toFixed(1) : '0';

    const receita = pagamentosPeriodo.reduce((sum, p) => sum + p.valor, 0);
    const despesa = despesasPeriodo.reduce((sum, d) => sum + d.valor, 0);
    const lucro = receita - despesa;

    return {
      periodo,
      totalAgendamentos,
      concluidos,
      cancelados,
      reagendamentos,
      taxaConclusao,
      receita,
      despesa,
      lucro,
      inicio,
      fim
    };
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso Restrito</DialogTitle>
            <DialogDescription>
              Digite a senha para acessar os relatórios
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Acessar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const relatorioDia = calcularRelatorio('dia');
  const relatorioSemana = calcularRelatorio('semana');
  const relatorioMes = calcularRelatorio('mes');
  const relatorioAno = calcularRelatorio('ano');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Relatórios e Análises
        </h1>
        <p className="text-muted-foreground">
          Análise completa do desempenho do seu negócio
        </p>
      </div>

      {/* Análise Automática por IA */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Análise Inteligente do Negócio
          </CardTitle>
          <CardDescription>
            Análise automática baseada nos dados do mês atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAnalise ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{analiseIA}</p>
            </div>
          )}
          <Button
            onClick={gerarAnaliseIA}
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={loadingAnalise}
          >
            {loadingAnalise ? "Gerando..." : "Atualizar Análise"}
          </Button>
        </CardContent>
      </Card>

      {/* Relatório do Dia */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Relatório do Dia
          </CardTitle>
          <CardDescription>
            {format(relatorioDia.inicio, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            Hoje você teve <strong>{relatorioDia.totalAgendamentos} agendamentos</strong> no total. Desses, <strong>{relatorioDia.concluidos} foram concluídos com sucesso</strong>, o que representa uma taxa de conclusão de <strong>{relatorioDia.taxaConclusao}%</strong>. {relatorioDia.cancelados > 0 && `Infelizmente, ${relatorioDia.cancelados} agendamento(s) foram cancelados. `}{relatorioDia.reagendamentos > 0 && `Além disso, houve ${relatorioDia.reagendamentos} reagendamento(s). `}
            Financeiramente, o dia gerou uma receita de <strong>R$ {relatorioDia.receita.toFixed(2)}</strong>, com despesas de <strong>R$ {relatorioDia.despesa.toFixed(2)}</strong>, resultando em um lucro líquido de <strong>R$ {relatorioDia.lucro.toFixed(2)}</strong>.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-lg font-bold text-green-600">R$ {relatorioDia.receita.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-600">R$ {relatorioDia.despesa.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={`text-lg font-bold ${relatorioDia.lucro >= 0 ? 'text-primary' : 'text-red-600'}`}>
                R$ {relatorioDia.lucro.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório da Semana */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Relatório da Semana
          </CardTitle>
          <CardDescription>
            {format(relatorioSemana.inicio, "dd/MM", { locale: ptBR })} - {format(relatorioSemana.fim, "dd/MM/yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            Durante esta semana, você realizou <strong>{relatorioSemana.totalAgendamentos} agendamentos</strong>, sendo <strong>{relatorioSemana.concluidos} atendimentos completados</strong>. {relatorioSemana.cancelados > 0 && `Foram registrados ${relatorioSemana.cancelados} cancelamento(s). `}{relatorioSemana.reagendamentos > 0 && `A semana também teve ${relatorioSemana.reagendamentos} reagendamento(s). `}
            No aspecto financeiro, a semana apresentou receita de <strong>R$ {relatorioSemana.receita.toFixed(2)}</strong>, despesas de <strong>R$ {relatorioSemana.despesa.toFixed(2)}</strong> e lucro de <strong>R$ {relatorioSemana.lucro.toFixed(2)}</strong>.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-lg font-bold text-green-600">R$ {relatorioSemana.receita.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-600">R$ {relatorioSemana.despesa.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={`text-lg font-bold ${relatorioSemana.lucro >= 0 ? 'text-primary' : 'text-red-600'}`}>
                R$ {relatorioSemana.lucro.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório do Mês */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Relatório do Mês
          </CardTitle>
          <CardDescription>
            {format(relatorioMes.inicio, "MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            O mês apresentou um desempenho com <strong>{relatorioMes.totalAgendamentos} agendamentos totais</strong>, dos quais <strong>{relatorioMes.concluidos} foram concluídos</strong>, representando uma taxa de conclusão de <strong>{relatorioMes.taxaConclusao}%</strong>. {relatorioMes.cancelados > 0 && `O mês registrou ${relatorioMes.cancelados} cancelamentos. `}{relatorioMes.reagendamentos > 0 && `Houve ${relatorioMes.reagendamentos} reagendamento(s) ao longo do período. `}
            Financeiramente, o mês gerou <strong>R$ {relatorioMes.receita.toFixed(2)}</strong> em receita, com <strong>R$ {relatorioMes.despesa.toFixed(2)}</strong> em despesas, resultando em um lucro líquido de <strong>R$ {relatorioMes.lucro.toFixed(2)}</strong>.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-lg font-bold text-green-600">R$ {relatorioMes.receita.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-600">R$ {relatorioMes.despesa.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={`text-lg font-bold ${relatorioMes.lucro >= 0 ? 'text-primary' : 'text-red-600'}`}>
                R$ {relatorioMes.lucro.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório do Ano */}
      <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            Relatório do Ano
          </CardTitle>
          <CardDescription>
            {format(relatorioAno.inicio, "yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">
            Ao longo de todo o ano, o negócio registrou <strong>{relatorioAno.totalAgendamentos} agendamentos</strong>, com <strong>{relatorioAno.concluidos} atendimentos concluídos</strong>. A taxa de conclusão anual foi de <strong>{relatorioAno.taxaConclusao}%</strong>. {relatorioAno.cancelados > 0 && `Durante o ano, houve ${relatorioAno.cancelados} cancelamentos. `}{relatorioAno.reagendamentos > 0 && `O ano apresentou ${relatorioAno.reagendamentos} reagendamento(s). `}
            No balanço financeiro anual, a receita totalizou <strong>R$ {relatorioAno.receita.toFixed(2)}</strong>, as despesas somaram <strong>R$ {relatorioAno.despesa.toFixed(2)}</strong>, e o lucro líquido do ano foi de <strong>R$ {relatorioAno.lucro.toFixed(2)}</strong>.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-lg font-bold text-green-600">R$ {relatorioAno.receita.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-600">R$ {relatorioAno.despesa.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Lucro</p>
              <p className={`text-lg font-bold ${relatorioAno.lucro >= 0 ? 'text-primary' : 'text-red-600'}`}>
                R$ {relatorioAno.lucro.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;

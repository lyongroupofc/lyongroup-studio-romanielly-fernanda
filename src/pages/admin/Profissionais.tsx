import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, Edit, Trash2, Loader2, DollarSign, Calendar, Percent, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useProfissionais, Profissional } from "@/hooks/useProfissionais";
import { useDespesas } from "@/hooks/useDespesas";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type ServicoDetalhado = {
  servico_nome: string;
  quantidade: number;
  valor_total: number;
};

type ComissaoData = {
  totalServicos: number;
  comissaoAPagar: number;
  servicosDetalhados: ServicoDetalhado[];
};

const Profissionais = () => {
  const [openNovoProfissional, setOpenNovoProfissional] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profissionalEditando, setProfissionalEditando] = useState<any>(null);
  const { profissionais, loading, addProfissional, updateProfissional, deleteProfissional, refetch } = useProfissionais();
  const { addDespesa } = useDespesas();
  
  // Estado para comissões expandidas
  const [comissoesExpandidas, setComissoesExpandidas] = useState<Record<string, boolean>>({});
  const [comissoesData, setComissoesData] = useState<Record<string, ComissaoData>>({});
  const [periodos, setPeriodos] = useState<Record<string, { inicio: string; fim: string }>>({});
  const [percentuais, setPercentuais] = useState<Record<string, number>>({});
  const [salvandoComissao, setSalvandoComissao] = useState<string | null>(null);
  
  // Inicializar períodos e percentuais quando profissionais carregam
  useEffect(() => {
    const hoje = new Date();
    const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
    const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');
    
    const novosPeridos: Record<string, { inicio: string; fim: string }> = {};
    const novosPercentuais: Record<string, number> = {};
    
    profissionais.forEach(prof => {
      if (!periodos[prof.id]) {
        novosPeridos[prof.id] = { inicio: inicioMes, fim: fimMes };
      }
      if (percentuais[prof.id] === undefined) {
        novosPercentuais[prof.id] = prof.comissao_percentual || 0;
      }
    });
    
    if (Object.keys(novosPeridos).length > 0) {
      setPeriodos(prev => ({ ...prev, ...novosPeridos }));
    }
    if (Object.keys(novosPercentuais).length > 0) {
      setPercentuais(prev => ({ ...prev, ...novosPercentuais }));
    }
  }, [profissionais]);
  
  const getIniciais = (nome: string) => {
    const partes = nome.split(" ");
    return partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}` : partes[0][0] + partes[0][1];
  };

  const calcularComissao = async (profissionalId: string) => {
    const periodo = periodos[profissionalId];
    const percentual = percentuais[profissionalId] || 0;
    
    if (!periodo) return;
    
    try {
      // Buscar agendamentos pagos do profissional no período
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('servico_nome, servico_id')
        .eq('profissional_id', profissionalId)
        .eq('status_pagamento', 'pago')
        .gte('data', periodo.inicio)
        .lte('data', periodo.fim)
        .not('status', 'in', '("Cancelado","Excluido")');
      
      if (error) throw error;
      
      // Buscar preços dos serviços
      const { data: servicos } = await supabase
        .from('servicos')
        .select('id, nome, preco');
      
      const servicosMap = new Map(servicos?.map(s => [s.id, s]) || []);
      
      // Agrupar serviços
      const servicosAgrupados: Record<string, { quantidade: number; valor_total: number }> = {};
      let totalGeral = 0;
      
      agendamentos?.forEach(ag => {
        const servico = servicosMap.get(ag.servico_id);
        const preco = servico?.preco || 0;
        const nome = ag.servico_nome || servico?.nome || 'Serviço';
        
        if (!servicosAgrupados[nome]) {
          servicosAgrupados[nome] = { quantidade: 0, valor_total: 0 };
        }
        servicosAgrupados[nome].quantidade += 1;
        servicosAgrupados[nome].valor_total += Number(preco);
        totalGeral += Number(preco);
      });
      
      const servicosDetalhados: ServicoDetalhado[] = Object.entries(servicosAgrupados).map(([nome, dados]) => ({
        servico_nome: nome,
        quantidade: dados.quantidade,
        valor_total: dados.valor_total
      }));
      
      setComissoesData(prev => ({
        ...prev,
        [profissionalId]: {
          totalServicos: totalGeral,
          comissaoAPagar: (totalGeral * percentual) / 100,
          servicosDetalhados
        }
      }));
    } catch (error) {
      console.error('Erro ao calcular comissão:', error);
      toast.error('Erro ao calcular comissão');
    }
  };
  
  const handleToggleComissao = async (profissionalId: string) => {
    const novoEstado = !comissoesExpandidas[profissionalId];
    setComissoesExpandidas(prev => ({ ...prev, [profissionalId]: novoEstado }));
    
    if (novoEstado) {
      await calcularComissao(profissionalId);
    }
  };
  
  const handleSalvarPercentual = async (profissionalId: string) => {
    const percentual = percentuais[profissionalId];
    await updateProfissional(profissionalId, { comissao_percentual: percentual });
    await calcularComissao(profissionalId);
  };
  
  const handlePagarComissao = async (profissional: Profissional) => {
    const comissao = comissoesData[profissional.id];
    const periodo = periodos[profissional.id];
    
    if (!comissao || comissao.comissaoAPagar <= 0) {
      toast.error('Não há comissão a pagar');
      return;
    }
    
    setSalvandoComissao(profissional.id);
    
    try {
      // 1. Criar despesa no Fluxo de Caixa
      const dataInicio = format(parseISO(periodo.inicio), 'dd/MM', { locale: ptBR });
      const dataFim = format(parseISO(periodo.fim), 'dd/MM', { locale: ptBR });
      
      await addDespesa({
        descricao: `Comissão - ${profissional.nome} (${dataInicio} a ${dataFim})`,
        valor: comissao.comissaoAPagar,
        categoria: 'Comissão de Profissional',
        data: format(new Date(), 'yyyy-MM-dd'),
        metodo_pagamento: 'PIX'
      });
      
      // 2. Registrar no histórico de comissões
      await supabase.from('comissoes_pagas').insert({
        profissional_id: profissional.id,
        profissional_nome: profissional.nome,
        valor_total_servicos: comissao.totalServicos,
        percentual_aplicado: percentuais[profissional.id],
        valor_comissao: comissao.comissaoAPagar,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim
      });
      
      toast.success(`Comissão de R$ ${comissao.comissaoAPagar.toFixed(2)} paga para ${profissional.nome}!`);
    } catch (error) {
      console.error('Erro ao pagar comissão:', error);
      toast.error('Erro ao registrar pagamento de comissão');
    } finally {
      setSalvandoComissao(null);
    }
  };

  const handleNovoProfissional = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    await addProfissional({
      nome: formData.get("nome") as string,
      telefone: formData.get("telefone") as string,
      email: formData.get("email") as string,
      especialidades: [(formData.get("especialidade") as string)],
    });
    
    setOpenNovoProfissional(false);
    form.reset();
  };

  const handleEditarProfissional = (profissional: any) => {
    setProfissionalEditando(profissional);
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    await updateProfissional(profissionalEditando.id, {
      nome: formData.get("nome") as string,
      telefone: formData.get("telefone") as string,
      email: formData.get("email") as string,
      especialidades: [(formData.get("especialidade") as string)],
    });
    
    setEditDialogOpen(false);
    setProfissionalEditando(null);
  };

  const handleExcluirProfissional = async (id: string) => {
    if (confirm("Deseja realmente remover este profissional?")) {
      await deleteProfissional(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Profissionais</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie a equipe do salão
          </p>
        </div>
        <Dialog open={openNovoProfissional} onOpenChange={setOpenNovoProfissional}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Profissional
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Profissional</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNovoProfissional} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome Completo</Label>
                <Input id="nome" name="nome" placeholder="Nome do profissional" required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" required />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input id="especialidade" name="especialidade" placeholder="Ex: Cabeleireira" required />
              </div>
              <Button type="submit" className="w-full">Cadastrar Profissional</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {profissionais.map((profissional) => (
          <Card key={profissional.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                  {getIniciais(profissional.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{profissional.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {profissional.especialidades?.[0] || "Profissional"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {profissional.telefone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {profissional.telefone}
                </div>
              )}
              {profissional.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="w-4 h-4 mr-2" />
                  {profissional.email}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditarProfissional(profissional)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExcluirProfissional(profissional.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Card de Comissões */}
            <Collapsible 
              open={comissoesExpandidas[profissional.id]} 
              onOpenChange={() => handleToggleComissao(profissional.id)}
              className="mt-4"
            >
              <CollapsibleTrigger asChild>
                <Button variant="secondary" className="w-full justify-between">
                  <span className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Comissões
                  </span>
                  {comissoesExpandidas[profissional.id] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Percentual de Comissão */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Percent className="w-3 h-3" />
                    Percentual de Comissão
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={percentuais[profissional.id] || 0}
                      onChange={(e) => setPercentuais(prev => ({
                        ...prev,
                        [profissional.id]: Number(e.target.value)
                      }))}
                      className="w-24"
                    />
                    <span className="flex items-center text-muted-foreground">%</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSalvarPercentual(profissional.id)}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>

                {/* Período */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Calendar className="w-3 h-3" />
                    Período
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      type="date"
                      value={periodos[profissional.id]?.inicio || ''}
                      onChange={(e) => {
                        setPeriodos(prev => ({
                          ...prev,
                          [profissional.id]: { ...prev[profissional.id], inicio: e.target.value }
                        }));
                      }}
                      className="w-36"
                    />
                    <span className="flex items-center text-muted-foreground">a</span>
                    <Input
                      type="date"
                      value={periodos[profissional.id]?.fim || ''}
                      onChange={(e) => {
                        setPeriodos(prev => ({
                          ...prev,
                          [profissional.id]: { ...prev[profissional.id], fim: e.target.value }
                        }));
                      }}
                      className="w-36"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => calcularComissao(profissional.id)}
                    >
                      Calcular
                    </Button>
                  </div>
                </div>

                {/* Resumo */}
                {comissoesData[profissional.id] && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total de Serviços Prestados:</span>
                      <span className="font-semibold">
                        R$ {comissoesData[profissional.id].totalServicos.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-primary">
                      <span className="text-sm font-medium">Comissão a Pagar ({percentuais[profissional.id]}%):</span>
                      <span className="font-bold text-lg">
                        R$ {comissoesData[profissional.id].comissaoAPagar.toFixed(2)}
                      </span>
                    </div>

                    {/* Lista de Serviços */}
                    {comissoesData[profissional.id].servicosDetalhados.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Serviços no Período:</p>
                        <ul className="space-y-1 text-xs">
                          {comissoesData[profissional.id].servicosDetalhados.map((s, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{s.quantidade}x {s.servico_nome}</span>
                              <span>R$ {s.valor_total.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-2"
                      onClick={() => handlePagarComissao(profissional)}
                      disabled={salvandoComissao === profissional.id || comissoesData[profissional.id].comissaoAPagar <= 0}
                    >
                      {salvandoComissao === profissional.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4 mr-2" />
                      )}
                      Pagar Comissão R$ {comissoesData[profissional.id].comissaoAPagar.toFixed(2)}
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
          </DialogHeader>
          {profissionalEditando && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">Nome Completo</Label>
                <Input 
                  id="edit-nome" 
                  name="nome" 
                  defaultValue={profissionalEditando.nome} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input 
                  id="edit-telefone" 
                  name="telefone" 
                  type="tel" 
                  defaultValue={profissionalEditando.telefone || ""} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-email">E-mail</Label>
                <Input 
                  id="edit-email" 
                  name="email" 
                  type="email" 
                  defaultValue={profissionalEditando.email || ""} 
                />
              </div>
              <div>
                <Label htmlFor="edit-especialidade">Especialidade</Label>
                <Input 
                  id="edit-especialidade" 
                  name="especialidade" 
                  defaultValue={profissionalEditando.especialidades?.[0] || ""} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full">Salvar Alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profissionais;

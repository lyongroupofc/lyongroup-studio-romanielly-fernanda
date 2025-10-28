import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Scissors, Edit, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useServicos } from "@/hooks/useServicos";

const Servicos = () => {
  const [openNovoServico, setOpenNovoServico] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<any>(null);
  const [unidadeTempo, setUnidadeTempo] = useState<"minutos" | "horas">("minutos");
  const [unidadeTempoEdit, setUnidadeTempoEdit] = useState<"minutos" | "horas">("minutos");
  const { servicos, loading, addServico, updateServico, deleteServico } = useServicos();
  
  const handleNovoServico = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const duracaoInput = parseInt(formData.get("duracao") as string);
    const duracaoEmMinutos = unidadeTempo === "horas" ? duracaoInput * 60 : duracaoInput;
    
    await addServico({
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string,
      preco: parseFloat(formData.get("preco") as string),
      duracao: duracaoEmMinutos,
    });
    
    setOpenNovoServico(false);
    setUnidadeTempo("minutos");
    form.reset();
  };

  const handleEditarServico = (servico: any) => {
    setServicoEditando(servico);
    // Detecta automaticamente se deve mostrar em horas ou minutos
    setUnidadeTempoEdit(servico.duracao >= 60 && servico.duracao % 60 === 0 ? "horas" : "minutos");
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const duracaoInput = parseInt(formData.get("duracao") as string);
    const duracaoEmMinutos = unidadeTempoEdit === "horas" ? duracaoInput * 60 : duracaoInput;
    
    await updateServico(servicoEditando.id, {
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string,
      preco: parseFloat(formData.get("preco") as string),
      duracao: duracaoEmMinutos,
    });
    
    setEditDialogOpen(false);
    setServicoEditando(null);
    setUnidadeTempoEdit("minutos");
  };

  const handleExcluirServico = async (id: string) => {
    if (confirm("Deseja realmente excluir este serviço?")) {
      await deleteServico(id);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os serviços oferecidos pelo salão
          </p>
        </div>
        <Dialog open={openNovoServico} onOpenChange={setOpenNovoServico}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Serviço</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleNovoServico} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Serviço</Label>
                <Input id="nome" name="nome" placeholder="Ex: Corte Feminino" required />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea 
                  id="descricao" 
                  name="descricao" 
                  placeholder="Descrição do serviço"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input 
                  id="preco" 
                  name="preco" 
                  type="number" 
                  step="0.01" 
                  placeholder="80.00" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duracao">Duração</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    id="duracao" 
                    name="duracao" 
                    type="number" 
                    placeholder={unidadeTempo === "horas" ? "2" : "60"}
                    required 
                  />
                  <Select value={unidadeTempo} onValueChange={(value: "minutos" | "horas") => setUnidadeTempo(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutos">Minutos</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Criar Serviço</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servicos.map((servico) => (
          <Card key={servico.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{servico.nome}</h3>
                </div>
              </div>
            </div>

            {servico.descricao && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {servico.descricao}
              </p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="font-medium">R$ {servico.preco.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                {servico.duracao >= 60 && servico.duracao % 60 === 0 
                  ? `${servico.duracao / 60} ${servico.duracao / 60 === 1 ? 'hora' : 'horas'}`
                  : `${servico.duracao} minutos`
                }
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditarServico(servico)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExcluirServico(servico.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
          </DialogHeader>
          {servicoEditando && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">Nome do Serviço</Label>
                <Input 
                  id="edit-nome" 
                  name="nome" 
                  defaultValue={servicoEditando.nome} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea 
                  id="edit-descricao" 
                  name="descricao" 
                  defaultValue={servicoEditando.descricao || ""} 
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-preco">Preço (R$)</Label>
                <Input 
                  id="edit-preco" 
                  name="preco" 
                  type="number" 
                  step="0.01" 
                  defaultValue={servicoEditando.preco} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-duracao">Duração</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    id="edit-duracao" 
                    name="duracao" 
                    type="number" 
                    defaultValue={unidadeTempoEdit === "horas" ? servicoEditando.duracao / 60 : servicoEditando.duracao}
                    required 
                  />
                  <Select value={unidadeTempoEdit} onValueChange={(value: "minutos" | "horas") => setUnidadeTempoEdit(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutos">Minutos</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Salvar Alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Servicos;

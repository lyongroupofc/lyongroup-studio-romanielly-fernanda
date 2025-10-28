import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Scissors, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

const Servicos = () => {
  const [openNovoServico, setOpenNovoServico] = useState(false);
  
  const handleNovoServico = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Serviço criado com sucesso!");
    setOpenNovoServico(false);
  };

  const handleEditarServico = (nome: string) => {
    toast.info(`Editando ${nome}`);
  };

  const handleExcluirServico = (nome: string) => {
    toast.success(`${nome} excluído com sucesso!`);
  };

  const servicos = [
    {
      id: 1,
      nome: "Corte Feminino",
      descricao: "Corte de cabelo feminino com estilo personalizado",
      preco: "R$ 80,00",
      duracao: "60 min",
    },
    {
      id: 2,
      nome: "Escova",
      descricao: "Escova modeladora com finalização",
      preco: "R$ 60,00",
      duracao: "45 min",
    },
    {
      id: 3,
      nome: "Hidratação",
      descricao: "Tratamento capilar hidratante",
      preco: "R$ 100,00",
      duracao: "90 min",
    },
  ];

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
                <Input id="nome" placeholder="Ex: Corte Feminino" required />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" placeholder="Descreva o serviço" required />
              </div>
              <div>
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input id="preco" type="number" step="0.01" placeholder="0,00" required />
              </div>
              <div>
                <Label htmlFor="duracao">Duração (minutos)</Label>
                <Input id="duracao" type="number" placeholder="60" required />
              </div>
              <Button type="submit" className="w-full">Criar Serviço</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicos.map((servico) => (
          <Card key={servico.id} className="p-6 hover-lift">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEditarServico(servico.nome)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive"
                  onClick={() => handleExcluirServico(servico.nome)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">{servico.nome}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {servico.descricao}
            </p>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-lg font-bold text-primary">
                {servico.preco}
              </span>
              <span className="text-sm text-muted-foreground">
                {servico.duracao}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Servicos;

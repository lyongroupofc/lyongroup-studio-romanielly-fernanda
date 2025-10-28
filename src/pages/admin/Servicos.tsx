import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Scissors, Edit, Trash2 } from "lucide-react";

const Servicos = () => {
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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicos.map((servico) => (
          <Card key={servico.id} className="p-6 hover-lift">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Scissors className="w-6 h-6 text-primary" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive">
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

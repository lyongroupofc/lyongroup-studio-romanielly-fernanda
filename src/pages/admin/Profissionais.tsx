import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, Calendar, Edit, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Profissionais = () => {
  const profissionais = [
    {
      id: 1,
      nome: "Jennifer Silva",
      telefone: "(11) 99999-9999",
      especialidade: "Cabeleireira e Proprietária",
      iniciais: "JS",
    },
    {
      id: 2,
      nome: "Ana Paula",
      telefone: "(11) 98888-8888",
      especialidade: "Manicure e Pedicure",
      iniciais: "AP",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a equipe do salão
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Profissional
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profissionais.map((profissional) => (
          <Card key={profissional.id} className="p-6 hover-lift">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-white text-lg">
                  {profissional.iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold">{profissional.nome}</h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    {profissional.especialidade}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {profissional.telefone}
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Agenda
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Profissionais;

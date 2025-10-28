import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, Calendar, Edit, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";

const Profissionais = () => {
  const navigate = useNavigate();
  const [openNovoProfissional, setOpenNovoProfissional] = useState(false);
  
  const handleNovoProfissional = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Profissional cadastrado com sucesso!");
    setOpenNovoProfissional(false);
  };

  const handleEditarProfissional = (nome: string) => {
    toast.info(`Editando ${nome}`);
  };

  const handleExcluirProfissional = (nome: string) => {
    toast.success(`${nome} removido com sucesso!`);
  };

  const handleVerAgenda = (nome: string) => {
    toast.info(`Visualizando agenda de ${nome}`);
  };

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
                <Input id="nome" placeholder="Nome do profissional" required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" type="tel" placeholder="(00) 00000-0000" required />
              </div>
              <div>
                <Label htmlFor="especialidade">Especialidade</Label>
                <Input id="especialidade" placeholder="Ex: Cabeleireira" required />
              </div>
              <Button type="submit" className="w-full">Cadastrar Profissional</Button>
            </form>
          </DialogContent>
        </Dialog>
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditarProfissional(profissional.nome)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleExcluirProfissional(profissional.nome)}
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
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => handleVerAgenda(profissional.nome)}
                >
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

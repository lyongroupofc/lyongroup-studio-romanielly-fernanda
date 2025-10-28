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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profissionalEditando, setProfissionalEditando] = useState<any>(null);
  const [profissionais, setProfissionais] = useState([
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
  ]);
  
  const getIniciais = (nome: string) => {
    const partes = nome.split(" ");
    return partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}` : partes[0][0] + partes[0][1];
  };

  const handleNovoProfissional = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nome = formData.get("nome") as string;
    const novoProfissional = {
      id: profissionais.length + 1,
      nome,
      telefone: formData.get("telefone") as string,
      especialidade: formData.get("especialidade") as string,
      iniciais: getIniciais(nome),
    };
    setProfissionais([...profissionais, novoProfissional]);
    toast.success("Profissional cadastrado com sucesso!");
    setOpenNovoProfissional(false);
    form.reset();
  };

  const handleEditarProfissional = (profissional: any) => {
    setProfissionalEditando(profissional);
    setEditDialogOpen(true);
  };

  const handleSalvarEdicao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const nome = formData.get("nome") as string;
    setProfissionais(profissionais.map(p => 
      p.id === profissionalEditando.id ? {
        ...p,
        nome,
        telefone: formData.get("telefone") as string,
        especialidade: formData.get("especialidade") as string,
        iniciais: getIniciais(nome),
      } : p
    ));
    toast.success("Profissional atualizado!");
    setEditDialogOpen(false);
    setProfissionalEditando(null);
  };

  const handleExcluirProfissional = (id: number) => {
    setProfissionais(profissionais.filter(p => p.id !== id));
    toast.success("Profissional removido com sucesso!");
  };

  const handleVerAgenda = (nome: string) => {
    toast.info(`Visualizando agenda de ${nome}`);
  };

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
                <Input id="nome" name="nome" placeholder="Nome do profissional" required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" required />
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
                      onClick={() => handleEditarProfissional(profissional)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleExcluirProfissional(profissional.id)}
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
          </DialogHeader>
          {profissionalEditando && (
            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">Nome Completo</Label>
                <Input id="edit-nome" name="nome" defaultValue={profissionalEditando.nome} required />
              </div>
              <div>
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input id="edit-telefone" name="telefone" type="tel" defaultValue={profissionalEditando.telefone} required />
              </div>
              <div>
                <Label htmlFor="edit-especialidade">Especialidade</Label>
                <Input id="edit-especialidade" name="especialidade" defaultValue={profissionalEditando.especialidade} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profissionais;

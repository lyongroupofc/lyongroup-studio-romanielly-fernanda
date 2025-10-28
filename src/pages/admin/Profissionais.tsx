import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, User, Phone, Edit, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useProfissionais } from "@/hooks/useProfissionais";

const Profissionais = () => {
  const [openNovoProfissional, setOpenNovoProfissional] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profissionalEditando, setProfissionalEditando] = useState<any>(null);
  const { profissionais, loading, addProfissional, updateProfissional, deleteProfissional } = useProfissionais();
  
  const getIniciais = (nome: string) => {
    const partes = nome.split(" ");
    return partes.length > 1 ? `${partes[0][0]}${partes[partes.length - 1][0]}` : partes[0][0] + partes[0][1];
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

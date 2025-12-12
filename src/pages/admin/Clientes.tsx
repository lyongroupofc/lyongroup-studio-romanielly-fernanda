import { useState, useMemo } from "react";
import { useClientes } from "@/hooks/useClientes";
import { useAgendamentos } from "@/hooks/useAgendamentos";
import { usePagamentos } from "@/hooks/usePagamentos";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, User, Phone, Calendar, Mail, Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Cliente } from "@/hooks/useClientes";

const Clientes = () => {
  const { clientes, loading, refetch, criarOuAtualizarCliente } = useClientes();
  const { agendamentos } = useAgendamentos();
  const { pagamentos } = usePagamentos();
  const [searchTerm, setSearchTerm] = useState("");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [editForm, setEditForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
  });
  const [newForm, setNewForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    data_nascimento: "",
  });

  const clientesFiltrados = clientes.filter(cliente => {
    const search = searchTerm.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(search) ||
      cliente.telefone.includes(search) ||
      (cliente.email && cliente.email.toLowerCase().includes(search))
    );
  });

  // Calcular total de atendimentos por cliente baseado em PAGAMENTOS CONFIRMADOS
  const atendimentosPorCliente = useMemo(() => {
    const contagem: Record<string, number> = {};
    
    // Para cada pagamento com status 'Pago', encontrar o cliente_id via agendamento
    pagamentos.forEach(pag => {
      if (pag.status === 'Pago' && pag.agendamento_id) {
        // Buscar o agendamento para pegar o cliente_id
        const agendamento = agendamentos.find(a => a.id === pag.agendamento_id);
        if (agendamento?.cliente_id) {
          contagem[agendamento.cliente_id] = (contagem[agendamento.cliente_id] || 0) + 1;
        }
      }
    });
    
    return contagem;
  }, [pagamentos, agendamentos]);

  const handleEditClick = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setEditForm({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email || "",
      data_nascimento: cliente.data_nascimento || "",
    });
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCliente) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: editForm.nome,
          telefone: editForm.telefone,
          email: editForm.email || null,
          data_nascimento: editForm.data_nascimento || null,
        })
        .eq("id", selectedCliente.id);

      if (error) throw error;

      toast.success("Cliente atualizado com sucesso!");
      setOpenEditDialog(false);
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente");
    }
  };

  const handleDeleteClick = async (cliente: Cliente) => {
    if (!confirm(`Tem certeza que deseja apagar o cliente ${cliente.nome}?`)) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", cliente.id);

      if (error) throw error;

      toast.success("Cliente removido com sucesso!");
      refetch();
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast.error("Erro ao remover cliente");
    }
  };

  const handleNewClienteClick = () => {
    setNewForm({
      nome: "",
      telefone: "",
      email: "",
      data_nascimento: "",
    });
    setOpenNewDialog(true);
  };

  const handleSaveNewCliente = async () => {
    if (!newForm.nome || !newForm.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    // Verificar se telefone já existe
    const clienteExistente = clientes.find(c => c.telefone === newForm.telefone);
    if (clienteExistente) {
      toast.error("Já existe um cliente com este telefone");
      return;
    }

    try {
      await criarOuAtualizarCliente({
        nome: newForm.nome,
        telefone: newForm.telefone,
        email: newForm.email || undefined,
        data_nascimento: newForm.data_nascimento || undefined,
      });

      toast.success("Cliente criado com sucesso!");
      setOpenNewDialog(false);
      refetch();
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      toast.error("Erro ao criar cliente");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-hover to-accent bg-clip-text text-transparent">
          Clientes
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie todos os seus clientes cadastrados
        </p>
      </div>

      {/* Busca e Botão Novo */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleNewClienteClick}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Cards de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientesFiltrados.map((cliente) => (
          <Card 
            key={cliente.id} 
            className="hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 border-l-4 border-l-primary"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary-hover to-accent flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="truncate">{cliente.nome}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{cliente.telefone}</span>
              </div>
              
              {cliente.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{cliente.email}</span>
                </div>
              )}
              
              {cliente.data_nascimento && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(cliente.data_nascimento + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              )}
              
              <div className="pt-2 border-t space-y-1">
                <span className="text-xs text-muted-foreground block">
                  Cliente desde {format(new Date(cliente.created_at!), "MMM/yyyy", { locale: ptBR })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {atendimentosPorCliente[cliente.id] || 0} {(atendimentosPorCliente[cliente.id] || 0) === 1 ? 'atendimento' : 'atendimentos'}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 hover:bg-primary/10 hover:text-primary hover:shadow-md hover:shadow-primary/30"
                onClick={() => handleEditClick(cliente)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 hover:bg-destructive/10 hover:text-destructive hover:shadow-md hover:shadow-destructive/30"
                onClick={() => handleDeleteClick(cliente)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Apagar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {clientesFiltrados.length === 0 && (
        <Card className="p-12 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "Tente buscar com outros termos" 
              : "Os clientes serão exibidos aqui após o primeiro agendamento"}
          </p>
        </Card>
      )}

      {/* Dialog Editar Cliente */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={editForm.data_nascimento}
                onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Cliente */}
      <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newForm.nome}
                onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                value={newForm.telefone}
                onChange={(e) => setNewForm({ ...newForm, telefone: e.target.value })}
                placeholder="(31) 98765-4321"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={newForm.data_nascimento}
                onChange={(e) => setNewForm({ ...newForm, data_nascimento: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNewCliente}>
                Criar Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;

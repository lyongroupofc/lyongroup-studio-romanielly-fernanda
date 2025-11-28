import { useState } from "react";
import { useClientes } from "@/hooks/useClientes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Phone, Calendar, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Clientes = () => {
  const { clientes, loading } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");

  const clientesFiltrados = clientes.filter(cliente => {
    const search = searchTerm.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(search) ||
      cliente.telefone.includes(search) ||
      (cliente.email && cliente.email.toLowerCase().includes(search))
    );
  });

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

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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
              
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Cliente desde {format(new Date(cliente.created_at!), "MMM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
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
    </div>
  );
};

export default Clientes;

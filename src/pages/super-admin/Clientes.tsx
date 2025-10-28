import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const Clientes = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie as contas dos seus clientes
          </p>
        </div>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="p-6">
        <p className="text-muted-foreground text-center py-8">
          Nenhum cliente cadastrado ainda.
        </p>
      </Card>
    </div>
  );
};

export default Clientes;
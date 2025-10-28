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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/admin', '_blank')}>
            Ver Painel Cliente
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-2">Jennifer Silva (Cliente)</h3>
            <p className="text-sm text-muted-foreground">jennifersilva@gmail.com</p>
            <p className="text-xs text-muted-foreground mt-1">Role: Admin</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Clientes;
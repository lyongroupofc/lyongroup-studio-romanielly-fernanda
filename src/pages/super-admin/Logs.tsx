import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Logs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Logs do Sistema</h1>
        <p className="text-muted-foreground">
          Visualize todos os eventos e erros do sistema
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Todos</Badge>
            <Badge variant="outline">Erros</Badge>
            <Badge variant="outline">Alertas</Badge>
            <Badge variant="outline">Info</Badge>
          </div>
        </div>

        <div className="text-center py-8 text-muted-foreground">
          Nenhum log registrado ainda.
        </div>
      </Card>
    </div>
  );
};

export default Logs;
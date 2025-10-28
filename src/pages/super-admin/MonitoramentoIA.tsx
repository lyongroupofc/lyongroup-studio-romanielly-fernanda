import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";

const MonitoramentoIA = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Monitoramento IA</h1>
        <p className="text-muted-foreground">
          Acompanhe o status e desempenho das IAs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-2">Gemini API</h3>
              <Badge className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Operacional
              </Badge>
            </div>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>Requisições hoje: 0</p>
            <p>Taxa de sucesso: 100%</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-2">Lovable AI</h3>
              <Badge className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Operacional
              </Badge>
            </div>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>Requisições hoje: 0</p>
            <p>Créditos disponíveis: Verificar</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Alertas Recentes</h2>
        <p className="text-muted-foreground text-center py-4">
          Nenhum alerta registrado.
        </p>
      </Card>
    </div>
  );
};

export default MonitoramentoIA;
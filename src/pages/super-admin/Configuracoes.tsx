import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Configure o comportamento do sistema
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Configurações de IA</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="gemini">Gemini API</Label>
              <p className="text-sm text-muted-foreground">
                Usar Gemini como IA principal
              </p>
            </div>
            <Switch id="gemini" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="lovable">Lovable AI (Fallback)</Label>
            <Switch id="lovable" defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Alertas</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert-80">Alerta 80% créditos</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando atingir 80% dos créditos
              </p>
            </div>
            <Switch id="alert-80" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert-90">Alerta 90% créditos</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando atingir 90% dos créditos
              </p>
            </div>
            <Switch id="alert-90" defaultChecked />
          </div>
        </div>
      </Card>

      <Button>Salvar Configurações</Button>
    </div>
  );
};

export default Configuracoes;
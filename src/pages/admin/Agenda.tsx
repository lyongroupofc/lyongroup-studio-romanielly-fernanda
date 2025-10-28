import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Filter } from "lucide-react";

const Agenda = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os agendamentos do salão
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <CalendarIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Calendário</h2>
        </div>
        <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">
            Calendário interativo será implementado aqui
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Agendamentos de Hoje</h2>
        <div className="space-y-3">
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Maria Silva</p>
                <p className="text-sm text-muted-foreground">
                  Corte + Escova • 14:00 - 15:30
                </p>
              </div>
              <span className="px-3 py-1 bg-success text-white text-sm rounded-full">
                Confirmado
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Agenda;

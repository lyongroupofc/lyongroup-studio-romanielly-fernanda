import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, Home } from "lucide-react";
import Footer from "@/components/Footer";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const Obrigado = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, horario } = location.state || {};

  return (
    <div className="min-h-screen gradient-soft flex flex-col relative">
      <AnimatedBackground />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center shadow-card">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Agendamento Confirmado! 🎉
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Muito obrigado pelo seu agendamento! Esperamos por você com todo carinho.
          </p>

          {data && horario && (
            <div className="bg-accent rounded-lg p-6 mb-8 space-y-3">
              <div className="flex items-center justify-center gap-3 text-accent-foreground">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">{data}</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-accent-foreground">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">{horario}</span>
              </div>
            </div>
          )}

          <p className="text-muted-foreground mb-8">
            Uma confirmação foi enviada para o seu WhatsApp 💬
          </p>

          <Button
            onClick={() => navigate("/agendar")}
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Fazer Novo Agendamento
          </Button>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Obrigado;

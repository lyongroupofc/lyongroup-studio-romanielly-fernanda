import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Clock, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen gradient-soft">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Studio Romanielly Fernanda</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Seja Bem-Vinda,{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Romanielly
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
              Este é o <span className="font-semibold text-primary">Studio Romanielly Fernanda</span> — o painel completo que vai{" "}
              <span className="font-semibold text-primary">revolucionar a gestão do seu negócio</span>{" "}
              com tecnologia, organização e automação estratégica.
            </p>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              💡 <span className="font-medium text-primary">Mas tem mais:</span> além do painel, você oferece serviços que transformam vidas — 
              beleza profissional, cuidados personalizados, bem-estar completo e muito mais.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button 
              size="lg" 
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => navigate("/agendar")}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Horário
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 border-2 hover:bg-primary/5"
              onClick={() => navigate("/login")}
            >
              Área Administrativa
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Horários Flexíveis</h3>
            <p className="text-muted-foreground leading-relaxed">
              Escolha o melhor horário para você, com disponibilidade em tempo real
            </p>
          </div>

          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Atendimento Premium</h3>
            <p className="text-muted-foreground leading-relaxed">
              Profissional qualificada e dedicada ao seu cuidado e bem-estar
            </p>
          </div>

          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Serviços Completos</h3>
            <p className="text-muted-foreground leading-relaxed">
              Desde cortes até tratamentos especiais para realçar sua beleza
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
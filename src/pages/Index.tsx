import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Clock, Users } from "lucide-react";
const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen gradient-soft">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Studio Jennifer Silva</h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Beleza e bem-estar em um só lugar. Agende seu horário de forma prática e rápida! ✨
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate("/agendar")}>
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Horário
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/login")}>
              Área Administrativa
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover-lift">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <Clock className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Horários Flexíveis</h3>
            <p className="text-muted-foreground">
              Escolha o melhor horário para você, com disponibilidade em tempo real
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover-lift">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Profissionais Qualificados</h3>
            <p className="text-muted-foreground">
              Equipe especializada e dedicada ao seu cuidado
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover-lift">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Variedade de Serviços</h3>
            <p className="text-muted-foreground">
              Desde cortes até tratamentos especiais para seu cabelo
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;
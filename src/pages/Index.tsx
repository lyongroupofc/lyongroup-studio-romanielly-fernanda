import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, TrendingUp, Palette, Zap, MessageCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen gradient-soft">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Full Beauty System by Lyon Group</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Seja Bem-Vinda,{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Romanielly Fernanda
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
              Este é o <span className="font-semibold text-primary">Full Beauty System</span> — o painel completo que vai{" "}
              <span className="font-semibold text-primary">revolucionar a gestão do seu negócio</span>{" "}
              com tecnologia, organização e automação estratégica.
            </p>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              💡 <span className="font-medium text-primary">Mas tem mais:</span> além do painel, você pode integrar serviços que aceleram resultados reais — 
              gestão de tráfego pago, identidade visual premium, social mídia profissional e muito mais.
            </p>
            
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              👇 Clique abaixo e fale com nossa equipe agora mesmo!
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
              variant="secondary" 
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
              onClick={() => window.open("https://api.whatsapp.com/send/?phone=5531991625182", "_blank")}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Falar com a Lyon Group
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
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Tráfego Pago</h3>
            <p className="text-muted-foreground leading-relaxed">
              Estratégias avançadas para atrair clientes qualificados todos os dias e maximizar seu ROI
            </p>
          </div>

          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Palette className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Design Premium</h3>
            <p className="text-muted-foreground leading-relaxed">
              Identidade visual sofisticada que eleva sua marca e conquista a confiança dos seus clientes
            </p>
          </div>

          <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Automação Inteligente</h3>
            <p className="text-muted-foreground leading-relaxed">
              Sistemas personalizados que otimizam seu atendimento e escalam seu negócio com eficiência
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
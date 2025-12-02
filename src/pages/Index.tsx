import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, TrendingUp, Palette, Zap, Users, Award, Target, Calendar, Shield } from "lucide-react";
import Footer from "@/components/Footer";
import lyonLogo from "@/assets/lyon-group-logo.jpeg";
import lyonBanner from "@/assets/lyon-banner.jpg";
import edmilaNova from "@/assets/edmila-nova.png";
import romaniellyNova from "@/assets/romanielly-nova.png";
import anaAndradeNova from "@/assets/ana-andrade-nova.png";
import anaAndradeEmbaixadora from "@/assets/ana-andrade-embaixadora.jpg";
import anaAndradeHero from "@/assets/ana-andrade-hero.png";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-4 fixed top-0 left-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-sm"></div>
              <div className="relative p-1 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <img src={lyonLogo} alt="Lyon Group" className="h-12 w-12 object-cover rounded-full" />
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Lyon Group</h3>
              <p className="text-xs md:text-sm text-white/90">Sua Agência Completa</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="bg-primary/10 border-primary/30 text-white hover:bg-primary hover:text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
            onClick={() => navigate("/login")}
          >
            Área Admin
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] md:min-h-screen flex items-center md:items-end overflow-hidden pt-24 md:pt-20 pb-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${lyonBanner})`,
            filter: 'brightness(0.6)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
        
        <div className="container mx-auto px-4 relative z-10 text-white pb-0">
          <div className="flex flex-col lg:flex-row items-end gap-8 lg:gap-12">
            {/* Conteúdo de texto à esquerda */}
            <div className="max-w-2xl lg:max-w-5xl text-center lg:text-left pb-16 lg:pb-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-6 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Crescer o seu negócio nunca foi tão fácil</span>
              </div>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Transforme seu negócio de beleza
                <br className="hidden lg:block" />
                em uma {""}
                <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  máquina de resultados
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-white/90 mb-8 max-w-xl">
                A Lyon Group é uma agência completa de marketing digital e automação para profissionais da beleza que querem crescer com estratégia e tecnologia
              </p>
              
              <Button 
                size="lg" 
                className="text-lg px-8 shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
                onClick={() => window.open("https://api.whatsapp.com/send/?phone=5531991625182", "_blank")}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar com a Lyon Group
              </Button>
            </div>
            
            {/* Fotos das embaixadoras à direita - encostadas no final da hero */}
            <div className="flex mt-8 lg:mt-0 items-end self-center lg:self-end justify-center">
              <div className="relative z-10 -mr-2 sm:-mr-4 lg:-mr-16">
                <div className="w-32 h-40 sm:w-40 sm:h-52 md:w-56 md:h-72 lg:w-72 lg:h-96 rounded-t-2xl overflow-hidden">
                  <img src={romaniellyNova} alt="Romanielly Fernanda - Embaixadora Lyon Group" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="relative z-20 -mr-2 sm:-mr-4 lg:-mr-16">
                <div className="w-36 h-48 sm:w-44 sm:h-60 md:w-60 md:h-80 lg:w-80 lg:h-96 rounded-t-2xl overflow-hidden">
                  <img src={anaAndradeHero} alt="Ana Andrade - Embaixadora Lyon Group" className="w-full h-full object-cover object-top md:object-center" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="w-32 h-40 sm:w-40 sm:h-52 md:w-56 md:h-72 lg:w-72 lg:h-96 rounded-t-2xl overflow-hidden">
                  <img src={edmilaNova} alt="Edmila Alice - Embaixadora Lyon Group" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embaixadoras Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Nossas Embaixadoras</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Conheça nossas embaixadoras</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group relative rounded-3xl overflow-hidden bg-card border border-border hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
              <div className="aspect-[4/5] relative overflow-hidden bg-white">
                <img 
                  src={anaAndradeEmbaixadora} 
                  alt="Ana Andrade" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Ana Andrade</h3>
                <p className="text-muted-foreground mb-2">Lash Designer e Mentora</p>
                <p className="text-sm text-primary font-semibold mb-3">Embaixadora Lyon Group</p>
                <a 
                  href="https://www.instagram.com/andrade.concept" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline"
                >
                  @andrade.concept
                </a>
              </div>
            </div>
            
            <div className="group relative rounded-3xl overflow-hidden bg-card border border-border hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
              <div className="aspect-[4/5] relative overflow-hidden">
                <img 
                  src={romaniellyNova} 
                  alt="Romanielly Fernanda" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Romanielly Fernanda</h3>
                <p className="text-muted-foreground mb-2">Nail Designer e Mentora</p>
                <p className="text-sm text-primary font-semibold mb-3">Embaixadora Lyon Group</p>
                <a 
                  href="https://www.instagram.com/romaniellyfernanda.nail" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline"
                >
                  @romaniellyfernanda.nail
                </a>
              </div>
            </div>
            
            <div className="group relative rounded-3xl overflow-hidden bg-card border border-border hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
              <div className="aspect-[4/5] relative overflow-hidden">
                <img 
                  src={edmilaNova} 
                  alt="Edmila Alice" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Edmila Alice</h3>
                <p className="text-muted-foreground mb-2">Design de Sobrancelhas e Mentora</p>
                <p className="text-sm text-primary font-semibold mb-3">Embaixadora Lyon Group</p>
                <a 
                  href="https://www.instagram.com/edmilaalice" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline"
                >
                  @edmilaalice
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Soluções Section */}
      <section className="py-20 bg-gradient-to-b from-secondary/20 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Soluções Completas para seu Negócio</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Integre serviços estratégicos que aceleram resultados reais
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Tráfego Pago</h3>
              <p className="text-muted-foreground leading-relaxed">
                Estratégias avançadas para atrair clientes qualificados todos os dias e maximizar seu ROI
              </p>
            </div>

            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Social Media</h3>
              <p className="text-muted-foreground leading-relaxed">
                Presença digital que gera autoridade, conexão e resultados reais
              </p>
            </div>

            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Automação Inteligente</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sistemas personalizados que otimizam seu atendimento e escalam seu negócio com eficiência
              </p>
            </div>

            <div className="text-center space-y-4 p-8 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Gestão & Crescimento</h3>
              <p className="text-muted-foreground leading-relaxed">
                Dados e estratégias para escalar com segurança e profissionalismo
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                5+
              </div>
              <p className="text-lg font-semibold">Anos de Experiência</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                98%
              </div>
              <p className="text-lg font-semibold">Taxa de Satisfação</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                +3x
              </div>
              <p className="text-lg font-semibold">Crescimento Médio</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Fale com nossa equipe e descubra como a Lyon Group pode acelerar seus resultados
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 shadow-lg hover:shadow-xl hover:shadow-primary/50 transition-all duration-300"
            onClick={() => window.open("https://api.whatsapp.com/send/?phone=5531991625182", "_blank")}
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com a Lyon Group
          </Button>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;

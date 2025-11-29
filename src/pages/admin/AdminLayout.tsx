import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  DollarSign,
  MessageCircle,
  LogOut,
  Clock,
  Sparkle,
  Bell,
  Cake,
  BarChart3,
  Package,
  Award,
  Workflow,
  Bot,
  Headphones,
  GraduationCap,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { NavLink } from "@/components/NavLink";
import { format } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import Footer from "@/components/Footer";
import lyonLogo from "@/assets/lyon-group-logo.jpeg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin", end: true },
  { icon: Calendar, label: "Agenda", path: "/admin/agenda" },
  { icon: Users, label: "Clientes", path: "/admin/clientes" },
  { icon: Scissors, label: "Serviços", path: "/admin/servicos" },
  { icon: Users, label: "Profissionais", path: "/admin/profissionais" },
  { icon: DollarSign, label: "Fluxo de Caixa", path: "/admin/faturamento" },
  { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
  { icon: Sparkle, label: "Marketing", path: "/admin/marketing", end: true },
  { icon: Package, label: "Estoque", path: "/admin/estoque" },
  { icon: Award, label: "Clube da Fidelidade", path: "/admin/fidelidade" },
  { icon: Workflow, label: "Lyon Flow", path: "/admin/marketing-automatico" },
  { icon: Bot, label: "Lyon Bot", path: "/admin/bot-whatsapp" },
  { icon: Bell, label: "Avisos", path: "/admin/lembretes" },
  { icon: Cake, label: "Aniversariantes", path: "/admin/aniversariantes" },
  { icon: GraduationCap, label: "Tutoriais", path: "/admin/tutoriais" },
  { icon: Headphones, label: "Suporte", path: "/admin/suporte" },
];

function AppSidebar() {
  const { signOut } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const updateTime = () => {
      setCurrentTime(new Date());
    };
    
    intervalRef.current = setInterval(updateTime, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className={collapsed ? "w-20" : "w-72"} collapsible="icon">
      <SidebarContent>
        {/* Card Dourado com Studio e Horário */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary-hover to-accent p-4 shadow-lg">
            {collapsed ? (
              // Modo recolhido: só horário
              <div className="flex flex-col items-center gap-1">
                <Clock className="w-5 h-5 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground tabular-nums">
                  {format(currentTime, "HH:mm")}
                </span>
              </div>
            ) : (
              // Modo expandido: Studio + Horário
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-5 h-5 text-primary-foreground" />
                  <h2 className="text-base font-bold text-primary-foreground leading-tight">
                    Studio Romanielly Fernanda
                  </h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-primary-foreground/10 backdrop-blur-sm rounded-lg border border-primary-foreground/20">
                  <Clock className="w-4 h-4 text-primary-foreground" />
                  <span className="text-xl font-bold tabular-nums text-primary-foreground">
                    {format(currentTime, "HH:mm:ss")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu de Navegação */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end={item.end || item.path === "/admin"}
                      className="hover:bg-muted/50 transition-colors"
                      activeClassName="bg-muted text-primary font-medium"
                      onClick={handleNavClick}
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const AdminLayout = () => {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header com Trigger */}
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              <SidebarTrigger className="mr-2" />
              <div className="flex items-center gap-3">
                <NotificationBell />
                
                {/* Menu de Configurações do Administrador */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none focus:ring-2 focus:ring-primary rounded-full hover:ring-2 hover:ring-primary/50 transition-all">
                      <img 
                        src={lyonLogo} 
                        alt="Lyon Group" 
                        className="h-10 w-10 object-cover rounded-full shadow-lg cursor-pointer"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {/* Informações da Conta */}
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <p className="font-medium truncate">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Aparência */}
                    <DropdownMenuLabel>Aparência</DropdownMenuLabel>
                    <DropdownMenuItem onClick={toggleTheme}>
                      {theme === "dark" ? (
                        <>
                          <Sun className="w-4 h-4 mr-2" />
                          Tema Claro
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 mr-2" />
                          Tema Escuro
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Sair */}
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair da conta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8 relative">
            <AnimatedBackground />
            <Outlet />
          </main>
          
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Calendar, label: "Agenda", path: "/admin/agenda" },
  { icon: Scissors, label: "Serviços", path: "/admin/servicos" },
  { icon: Users, label: "Profissionais", path: "/admin/profissionais" },
  { icon: DollarSign, label: "Faturamento", path: "/admin/faturamento" },
  { icon: MessageCircle, label: "Bot WhatsApp", path: "/admin/bot-whatsapp" },
];

function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
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
                      end={item.path === "/admin"}
                      className="hover:bg-muted/50 transition-colors"
                      activeClassName="bg-muted text-primary font-medium"
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
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header com Trigger */}
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="mr-2" />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

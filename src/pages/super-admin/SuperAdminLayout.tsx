import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut,
  Bot,
  FileText,
  DollarSign
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const SuperAdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/super-admin" },
    { icon: Users, label: "Clientes", path: "/super-admin/clientes" },
    { icon: Bot, label: "Monitoramento IA", path: "/super-admin/ia" },
    { icon: DollarSign, label: "Custos", path: "/super-admin/custos" },
    { icon: FileText, label: "Logs", path: "/super-admin/logs" },
    { icon: Settings, label: "Configurações", path: "/super-admin/config" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text">Super Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle Total</p>
        </div>

        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;
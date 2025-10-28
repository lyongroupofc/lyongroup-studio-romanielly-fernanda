import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Agendar from "./pages/Agendar";
import Obrigado from "./pages/Obrigado";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Agenda from "./pages/admin/Agenda";
import Servicos from "./pages/admin/Servicos";
import Profissionais from "./pages/admin/Profissionais";
import Faturamento from "./pages/admin/Faturamento";
import BotWhatsApp from "./pages/admin/BotWhatsApp";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminLayout from "./pages/super-admin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import Clientes from "./pages/super-admin/Clientes";
import MonitoramentoIA from "./pages/super-admin/MonitoramentoIA";
import Custos from "./pages/super-admin/Custos";
import Logs from "./pages/super-admin/Logs";
import Configuracoes from "./pages/super-admin/Configuracoes";
import CreateSuperAdmin from "./pages/setup/CreateSuperAdmin";
import ResetSuperAdminPassword from "./pages/setup/ResetSuperAdminPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<CreateSuperAdmin />} />
          <Route path="/reset-password" element={<ResetSuperAdminPassword />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminLayout /></ProtectedRoute>}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="ia" element={<MonitoramentoIA />} />
            <Route path="custos" element={<Custos />} />
            <Route path="logs" element={<Logs />} />
            <Route path="config" element={<Configuracoes />} />
          </Route>
          
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="profissionais" element={<Profissionais />} />
            <Route path="faturamento" element={<Faturamento />} />
            <Route path="bot-whatsapp" element={<BotWhatsApp />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

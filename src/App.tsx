import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Agendar from "./pages/Agendar";
import Obrigado from "./pages/Obrigado";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import SuperAdminLayout from "./pages/super-admin/SuperAdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Agenda = lazy(() => import("./pages/admin/Agenda"));
const Servicos = lazy(() => import("./pages/admin/Servicos"));
const Profissionais = lazy(() => import("./pages/admin/Profissionais"));
const Faturamento = lazy(() => import("./pages/admin/Faturamento"));
const BotWhatsApp = lazy(() => import("./pages/admin/BotWhatsApp"));
const ChatAssistente = lazy(() => import("./pages/admin/ChatAssistente"));

// Lazy load setup pages
const CreateSuperAdmin = lazy(() => import("./pages/setup/CreateSuperAdmin"));
const ResetSuperAdminPassword = lazy(() => import("./pages/setup/ResetSuperAdminPassword"));
const CreateCliente = lazy(() => import("./pages/setup/CreateCliente"));

// Lazy load super admin pages
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const Clientes = lazy(() => import("./pages/super-admin/Clientes"));
const Configuracoes = lazy(() => import("./pages/super-admin/Configuracoes"));
const MonitoramentoIA = lazy(() => import("./pages/super-admin/MonitoramentoIA"));
const Custos = lazy(() => import("./pages/super-admin/Custos"));
const Logs = lazy(() => import("./pages/super-admin/Logs"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={
            <Suspense fallback={<PageLoader />}>
              <CreateSuperAdmin />
            </Suspense>
          } />
          <Route path="/reset-password" element={
            <Suspense fallback={<PageLoader />}>
              <ResetSuperAdminPassword />
            </Suspense>
          } />
          <Route path="/setup-cliente" element={
            <Suspense fallback={<PageLoader />}>
              <CreateCliente />
            </Suspense>
          } />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminLayout /></ProtectedRoute>}>
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <SuperAdminDashboard />
              </Suspense>
            } />
            <Route path="clientes" element={
              <Suspense fallback={<PageLoader />}>
                <Clientes />
              </Suspense>
            } />
            <Route path="ia" element={
              <Suspense fallback={<PageLoader />}>
                <MonitoramentoIA />
              </Suspense>
            } />
            <Route path="custos" element={
              <Suspense fallback={<PageLoader />}>
                <Custos />
              </Suspense>
            } />
            <Route path="logs" element={
              <Suspense fallback={<PageLoader />}>
                <Logs />
              </Suspense>
            } />
            <Route path="config" element={
              <Suspense fallback={<PageLoader />}>
                <Configuracoes />
              </Suspense>
            } />
          </Route>
          
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
            <Route index element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="agenda" element={
              <Suspense fallback={<PageLoader />}>
                <Agenda />
              </Suspense>
            } />
            <Route path="servicos" element={
              <Suspense fallback={<PageLoader />}>
                <Servicos />
              </Suspense>
            } />
            <Route path="profissionais" element={
              <Suspense fallback={<PageLoader />}>
                <Profissionais />
              </Suspense>
            } />
            <Route path="faturamento" element={
              <Suspense fallback={<PageLoader />}>
                <Faturamento />
              </Suspense>
            } />
            <Route path="bot-whatsapp" element={
              <Suspense fallback={<PageLoader />}>
                <BotWhatsApp />
              </Suspense>
            } />
            <Route path="chat-assistente" element={
              <Suspense fallback={<PageLoader />}>
                <ChatAssistente />
              </Suspense>
            } />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

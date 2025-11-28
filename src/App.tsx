import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Agendar from "./pages/Agendar";
import Obrigado from "./pages/Obrigado";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Agenda = lazy(() => import("./pages/admin/Agenda"));
const Clientes = lazy(() => import("./pages/admin/Clientes"));
const Servicos = lazy(() => import("./pages/admin/Servicos"));
const Profissionais = lazy(() => import("./pages/admin/Profissionais"));
const Faturamento = lazy(() => import("./pages/admin/Faturamento"));
const BotWhatsApp = lazy(() => import("./pages/admin/BotWhatsApp"));
const Lembretes = lazy(() => import("./pages/admin/Lembretes"));
const Aniversariantes = lazy(() => import("./pages/admin/Aniversariantes"));

// Lazy load setup pages
const CreateCliente = lazy(() => import("./pages/setup/CreateCliente"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 15 * 60 * 1000, // 15 minutos
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/setup-cliente" element={
              <Suspense fallback={<PageLoader />}>
                <CreateCliente />
              </Suspense>
            } />
            <Route path="/agendar" element={<Agendar />} />
            <Route path="/obrigado" element={<Obrigado />} />
            
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
            <Route path="clientes" element={
              <Suspense fallback={<PageLoader />}>
                <Clientes />
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
              <Route path="lembretes" element={
                <Suspense fallback={<PageLoader />}>
                  <Lembretes />
                </Suspense>
              } />
              <Route path="aniversariantes" element={
                <Suspense fallback={<PageLoader />}>
                  <Aniversariantes />
                </Suspense>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetSuperAdminPassword = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resetPassword = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resetar-senha-super-admin', {
        body: {
          email: 'yenworksmkt@gmail.com',
          novaSenha: 'Aformula21@'
        }
      });

      if (error) throw error;

      toast.success('Senha resetada com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Resetar Senha</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Trocar senha do Super Admin para: <strong>Aformula21@</strong>
        </p>
        <Button 
          onClick={resetPassword} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Resetando...' : 'Resetar Senha'}
        </Button>
      </Card>
    </div>
  );
};

export default ResetSuperAdminPassword;
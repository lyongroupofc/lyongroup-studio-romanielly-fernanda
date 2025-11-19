import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CreateCliente = () => {
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const navigate = useNavigate();

  const createCliente = async () => {
    setLoading(true);
    try {
      // Criar usuário com role admin
      const { data, error } = await supabase.functions.invoke('setup-romanielly');

      if (error) throw error;

      toast.success('Usuário criado! Email: romanielly@gmail.com, Senha: 96469394');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Setup Cliente</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Clique no botão abaixo para criar a conta de admin
        </p>
        <div className="space-y-4 mb-6 text-center text-sm text-muted-foreground">
          <p>Email: romanielly@gmail.com</p>
          <p>Senha: 96469394</p>
        </div>
        <Button 
          onClick={createCliente} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Criando...' : 'Criar Usuário'}
        </Button>
      </Card>
    </div>
  );
};

export default CreateCliente;
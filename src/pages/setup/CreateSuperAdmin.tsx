import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CreateSuperAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const navigate = useNavigate();

  const createSuperAdmin = async () => {
    if (!secret) {
      toast.error('Secret é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('criar-super-admin', {
        body: {
          secret,
          email: 'yenworksmkt@gmail.com',
          password: 'A formula21@',
          nome: 'Super Admin'
        }
      });

      if (error) throw error;

      toast.success('Super Admin criado com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar super admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Setup Inicial</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Criar conta Super Admin
        </p>
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="secret">Admin Creation Secret</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Digite o secret configurado"
            />
          </div>
        </div>
        <Button 
          onClick={createSuperAdmin} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Criando...' : 'Criar Super Admin'}
        </Button>
      </Card>
    </div>
  );
};

export default CreateSuperAdmin;
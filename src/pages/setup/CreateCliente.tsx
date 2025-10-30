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
    if (!secret) {
      toast.error('Secret é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Criar usuário com role admin
      const { data, error } = await supabase.functions.invoke('criar-super-admin', {
        body: {
          secret,
          email: 'jennifersilva@gmail.com',
          password: '96862422',
          nome: 'Jennifer Silva'
        }
      });

      if (error) throw error;

      // Agora atualizar a role para 'admin' ao invés de 'super_admin'
      const { data: { user } } = await supabase.auth.signInWithPassword({
        email: 'yenworksmkt@gmail.com',
        password: 'Aformula21@'
      });

      if (user) {
        // Buscar o ID do usuário criado
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'jennifersilva@gmail.com')
          .single();

        if (profiles) {
          // Atualizar role para admin
          await supabase
            .from('user_roles')
            .update({ role: 'admin' })
            .eq('user_id', profiles.id);
        }

        await supabase.auth.signOut();
      }

      toast.success('Cliente criado com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Setup Cliente</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Criar conta para Jennifer Silva (Admin)
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
          onClick={createCliente} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Criando...' : 'Criar Cliente'}
        </Button>
      </Card>
    </div>
  );
};

export default CreateCliente;
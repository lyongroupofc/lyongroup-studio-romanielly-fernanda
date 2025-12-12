import { useState, useEffect } from 'react';
import { useFidelidade } from '@/hooks/useFidelidade';
import { useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Heart, Trophy, Star, Flame, Snowflake, ThermometerSun, Gift } from 'lucide-react';

const Fidelidade = () => {
  const { fidelidades, regras, loading, atualizarRegras, resgatarPontos, refetch } = useFidelidade();
  const { clientes } = useClientes();
  const [regrasDialogOpen, setRegrasDialogOpen] = useState(false);
  const [resgateDialogOpen, setResgateDialogOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [pontosResgate, setPontosResgate] = useState('');
  const [regrasFormData, setRegrasFormData] = useState({
    pontos_por_real: '',
    pontos_resgate: '',
    desconto_resgate: '',
  });

  useEffect(() => {
    if (regras) {
      setRegrasFormData({
        pontos_por_real: regras.pontos_por_real?.toString() || '1',
        pontos_resgate: regras.pontos_resgate?.toString() || '100',
        desconto_resgate: regras.desconto_resgate?.toString() || '10',
      });
    }
  }, [regras]);

  const handleRegrasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await atualizarRegras({
        pontos_por_real: parseInt(regrasFormData.pontos_por_real),
        pontos_resgate: parseInt(regrasFormData.pontos_resgate),
        desconto_resgate: parseFloat(regrasFormData.desconto_resgate),
      });
      setRegrasDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleResgate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resgatarPontos(selectedClienteId, parseInt(pontosResgate));
      setResgateDialogOpen(false);
      setSelectedClienteId('');
      setPontosResgate('');
    } catch (error) {
      console.error(error);
    }
  };

  const getClienteNome = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.nome || 'Cliente não encontrado';
  };

  const getClienteTelefone = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.telefone || '';
  };

  const getNivelIcon = (nivel: string | null) => {
    switch (nivel) {
      case 'bronze':
        return <Snowflake className="w-5 h-5 text-amber-600" />;
      case 'prata':
        return <ThermometerSun className="w-5 h-5 text-gray-400" />;
      case 'ouro':
        return <Flame className="w-5 h-5 text-yellow-500" />;
      default:
        return <ThermometerSun className="w-5 h-5" />;
    }
  };

  const getNivelBadgeVariant = (nivel: string | null) => {
    switch (nivel) {
      case 'ouro':
        return 'default';
      case 'prata':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const openResgateDialog = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setResgateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando programa de fidelidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            Programa de Fidelidade
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie pontos e recompensas dos clientes
          </p>
        </div>
        <Dialog open={regrasDialogOpen} onOpenChange={setRegrasDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Trophy className="w-4 h-4" />
              Configurar Regras
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regras de Fidelidade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRegrasSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pontos_por_real">Pontos por Real Gasto</Label>
                <Input
                  id="pontos_por_real"
                  type="number"
                  value={regrasFormData.pontos_por_real}
                  onChange={(e) =>
                    setRegrasFormData({ ...regrasFormData, pontos_por_real: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: 1 ponto para cada R$ 1,00 gasto
                </p>
              </div>
              <div>
                <Label htmlFor="pontos_resgate">Pontos para Resgate</Label>
                <Input
                  id="pontos_resgate"
                  type="number"
                  value={regrasFormData.pontos_resgate}
                  onChange={(e) =>
                    setRegrasFormData({ ...regrasFormData, pontos_resgate: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: 100 pontos necessários para resgate
                </p>
              </div>
              <div>
                <Label htmlFor="desconto_resgate">Desconto do Resgate (R$)</Label>
                <Input
                  id="desconto_resgate"
                  type="number"
                  step="0.01"
                  value={regrasFormData.desconto_resgate}
                  onChange={(e) =>
                    setRegrasFormData({ ...regrasFormData, desconto_resgate: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: R$ 10,00 de desconto ao resgatar
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setRegrasDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Regras</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Card de Regras Atuais */}
      {regras && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Regras Atuais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{regras.pontos_por_real}</p>
                <p className="text-sm text-muted-foreground">Pontos por R$</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{regras.pontos_resgate}</p>
                <p className="text-sm text-muted-foreground">Pontos p/ Resgate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  R$ {regras.desconto_resgate?.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Valor do Desconto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Clientes com Fidelidade */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {fidelidades.map((fidelidade) => (
          <Card key={fidelidade.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{getClienteNome(fidelidade.cliente_id)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getClienteTelefone(fidelidade.cliente_id)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getNivelIcon(fidelidade.nivel)}
                  <Badge variant={getNivelBadgeVariant(fidelidade.nivel)}>
                    {fidelidade.nivel?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pontos Acumulados</span>
                  <span className="text-xl font-bold text-primary">
                    {fidelidade.pontos_acumulados || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Gasto</span>
                  <span className="font-semibold">
                    R$ {fidelidade.total_gasto?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total de Serviços</span>
                  <span className="font-semibold">{fidelidade.total_servicos || 0}</span>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => openResgateDialog(fidelidade.cliente_id)}
                disabled={(fidelidade.pontos_acumulados || 0) < (regras?.pontos_resgate || 100)}
              >
                <Gift className="w-4 h-4" />
                Resgatar Pontos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Resgate */}
      <Dialog open={resgateDialogOpen} onOpenChange={setResgateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar Pontos</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResgate} className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Input value={getClienteNome(selectedClienteId)} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Pontos Disponíveis</Label>
              <Input
                value={
                  fidelidades.find((f) => f.cliente_id === selectedClienteId)?.pontos_acumulados || 0
                }
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="pontos_resgate_input">Pontos a Resgatar *</Label>
              <Input
                id="pontos_resgate_input"
                type="number"
                value={pontosResgate}
                onChange={(e) => setPontosResgate(e.target.value)}
                required
                max={fidelidades.find((f) => f.cliente_id === selectedClienteId)?.pontos_acumulados || 0}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResgateDialogOpen(false);
                  setSelectedClienteId('');
                  setPontosResgate('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Confirmar Resgate</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fidelidade;

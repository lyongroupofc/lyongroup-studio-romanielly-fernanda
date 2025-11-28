import { useState } from 'react';
import { usePromocoes, Promocao } from '@/hooks/usePromocoes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles, Edit, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Marketing = () => {
  const { promocoes, loading, adicionarPromocao, atualizarPromocao, deletarPromocao } = usePromocoes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPromocao, setSelectedPromocao] = useState<Promocao | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    motivo: '',
    desconto_porcentagem: '',
    desconto_valor: '',
    data_inicio: '',
    data_fim: '',
    ativa: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adicionarPromocao({
        nome: formData.nome,
        descricao: formData.descricao || null,
        motivo: formData.motivo || null,
        desconto_porcentagem: formData.desconto_porcentagem ? parseFloat(formData.desconto_porcentagem) : null,
        desconto_valor: formData.desconto_valor ? parseFloat(formData.desconto_valor) : null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        ativa: formData.ativa,
      });
      setDialogOpen(false);
      setFormData({
        nome: '',
        descricao: '',
        motivo: '',
        desconto_porcentagem: '',
        desconto_valor: '',
        data_inicio: '',
        data_fim: '',
        ativa: true,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromocao) return;

    try {
      await atualizarPromocao(selectedPromocao.id, {
        nome: formData.nome,
        descricao: formData.descricao || null,
        motivo: formData.motivo || null,
        desconto_porcentagem: formData.desconto_porcentagem ? parseFloat(formData.desconto_porcentagem) : null,
        desconto_valor: formData.desconto_valor ? parseFloat(formData.desconto_valor) : null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim,
        ativa: formData.ativa,
      });
      setEditDialogOpen(false);
      setSelectedPromocao(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditDialog = (promocao: Promocao) => {
    setSelectedPromocao(promocao);
    setFormData({
      nome: promocao.nome,
      descricao: promocao.descricao || '',
      motivo: promocao.motivo || '',
      desconto_porcentagem: promocao.desconto_porcentagem?.toString() || '',
      desconto_valor: promocao.desconto_valor?.toString() || '',
      data_inicio: promocao.data_inicio,
      data_fim: promocao.data_fim,
      ativa: promocao.ativa || false,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
      await deletarPromocao(id);
    }
  };

  const isPromocaoAtiva = (promocao: Promocao) => {
    if (!promocao.ativa) return false;
    const hoje = new Date();
    const inicio = new Date(promocao.data_inicio + 'T00:00:00');
    const fim = new Date(promocao.data_fim + 'T23:59:59');
    return hoje >= inicio && hoje <= fim;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando promoções...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Marketing - Promoções
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie promoções e campanhas do studio
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Promoção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Promoção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome da Promoção *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="motivo">Motivo</Label>
                  <Input
                    id="motivo"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder="Ex: Natal, Aniversário do Studio"
                  />
                </div>
                <div>
                  <Label htmlFor="desconto_porcentagem">Desconto (%)</Label>
                  <Input
                    id="desconto_porcentagem"
                    type="number"
                    step="0.01"
                    value={formData.desconto_porcentagem}
                    onChange={(e) => setFormData({ ...formData, desconto_porcentagem: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="desconto_valor">Desconto (R$)</Label>
                  <Input
                    id="desconto_valor"
                    type="number"
                    step="0.01"
                    value={formData.desconto_valor}
                    onChange={(e) => setFormData({ ...formData, desconto_valor: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_inicio">Data Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_fim">Data Fim *</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativa"
                    checked={formData.ativa}
                    onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="ativa">Promoção Ativa</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Promoção</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promocoes.map((promocao) => (
          <Card key={promocao.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{promocao.nome}</CardTitle>
                <Badge variant={isPromocaoAtiva(promocao) ? 'default' : 'secondary'}>
                  {isPromocaoAtiva(promocao) ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {promocao.descricao && (
                <p className="text-sm text-muted-foreground">{promocao.descricao}</p>
              )}
              {promocao.motivo && (
                <p className="text-sm">
                  <span className="font-medium">Motivo:</span> {promocao.motivo}
                </p>
              )}
              <div className="space-y-1">
                {promocao.desconto_porcentagem && (
                  <p className="text-sm font-semibold text-primary">
                    {promocao.desconto_porcentagem}% de desconto
                  </p>
                )}
                {promocao.desconto_valor && (
                  <p className="text-sm font-semibold text-primary">
                    R$ {promocao.desconto_valor.toFixed(2)} de desconto
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(promocao.data_inicio + 'T00:00:00'), 'dd/MM/yyyy')} até{' '}
                  {format(new Date(promocao.data_fim + 'T00:00:00'), 'dd/MM/yyyy')}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => openEditDialog(promocao)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(promocao.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Promoção</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-nome">Nome da Promoção *</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea
                  id="edit-descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit-motivo">Motivo</Label>
                <Input
                  id="edit-motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-desconto_porcentagem">Desconto (%)</Label>
                <Input
                  id="edit-desconto_porcentagem"
                  type="number"
                  step="0.01"
                  value={formData.desconto_porcentagem}
                  onChange={(e) => setFormData({ ...formData, desconto_porcentagem: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-desconto_valor">Desconto (R$)</Label>
                <Input
                  id="edit-desconto_valor"
                  type="number"
                  step="0.01"
                  value={formData.desconto_valor}
                  onChange={(e) => setFormData({ ...formData, desconto_valor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-data_inicio">Data Início *</Label>
                <Input
                  id="edit-data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-data_fim">Data Fim *</Label>
                <Input
                  id="edit-data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-ativa"
                  checked={formData.ativa}
                  onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-ativa">Promoção Ativa</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketing;

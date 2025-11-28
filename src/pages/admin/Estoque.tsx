import { useState } from 'react';
import { useProdutos, Produto } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Estoque = () => {
  const { produtos, movimentacoes, loading, adicionarProduto, atualizarProduto, registrarMovimentacao, deletarProduto } = useProdutos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    quantidade_atual: '',
    quantidade_minima: '',
    preco_custo: '',
    preco_venda: '',
    categoria: '',
    fornecedor: '',
  });
  const [movData, setMovData] = useState({
    produto_id: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: '',
    motivo: '',
  });

  const produtosBaixoEstoque = produtos.filter(
    (p) => (p.quantidade_atual || 0) < (p.quantidade_minima || 5)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adicionarProduto({
        nome: formData.nome,
        descricao: formData.descricao || null,
        quantidade_atual: formData.quantidade_atual ? parseInt(formData.quantidade_atual) : 0,
        quantidade_minima: formData.quantidade_minima ? parseInt(formData.quantidade_minima) : 5,
        preco_custo: formData.preco_custo ? parseFloat(formData.preco_custo) : null,
        preco_venda: formData.preco_venda ? parseFloat(formData.preco_venda) : null,
        categoria: formData.categoria || null,
        fornecedor: formData.fornecedor || null,
      });
      setDialogOpen(false);
      setFormData({
        nome: '',
        descricao: '',
        quantidade_atual: '',
        quantidade_minima: '',
        preco_custo: '',
        preco_venda: '',
        categoria: '',
        fornecedor: '',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto) return;

    try {
      await atualizarProduto(selectedProduto.id, {
        nome: formData.nome,
        descricao: formData.descricao || null,
        quantidade_minima: formData.quantidade_minima ? parseInt(formData.quantidade_minima) : 5,
        preco_custo: formData.preco_custo ? parseFloat(formData.preco_custo) : null,
        preco_venda: formData.preco_venda ? parseFloat(formData.preco_venda) : null,
        categoria: formData.categoria || null,
        fornecedor: formData.fornecedor || null,
      });
      setEditDialogOpen(false);
      setSelectedProduto(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registrarMovimentacao(
        movData.produto_id,
        movData.tipo,
        parseInt(movData.quantidade),
        movData.motivo
      );
      setMovDialogOpen(false);
      setMovData({
        produto_id: '',
        tipo: 'entrada',
        quantidade: '',
        motivo: '',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const openEditDialog = (produto: Produto) => {
    setSelectedProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || '',
      quantidade_atual: produto.quantidade_atual?.toString() || '',
      quantidade_minima: produto.quantidade_minima?.toString() || '',
      preco_custo: produto.preco_custo?.toString() || '',
      preco_venda: produto.preco_venda?.toString() || '',
      categoria: produto.categoria || '',
      fornecedor: produto.fornecedor || '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await deletarProduto(id);
    }
  };

  const getProdutoNome = (id: string) => {
    const produto = produtos.find((p) => p.id === id);
    return produto?.nome || 'Produto não encontrado';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando estoque...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            Estoque Inteligente
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie produtos e movimentações do estoque
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={movDialogOpen} onOpenChange={setMovDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMovimentacao} className="space-y-4">
                <div>
                  <Label htmlFor="mov-produto">Produto *</Label>
                  <Select
                    value={movData.produto_id}
                    onValueChange={(value) => setMovData({ ...movData, produto_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((produto) => (
                        <SelectItem key={produto.id} value={produto.id}>
                          {produto.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mov-tipo">Tipo *</Label>
                  <Select
                    value={movData.tipo}
                    onValueChange={(value: 'entrada' | 'saida') => setMovData({ ...movData, tipo: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mov-quantidade">Quantidade *</Label>
                  <Input
                    id="mov-quantidade"
                    type="number"
                    value={movData.quantidade}
                    onChange={(e) => setMovData({ ...movData, quantidade: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mov-motivo">Motivo</Label>
                  <Input
                    id="mov-motivo"
                    value={movData.motivo}
                    onChange={(e) => setMovData({ ...movData, motivo: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setMovDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Registrar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
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
                  <div>
                    <Label htmlFor="quantidade_atual">Quantidade Atual</Label>
                    <Input
                      id="quantidade_atual"
                      type="number"
                      value={formData.quantidade_atual}
                      onChange={(e) => setFormData({ ...formData, quantidade_atual: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quantidade_minima">Quantidade Mínima</Label>
                    <Input
                      id="quantidade_minima"
                      type="number"
                      value={formData.quantidade_minima}
                      onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preco_custo">Preço de Custo</Label>
                    <Input
                      id="preco_custo"
                      type="number"
                      step="0.01"
                      value={formData.preco_custo}
                      onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preco_venda">Preço de Venda</Label>
                    <Input
                      id="preco_venda"
                      type="number"
                      step="0.01"
                      value={formData.preco_venda}
                      onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Input
                      id="fornecedor"
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar Produto</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertas de Estoque Baixo */}
      {produtosBaixoEstoque.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Estoque Baixo ({produtosBaixoEstoque.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produtosBaixoEstoque.map((produto) => (
                <div key={produto.id} className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="font-medium">{produto.nome}</span>
                  <Badge variant="destructive">
                    {produto.quantidade_atual}/{produto.quantidade_minima}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="produtos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <Card key={produto.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{produto.nome}</CardTitle>
                    <Badge
                      variant={
                        (produto.quantidade_atual || 0) < (produto.quantidade_minima || 5)
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {produto.quantidade_atual || 0} un.
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {produto.descricao && (
                    <p className="text-sm text-muted-foreground">{produto.descricao}</p>
                  )}
                  <div className="space-y-1 text-sm">
                    {produto.categoria && (
                      <p>
                        <span className="font-medium">Categoria:</span> {produto.categoria}
                      </p>
                    )}
                    {produto.fornecedor && (
                      <p>
                        <span className="font-medium">Fornecedor:</span> {produto.fornecedor}
                      </p>
                    )}
                    {produto.preco_custo && (
                      <p>
                        <span className="font-medium">Custo:</span> R$ {produto.preco_custo.toFixed(2)}
                      </p>
                    )}
                    {produto.preco_venda && (
                      <p>
                        <span className="font-medium">Venda:</span> R$ {produto.preco_venda.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditDialog(produto)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(produto.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movimentacoes.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {mov.tipo === 'entrada' ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{getProdutoNome(mov.produto_id || '')}</p>
                        {mov.motivo && (
                          <p className="text-sm text-muted-foreground">{mov.motivo}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={mov.tipo === 'entrada' ? 'default' : 'secondary'}>
                        {mov.tipo === 'entrada' ? '+' : '-'}
                        {mov.quantidade}
                      </Badge>
                      {mov.created_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(mov.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit-nome">Nome *</Label>
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
              <div>
                <Label htmlFor="edit-quantidade_minima">Quantidade Mínima</Label>
                <Input
                  id="edit-quantidade_minima"
                  type="number"
                  value={formData.quantidade_minima}
                  onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                />
              </div>
              <div>
                <Label>Quantidade Atual</Label>
                <Input
                  value={formData.quantidade_atual}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="edit-preco_custo">Preço de Custo</Label>
                <Input
                  id="edit-preco_custo"
                  type="number"
                  step="0.01"
                  value={formData.preco_custo}
                  onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-preco_venda">Preço de Venda</Label>
                <Input
                  id="edit-preco_venda"
                  type="number"
                  step="0.01"
                  value={formData.preco_venda}
                  onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-categoria">Categoria</Label>
                <Input
                  id="edit-categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-fornecedor">Fornecedor</Label>
                <Input
                  id="edit-fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                />
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

export default Estoque;

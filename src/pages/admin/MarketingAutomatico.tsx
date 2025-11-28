import { useState } from 'react';
import { useFluxosAutomaticos, FluxoAutomatico } from '@/hooks/useFluxosAutomaticos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Send, Clock, Edit, Trash2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tipoFluxoOptions = [
  { value: 'pos_primeira_visita', label: 'Pós Primeira Visita', desc: 'Mensagem após primeiro atendimento' },
  { value: 'reativacao', label: 'Reativação', desc: 'Cliente sem agendar há 3 dias' },
  { value: 'manutencao', label: 'Manutenção', desc: 'Lembrete de retorno baseado no serviço' },
  { value: 'aniversario', label: 'Aniversário', desc: 'Mensagem no dia do aniversário' },
  { value: 'natal', label: 'Natal', desc: 'Mensagem especial em 25/12' },
  { value: 'dia_mulher', label: 'Dia da Mulher', desc: 'Mensagem especial em 08/03' },
];

const MarketingAutomatico = () => {
  const { fluxos, mensagens, loading, adicionarFluxo, atualizarFluxo, deletarFluxo } = useFluxosAutomaticos();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFluxo, setSelectedFluxo] = useState<FluxoAutomatico | null>(null);
  const [formData, setFormData] = useState({
    tipo: '',
    mensagem_template: '',
    dias_apos_evento: '',
    ativo: true,
    hora_envio: '10:00',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adicionarFluxo({
        tipo: formData.tipo,
        mensagem_template: formData.mensagem_template,
        dias_apos_evento: formData.dias_apos_evento ? parseInt(formData.dias_apos_evento) : null,
        ativo: formData.ativo,
        hora_envio: formData.hora_envio,
      });
      setDialogOpen(false);
      setFormData({
        tipo: '',
        mensagem_template: '',
        dias_apos_evento: '',
        ativo: true,
        hora_envio: '10:00',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFluxo) return;

    try {
      await atualizarFluxo(selectedFluxo.id, {
        mensagem_template: formData.mensagem_template,
        dias_apos_evento: formData.dias_apos_evento ? parseInt(formData.dias_apos_evento) : null,
        ativo: formData.ativo,
        hora_envio: formData.hora_envio,
      });
      setEditDialogOpen(false);
      setSelectedFluxo(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEditDialog = (fluxo: FluxoAutomatico) => {
    setSelectedFluxo(fluxo);
    setFormData({
      tipo: fluxo.tipo,
      mensagem_template: fluxo.mensagem_template,
      dias_apos_evento: fluxo.dias_apos_evento?.toString() || '',
      ativo: fluxo.ativo || false,
      hora_envio: fluxo.hora_envio || '10:00',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fluxo automático?')) {
      await deletarFluxo(id);
    }
  };

  const toggleFluxo = async (fluxo: FluxoAutomatico) => {
    await atualizarFluxo(fluxo.id, { ativo: !fluxo.ativo });
  };

  const getTipoLabel = (tipo: string) => {
    return tipoFluxoOptions.find((opt) => opt.value === tipo)?.label || tipo;
  };

  const getTipoDesc = (tipo: string) => {
    return tipoFluxoOptions.find((opt) => opt.value === tipo)?.desc || '';
  };

  const mensagensPendentes = mensagens.filter((m) => m.status === 'pendente');
  const mensagensEnviadas = mensagens.filter((m) => m.status === 'enviado');
  const mensagensErro = mensagens.filter((m) => m.status === 'erro');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando marketing automático...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            Marketing Automático
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure mensagens automáticas para engajar clientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Fluxo Automático</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo de Fluxo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoFluxoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mensagem_template">Mensagem Template *</Label>
                <Textarea
                  id="mensagem_template"
                  value={formData.mensagem_template}
                  onChange={(e) => setFormData({ ...formData, mensagem_template: e.target.value })}
                  rows={5}
                  placeholder="Use {nome} para inserir o nome do cliente"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{nome}'} para personalizar com o nome do cliente
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dias_apos_evento">Dias Após Evento</Label>
                  <Input
                    id="dias_apos_evento"
                    type="number"
                    value={formData.dias_apos_evento}
                    onChange={(e) => setFormData({ ...formData, dias_apos_evento: e.target.value })}
                    placeholder="Ex: 7"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para datas fixas (Natal, Dia da Mulher)
                  </p>
                </div>
                <div>
                  <Label htmlFor="hora_envio">Hora de Envio</Label>
                  <Input
                    id="hora_envio"
                    type="time"
                    value={formData.hora_envio}
                    onChange={(e) => setFormData({ ...formData, hora_envio: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo">Fluxo Ativo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Fluxo</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mensagensPendentes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mensagensEnviadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mensagensErro.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fluxos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fluxos">Fluxos Configurados</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Envios</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {fluxos.map((fluxo) => (
              <Card key={fluxo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{getTipoLabel(fluxo.tipo)}</CardTitle>
                      <CardDescription>{getTipoDesc(fluxo.tipo)}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={fluxo.ativo || false}
                        onCheckedChange={() => toggleFluxo(fluxo)}
                      />
                      <Badge variant={fluxo.ativo ? 'default' : 'secondary'}>
                        {fluxo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm bg-muted p-3 rounded-lg">
                    <p className="whitespace-pre-wrap">{fluxo.mensagem_template}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {fluxo.dias_apos_evento && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{fluxo.dias_apos_evento} dias</span>
                      </div>
                    )}
                    {fluxo.hora_envio && (
                      <div className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        <span>{fluxo.hora_envio}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditDialog(fluxo)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(fluxo.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mensagens Agendadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mensagens.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Mensagem para data: {new Date(mensagem.data_envio + 'T00:00:00').toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cliente ID: {mensagem.cliente_id}
                      </p>
                    </div>
                    <Badge
                      variant={
                        mensagem.status === 'enviado'
                          ? 'default'
                          : mensagem.status === 'erro'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {mensagem.status}
                    </Badge>
                  </div>
                ))}
                {mensagens.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma mensagem agendada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Fluxo Automático</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>Tipo de Fluxo</Label>
              <Input value={getTipoLabel(formData.tipo)} disabled className="bg-muted" />
            </div>
            <div>
              <Label htmlFor="edit-mensagem_template">Mensagem Template *</Label>
              <Textarea
                id="edit-mensagem_template"
                value={formData.mensagem_template}
                onChange={(e) => setFormData({ ...formData, mensagem_template: e.target.value })}
                rows={5}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-dias_apos_evento">Dias Após Evento</Label>
                <Input
                  id="edit-dias_apos_evento"
                  type="number"
                  value={formData.dias_apos_evento}
                  onChange={(e) => setFormData({ ...formData, dias_apos_evento: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-hora_envio">Hora de Envio</Label>
                <Input
                  id="edit-hora_envio"
                  type="time"
                  value={formData.hora_envio}
                  onChange={(e) => setFormData({ ...formData, hora_envio: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="edit-ativo">Fluxo Ativo</Label>
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

export default MarketingAutomatico;

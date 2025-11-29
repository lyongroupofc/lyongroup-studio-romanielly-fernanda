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
import { Plus, Send, Clock, Edit, Trash2, CheckCircle, AlertCircle, Workflow } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const tipoFluxoOptions = [
  { value: 'pos_primeira_visita', label: 'Pós Primeira Visita', desc: 'Mensagem após primeiro atendimento', template: 'Olá {nome}! 😊 Foi um prazer atendê-la pela primeira vez! Esperamos que tenha adorado o resultado. Volte sempre! 💅✨' },
  { value: 'reativacao', label: 'Reativação', desc: 'Cliente sem agendar há 3 dias', template: 'Oi {nome}! 💕 Sentimos sua falta! Que tal agendar um novo horário com a gente? Estamos esperando por você! 🌟' },
  { value: 'manutencao', label: 'Manutenção', desc: 'Lembrete de retorno baseado no serviço', template: 'Olá {nome}! ⏰ Lembrete amigável: está na hora de cuidar das suas unhas novamente! Agende seu horário. 💅' },
  { value: 'aniversario', label: 'Aniversário', desc: 'Mensagem no dia do aniversário', template: 'Parabéns {nome}! 🎉🎂 Feliz aniversário! Desejamos um dia maravilhoso cheio de alegrias! 🎈✨' },
  { value: 'dia_maes', label: 'Dia das Mães', desc: '2º domingo de maio', template: 'Feliz Dia das Mães {nome}! 💐🌸 Você é especial! Que tal se presentear com um momento de autocuidado? Agende seu horário! 💅' },
  { value: 'dia_pais', label: 'Dia dos Pais', desc: '2º domingo de agosto', template: 'Feliz Dia dos Pais! 👨‍👧‍👦💙 Que tal presentear aquele pai especial com um voucher de presente? Entre em contato! 🎁' },
  { value: 'dia_namorados', label: 'Dia dos Namorados', desc: '12 de junho', template: 'Oi {nome}! 💕 Dia dos Namorados chegando! Que tal se preparar para esse dia especial? Agende seu horário! 💅✨' },
  { value: 'ano_novo', label: 'Ano Novo', desc: '1º de janeiro', template: 'Feliz Ano Novo {nome}! 🎆✨ Que 2025 seja repleto de beleza e autoestima! Comece o ano cuidando de você! 💅' },
  { value: 'pascoa', label: 'Páscoa', desc: 'Data móvel', template: 'Feliz Páscoa {nome}! 🐰🍫 Desejamos renovação e momentos doces! Que tal renovar também suas unhas? 💅✨' },
  { value: 'black_friday', label: 'Black Friday', desc: 'Última sexta de novembro', template: 'Black Friday {nome}! 🖤💸 Promoções especiais te esperando! Aproveite para cuidar de você! 💅✨' },
  { value: 'natal', label: 'Natal', desc: 'Mensagem especial em 25/12', template: 'Feliz Natal {nome}! 🎄🎅 Desejamos um Natal cheio de amor, paz e beleza! Feliz 2025! ✨💅' },
  { value: 'dia_mulher', label: 'Dia da Mulher', desc: 'Mensagem especial em 08/03', template: 'Feliz Dia da Mulher {nome}! 💐👸 Você é incrível! Que tal se presentear hoje? Agende seu horário! 💅✨' },
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

  const handleTipoChange = (tipo: string) => {
    const tipoSelecionado = tipoFluxoOptions.find(opt => opt.value === tipo);
    setFormData({
      ...formData,
      tipo,
      mensagem_template: tipoSelecionado?.template || '',
    });
  };

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

  const handleTestarLyonFlow = async () => {
    const loadingToast = toast.loading("Processando Lyon Flow...");
    try {
      const { data, error } = await supabase.functions.invoke("processar-lyon-flow");

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success(`Lyon Flow processado! ${data?.mensagensEnviadas || 0} mensagens enviadas.`);
    } catch (error) {
      console.error("Erro ao testar Lyon Flow:", error);
      toast.dismiss(loadingToast);
      toast.error("Erro ao processar Lyon Flow");
    }
  };

  const mensagensPendentes = mensagens.filter((m) => m.status === 'pendente');
  const mensagensEnviadas = mensagens.filter((m) => m.status === 'enviado');
  const mensagensErro = mensagens.filter((m) => m.status === 'erro');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando Lyon Flow...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Workflow className="w-8 h-8 text-primary" />
            Lyon Flow
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure mensagens automáticas para engajar clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleTestarLyonFlow}
            className="gap-2"
            variant="outline"
          >
            <Send className="w-4 h-4" />
            Testar Lyon Flow
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Fluxo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Fluxo Automático</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo de Fluxo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={handleTipoChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de fluxo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoFluxoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mensagem">Mensagem Template *</Label>
                <Textarea
                  id="mensagem"
                  value={formData.mensagem_template}
                  onChange={(e) => setFormData({ ...formData, mensagem_template: e.target.value })}
                  placeholder="Use {nome} para o nome do cliente"
                  className="min-h-[150px]"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use a variável <code className="bg-muted px-1 py-0.5 rounded">{'{nome}'}</code> para personalizar com o nome do cliente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hora">Hora de Envio</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora_envio}
                    onChange={(e) => setFormData({ ...formData, hora_envio: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="dias">Dias Após Evento</Label>
                  <Input
                    id="dias"
                    type="number"
                    value={formData.dias_apos_evento}
                    onChange={(e) => setFormData({ ...formData, dias_apos_evento: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativar fluxo imediatamente
                </Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Fluxo</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mensagensEnviadas.length}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{mensagensPendentes.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{mensagensErro.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fluxos */}
      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Fluxos Ativos</TabsTrigger>
          <TabsTrigger value="inativos">Fluxos Inativos</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="space-y-4">
          {fluxos.filter((f) => f.ativo).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum fluxo ativo</p>
              </CardContent>
            </Card>
          ) : (
            fluxos
              .filter((f) => f.ativo)
              .map((fluxo) => (
                <Card key={fluxo.id} className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getTipoLabel(fluxo.tipo)}
                          <Badge variant="default">Ativo</Badge>
                        </CardTitle>
                        <CardDescription>{getTipoDesc(fluxo.tipo)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(fluxo)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFluxo(fluxo)}
                        >
                          <Switch checked={fluxo.ativo} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(fluxo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{fluxo.mensagem_template}</p>
                    <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                      {fluxo.hora_envio && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {fluxo.hora_envio}
                        </span>
                      )}
                      {fluxo.dias_apos_evento && (
                        <span>{fluxo.dias_apos_evento} dias após evento</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="inativos" className="space-y-4">
          {fluxos.filter((f) => !f.ativo).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum fluxo inativo</p>
              </CardContent>
            </Card>
          ) : (
            fluxos
              .filter((f) => !f.ativo)
              .map((fluxo) => (
                <Card key={fluxo.id} className="border-muted opacity-60">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {getTipoLabel(fluxo.tipo)}
                          <Badge variant="secondary">Inativo</Badge>
                        </CardTitle>
                        <CardDescription>{getTipoDesc(fluxo.tipo)}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(fluxo)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleFluxo(fluxo)}
                        >
                          <Switch checked={fluxo.ativo} />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(fluxo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{fluxo.mensagem_template}</p>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Fluxo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label htmlFor="mensagem-edit">Mensagem Template *</Label>
              <Textarea
                id="mensagem-edit"
                value={formData.mensagem_template}
                onChange={(e) => setFormData({ ...formData, mensagem_template: e.target.value })}
                placeholder="Use {nome} para o nome do cliente"
                className="min-h-[150px]"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a variável <code className="bg-muted px-1 py-0.5 rounded">{'{nome}'}</code> para personalizar
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora-edit">Hora de Envio</Label>
                <Input
                  id="hora-edit"
                  type="time"
                  value={formData.hora_envio}
                  onChange={(e) => setFormData({ ...formData, hora_envio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="dias-edit">Dias Após Evento</Label>
                <Input
                  id="dias-edit"
                  type="number"
                  value={formData.dias_apos_evento}
                  onChange={(e) => setFormData({ ...formData, dias_apos_evento: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo-edit"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo-edit" className="cursor-pointer">
                Fluxo ativo
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
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

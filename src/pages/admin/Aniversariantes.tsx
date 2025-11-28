import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cake, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

const Aniversariantes = () => {
  const { buscarAniversariantesPorDia, loading } = useClientes();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [aniversariantesDoDia, setAniversariantesDoDia] = useState<any[]>([]);
  const [aniversariantesPorDia, setAniversariantesPorDia] = useState<{ [key: string]: any[] }>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Carregar aniversariantes do mês atual
  useEffect(() => {
    const carregarAniversariantesMes = async () => {
      const ano = selectedDate.getFullYear();
      const mes = selectedDate.getMonth();
      const diasDoMes = new Date(ano, mes + 1, 0).getDate();
      const aniversariantesMap: { [key: string]: any[] } = {};

      for (let dia = 1; dia <= diasDoMes; dia++) {
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const aniversariantes = await buscarAniversariantesPorDia(dataStr);
        if (aniversariantes.length > 0) {
          aniversariantesMap[dia] = aniversariantes;
        }
      }

      setAniversariantesPorDia(aniversariantesMap);
    };

    carregarAniversariantesMes();
    
    // Subscription para recarregar quando novos clientes forem cadastrados
    const clientesChannel = supabase
      .channel('clientes_aniversariantes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        () => {
          console.log('📅 Novo cliente cadastrado, atualizando aniversariantes...');
          carregarAniversariantesMes();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(clientesChannel);
    };
  }, [selectedDate, buscarAniversariantesPorDia]);

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento + 'T00:00:00');
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade + 1; // Idade que fará neste aniversário
  };

  const formatarData = (dataNascimento: string) => {
    const data = new Date(dataNascimento + 'T00:00:00');
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    const mensagem = `Olá ${nome}! 🎂🎉 Feliz aniversário! Que este dia seja repleto de alegrias e momentos especiais. Desejamos muita saúde, felicidade e sucesso! 💖`;
    const numeroLimpo = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const getDiasDoMes = () => {
    const ano = selectedDate.getFullYear();
    const mes = selectedDate.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasDoMes = new Date(ano, mes + 1, 0).getDate();
    
    const dias: (number | null)[] = [];
    
    // Adicionar dias vazios do início do mês
    for (let i = 0; i < primeiroDia; i++) {
      dias.push(null);
    }
    
    // Adicionar dias do mês
    for (let dia = 1; dia <= diasDoMes; dia++) {
      dias.push(dia);
    }
    
    return dias;
  };

  const handleDiaClick = async (dia: number) => {
    const ano = selectedDate.getFullYear();
    const mes = selectedDate.getMonth();
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const aniversariantes = await buscarAniversariantesPorDia(dataStr);
    setAniversariantesDoDia(aniversariantes);
    setIsSheetOpen(true);
  };

  const mesAnterior = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const isHoje = (dia: number) => {
    const hoje = new Date();
    return (
      dia === hoje.getDate() &&
      selectedDate.getMonth() === hoje.getMonth() &&
      selectedDate.getFullYear() === hoje.getFullYear()
    );
  };

  const temAniversariantes = (dia: number) => {
    return aniversariantesPorDia[dia] && aniversariantesPorDia[dia].length > 0;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dias = getDiasDoMes();
  const totalAniversariantes = Object.values(aniversariantesPorDia).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6 p-6">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Cake className="h-6 w-6 text-primary" />
            🎂 Aniversariantes de {mesesNomes[selectedDate.getMonth()]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalAniversariantes} {totalAniversariantes === 1 ? 'cliente faz' : 'clientes fazem'} aniversário este mês
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={mesAnterior}
              className="hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold">
              {mesesNomes[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={proximoMes}
              className="hover:bg-primary/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {diasSemana.map((dia) => (
              <div key={dia} className="text-center text-sm font-medium text-muted-foreground py-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-2">
            {dias.map((dia, index) => {
              if (dia === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const hasAniversariantes = temAniversariantes(dia);
              const isToday = isHoje(dia);

              return (
                <button
                  key={dia}
                  onClick={() => hasAniversariantes && handleDiaClick(dia)}
                  disabled={!hasAniversariantes}
                  className={`
                    aspect-square p-2 rounded-lg border-2 transition-all
                    flex flex-col items-center justify-center gap-1
                    ${hasAniversariantes 
                      ? 'border-primary bg-primary/10 hover:bg-primary/20 cursor-pointer shadow-sm' 
                      : 'border-border bg-background cursor-default'
                    }
                    ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                >
                  <span className={`text-sm font-medium ${hasAniversariantes ? 'text-primary' : 'text-foreground'}`}>
                    {dia}
                  </span>
                  {hasAniversariantes && (
                    <>
                      <Cake className="h-4 w-4 text-primary" />
                      <Badge variant="secondary" className="text-xs px-1 py-0 h-4 bg-primary text-primary-foreground">
                        {aniversariantesPorDia[dia].length}
                      </Badge>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sheet com aniversariantes do dia */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-primary" />
              Aniversariantes do Dia
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {aniversariantesDoDia.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum aniversariante neste dia
              </p>
            ) : (
              aniversariantesDoDia.map((cliente) => (
                <Card key={cliente.id} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Cake className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {calcularIdade(cliente.data_nascimento)} anos
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Cake className="h-4 w-4" />
                      <span>{formatarData(cliente.data_nascimento)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{cliente.telefone}</span>
                    </div>
                    <Button
                      onClick={() => abrirWhatsApp(cliente.telefone, cliente.nome)}
                      className="w-full bg-primary hover:bg-primary/90"
                      size="sm"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Enviar Parabéns
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Aniversariantes;

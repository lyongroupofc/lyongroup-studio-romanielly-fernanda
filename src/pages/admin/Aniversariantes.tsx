import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cake, Phone, Calendar } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { Skeleton } from '@/components/ui/skeleton';

const Aniversariantes = () => {
  const { buscarAniversariantesMes, loading } = useClientes();
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const mesAtual = new Date().getMonth();
  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    const carregarAniversariantes = async () => {
      const data = await buscarAniversariantesMes(mesAtual);
      setAniversariantes(data);
    };
    carregarAniversariantes();
  }, [mesAtual]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Cake className="h-6 w-6 text-primary" />
            🎂 Aniversariantes de {mesesNomes[mesAtual]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {aniversariantes.length} {aniversariantes.length === 1 ? 'cliente faz' : 'clientes fazem'} aniversário neste mês
          </p>
        </CardHeader>
      </Card>

      {aniversariantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cake className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground">Nenhum aniversariante este mês</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aniversariantes.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow border-primary/20">
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
                  <Calendar className="h-4 w-4" />
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Aniversariantes;

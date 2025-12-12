import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useClientes } from "@/hooks/useClientes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cake, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Aniversariantes = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { clientes } = useClientes();

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel('clientes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        () => {
          setSelectedDate(new Date(selectedDate));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const mesAtual = selectedDate.getMonth();

  const aniversariantesDoMes = clientes.filter(cliente => {
    if (!cliente.data_nascimento) return false;
    const dataNascimento = new Date(cliente.data_nascimento);
    return dataNascimento.getMonth() === mesAtual;
  }).sort((a, b) => {
    const dataA = new Date(a.data_nascimento!);
    const dataB = new Date(b.data_nascimento!);
    return dataA.getDate() - dataB.getDate();
  });

  const getAniversariantesNoDia = (date: Date) => {
    return clientes.filter(cliente => {
      if (!cliente.data_nascimento) return false;
      const dataNascimento = new Date(cliente.data_nascimento);
      return dataNascimento.getDate() === date.getDate() && 
             dataNascimento.getMonth() === date.getMonth();
    });
  };

  const modifiers = {
    aniversario: (date: Date) => {
      return getAniversariantesNoDia(date).length > 0;
    }
  };

  const modifiersStyles = {
    aniversario: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      fontWeight: "bold"
    }
  };

  const handleEnviarWhatsApp = (telefone: string, nome: string) => {
    const mensagem = `Olá ${nome}! 🎉 Feliz aniversário! 🎂 Desejamos um dia maravilhoso cheio de alegrias! 🎈`;
    const url = `https://wa.me/55${telefone.replace(/\D/g, '')}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const calcularIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Aniversariantes
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Acompanhe os aniversários dos seus clientes
          </p>
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/20 rounded-lg border-2 border-primary w-fit">
            <p className="text-sm sm:text-lg font-bold text-primary">
              {aniversariantesDoMes.length} {aniversariantesDoMes.length === 1 ? 'aniversariante' : 'aniversariantes'} este mês
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendário */}
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-primary" />
              Calendário de Aniversários
            </CardTitle>
            <CardDescription>
              {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Lista de Aniversariantes */}
        <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="w-5 h-5 text-primary" />
              Aniversariantes do Mês
            </CardTitle>
            <CardDescription>
              {aniversariantesDoMes.length} {aniversariantesDoMes.length === 1 ? 'aniversariante' : 'aniversariantes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {aniversariantesDoMes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum aniversariante este mês
                </p>
              ) : (
                aniversariantesDoMes.map((cliente) => {
                  const dataNascimento = new Date(cliente.data_nascimento!);
                  const idade = calcularIdade(cliente.data_nascimento!);
                  const diaAniversario = dataNascimento.getDate();
                  
                  return (
                    <Card 
                      key={cliente.id} 
                      className="border-primary/10 hover:border-primary/30 transition-all hover:shadow-md"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Cake className="w-4 h-4 text-primary" />
                              <p className="font-semibold">{cliente.nome}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{cliente.telefone}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <strong>Aniversário:</strong> {diaAniversario} de {format(dataNascimento, "MMMM", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <strong>Idade:</strong> {idade} anos
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleEnviarWhatsApp(cliente.telefone, cliente.nome)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            🎉 WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Aniversariantes;

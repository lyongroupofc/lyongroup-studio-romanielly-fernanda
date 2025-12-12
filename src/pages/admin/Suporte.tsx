import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones, Send, Loader2, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AnimatedBackground } from "@/components/AnimatedBackground";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const Suporte = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! 👋 Sou o Léo, seu assistente de suporte do Full Beauty System.\n\n🎯 **Agora posso fazer tudo por você!**\n\nPosso gerenciar agendamentos, clientes, serviços, configurações do bot e muito mais. É só pedir!\n\nExemplos:\n- \"Quais agendamentos tem hoje?\"\n- \"Cancela o agendamento da Maria\"\n- \"Fecha o dia 25/12\"\n- \"Qual o faturamento do mês?\"\n\nComo posso ajudar?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-suporte`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }] 
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Limite de requisições excedido. Tente novamente mais tarde.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (resp.status === 402) {
          toast.error("Créditos insuficientes. Adicione créditos ao workspace.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        throw new Error("Erro ao processar resposta");
      }

      const data = await resp.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);

    } catch (error) {
      console.error("Erro no chat:", error);
      toast.error("Erro ao processar mensagem. Tente novamente.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const abrirWhatsAppSuporte = () => {
    const mensagem = "Olá! Preciso de suporte humano para o Full Beauty System.";
    window.open(`https://wa.me/5531991625182?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const formatMessage = (content: string) => {
    // Converter **texto** em negrito e formatar quebras de linha
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <AnimatedBackground />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Headphones className="w-8 h-8 text-primary" />
            Suporte - Léo
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Assistente inteligente com poderes totais no painel
          </p>
        </div>
        <Button onClick={abrirWhatsAppSuporte} variant="outline" className="gap-2">
          <Phone className="w-4 h-4" />
          Falar com Humano
        </Button>
      </div>

      <Card className="flex-1 flex flex-col p-6">
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {formatMessage(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Léo está trabalhando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite sua dúvida ou peça uma ação..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-primary/10 border-amber-500/20">
        <p className="text-sm text-muted-foreground">
          ✨ <strong>Léo Turbinado!</strong> Agora pode gerenciar agendamentos, clientes, serviços, configurar o bot, bloquear horários, fechar dias e consultar faturamento. 
          Basta pedir em linguagem natural!
        </p>
      </Card>
    </div>
  );
};

export default Suporte;

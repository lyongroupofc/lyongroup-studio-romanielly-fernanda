import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const messages = [
  "Você é incrível! Continue brilhando! ✨",
  "Cada unha é uma obra de arte, assim como você! 💅",
  "Seu talento transforma vidas, uma nail art de cada vez! 🎨",
  "A perfeição está nos detalhes, e você domina isso! 💫",
  "Suas mãos criam magia, continue encantando! ✨",
  "Hoje será um dia lindo, cheio de clientes felizes! 🌟",
  "Você não apenas faz unhas, você eleva a autoestima! 💖",
  "Sua dedicação inspira, continue sendo luz! 🌟",
  "Cada cliente que sai daqui leva um pouco da sua arte! 🎨",
  "O sucesso é construído dia após dia, e você está no caminho certo! 💪",
  "Sua paixão pelo que faz é contagiante! Continue assim! 💖",
  "Transformar sonhos em realidade, uma unha de cada vez! ✨",
  "Você é a razão pela qual tantas pessoas se sentem bonitas! 💅",
  "Seu trabalho não é apenas estético, é terapêutico! 🌸",
  "A excelência é um hábito, e você a pratica todos os dias! 💫",
  "Cada design que você cria conta uma história linda! 📖",
  "Você não apenas segue tendências, você as cria! 👑",
  "Sua arte nas unhas reflete a beleza da sua alma! ✨",
  "Continue sendo essa profissional excepcional! 🌟",
  "O mundo precisa mais da sua criatividade e talento! 🎨",
  "Você faz a diferença na vida de cada cliente! 💖",
  "Suas mãos são abençoadas com o dom da beleza! 🙏",
  "A perfeição tem nome: o seu trabalho! 💅",
  "Você é uma artista, e suas unhas são suas telas! 🎨",
  "Continue transformando unhas em pequenas joias! 💎",
];

export const MotivationalMessage = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);
  }, []);

  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
      <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
      <p className="text-sm md:text-base text-foreground font-medium italic">
        {message}
      </p>
    </div>
  );
};

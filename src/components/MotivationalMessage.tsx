import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const messages = [
  // Frases Bíblicas
  "Tudo posso naquele que me fortalece. - Filipenses 4:13 🙏",
  "O Senhor é meu pastor e nada me faltará. - Salmos 23:1 ✨",
  "Entrega o teu caminho ao Senhor, confia nele, e ele tudo fará. - Salmos 37:5 💫",
  "Porque sou eu que conheço os planos que tenho para vocês, diz o Senhor. - Jeremias 29:11 🌟",
  "O amor é paciente, o amor é bondoso. - 1 Coríntios 13:4 💖",
  "A fé é a certeza das coisas que se esperam. - Hebreus 11:1 ⭐",
  
  // Grandes Pensadores
  "A única forma de fazer um excelente trabalho é amar o que você faz. - Steve Jobs 💡",
  "O sucesso é a soma de pequenos esforços repetidos dia após dia. - Robert Collier 💪",
  "Acredite em si próprio e chegará um dia em que os outros não terão outra escolha senão acreditar com você. - Cynthia Kersey 🌟",
  "A persistência é o caminho do êxito. - Charles Chaplin 🎯",
  "O único lugar onde o sucesso vem antes do trabalho é no dicionário. - Albert Einstein 📚",
  "Você não pode mudar o vento, mas pode ajustar as velas. - Confúcio ⛵",
  "A felicidade não é algo pronto. Ela vem das suas próprias ações. - Dalai Lama 😊",
  
  // Motivacionais Gerais
  "Comece onde você está. Use o que você tem. Faça o que você pode. 💪",
  "Acredite em você mesmo e tudo será possível! ✨",
  "Cada dia é uma nova oportunidade para brilhar! 🌟",
  "Seu esforço de hoje é o sucesso de amanhã! 🚀",
  "Seja a energia que você quer atrair! ⚡",
  "Pequenos progressos ainda são progressos! 🌱",
  "Você é mais forte do que pensa! 💎",
  "Transforme seus sonhos em planos e seus planos em realidade! 🎯",
  "O segredo é não desistir! 🔥",
  "Sua jornada é única e especial! 🌈",
  "Grandes coisas nunca vêm de zonas de conforto! 🦋",
  "Seja grato pelo hoje e otimista pelo amanhã! 🌻",
  "Você está exatamente onde precisa estar! 🧭",
  "A vida recompensa a coragem! 🦁",
  "Faça acontecer! 💫",
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

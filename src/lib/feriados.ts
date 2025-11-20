import { format } from "date-fns";

// Feriados FIXOS nacionais brasileiros e municipais de Santa Bárbara - MG (formato MM-DD)
// NOTA: Carnaval, Sexta-feira Santa e Corpus Christi são feriados MÓVEIS e suas datas mudam a cada ano
// Por isso, devem ser configurados manualmente no sistema quando necessário
export const feriadosNacionais = [
  "01-01", // Ano Novo (Nacional)
  "04-21", // Tiradentes (Nacional)
  "05-01", // Dia do Trabalho (Nacional)
  "09-07", // Independência do Brasil (Nacional)
  "10-12", // Nossa Senhora Aparecida (Nacional)
  "11-02", // Finados (Nacional)
  "11-15", // Proclamação da República (Nacional)
  "11-20", // Dia da Consciência Negra (Nacional desde 2023)
  "12-04", // Dia de Santa Bárbara - Padroeira e Aniversário da Cidade (Municipal)
  "12-25", // Natal (Nacional)
];

// Feriados móveis para 2025 (precisam ser atualizados anualmente)
export const feriadosMoveis2025 = [
  "2025-03-03", // Carnaval - Segunda
  "2025-03-04", // Carnaval - Terça
  "2025-04-18", // Sexta-feira Santa
  "2025-06-19", // Corpus Christi
];

// Nomes dos feriados para exibição
export const nomesFeriados: Record<string, string> = {
  "01-01": "Ano Novo",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia da Consciência Negra",
  "12-04": "Santa Bárbara - Padroeira da Cidade",
  "12-25": "Natal",
  "2025-03-03": "Carnaval",
  "2025-03-04": "Carnaval",
  "2025-04-18": "Sexta-feira Santa",
  "2025-06-19": "Corpus Christi",
};

// Função para verificar se uma data é feriado (fixo ou móvel)
export const isFeriado = (date: Date): boolean => {
  const mmdd = format(date, "MM-dd");
  const yyyymmdd = format(date, "yyyy-MM-dd");
  
  // Verifica feriados fixos
  if (feriadosNacionais.includes(mmdd)) return true;
  
  // Verifica feriados móveis de 2025
  if (feriadosMoveis2025.includes(yyyymmdd)) return true;
  
  return false;
};

// Função para obter nome do feriado
export const getNomeFeriado = (date: Date): string | null => {
  const mmdd = format(date, "MM-dd");
  const yyyymmdd = format(date, "yyyy-MM-dd");
  
  return nomesFeriados[yyyymmdd] || nomesFeriados[mmdd] || null;
};

// Função para formatar data no formato YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};
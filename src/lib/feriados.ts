import { format, addDays } from "date-fns";
import { easter } from "date-easter";

// Feriados FIXOS nacionais brasileiros e municipais de Santa Bárbara - MG (formato MM-DD)
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

// Nomes dos feriados FIXOS para exibição
export const nomesFeriadosFixos: Record<string, string> = {
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
};

// Nomes dos feriados MÓVEIS para exibição
const nomesFeriadosMoveis: Record<string, string> = {
  "carnaval-seg": "Carnaval",
  "carnaval-ter": "Carnaval",
  "sexta-santa": "Sexta-feira Santa",
  "corpus-christi": "Corpus Christi",
};

// Calcula feriados móveis para um determinado ano
const calcularFeriadosMoveis = (ano: number): Record<string, string> => {
  const feriadosMoveis: Record<string, string> = {};
  
  // Calcula a Páscoa usando o algoritmo
  const pascoa = easter(ano);
  const dataPascoa = new Date(ano, pascoa.month - 1, pascoa.day);
  
  // Carnaval: 47 dias antes da Páscoa (segunda e terça)
  const carnavalSeg = addDays(dataPascoa, -47);
  const carnavalTer = addDays(dataPascoa, -46);
  feriadosMoveis[format(carnavalSeg, "yyyy-MM-dd")] = nomesFeriadosMoveis["carnaval-seg"];
  feriadosMoveis[format(carnavalTer, "yyyy-MM-dd")] = nomesFeriadosMoveis["carnaval-ter"];
  
  // Sexta-feira Santa: 2 dias antes da Páscoa
  const sextaSanta = addDays(dataPascoa, -2);
  feriadosMoveis[format(sextaSanta, "yyyy-MM-dd")] = nomesFeriadosMoveis["sexta-santa"];
  
  // Corpus Christi: 60 dias após a Páscoa
  const corpusChristi = addDays(dataPascoa, 60);
  feriadosMoveis[format(corpusChristi, "yyyy-MM-dd")] = nomesFeriadosMoveis["corpus-christi"];
  
  return feriadosMoveis;
};

// Função para verificar se uma data é feriado (fixo ou móvel)
export const isFeriado = (date: Date): boolean => {
  const mmdd = format(date, "MM-dd");
  const yyyymmdd = format(date, "yyyy-MM-dd");
  const ano = date.getFullYear();
  
  // Verifica feriados fixos
  if (feriadosNacionais.includes(mmdd)) return true;
  
  // Calcula e verifica feriados móveis do ano
  const feriadosMoveis = calcularFeriadosMoveis(ano);
  if (feriadosMoveis[yyyymmdd]) return true;
  
  return false;
};

// Função para obter nome do feriado
export const getNomeFeriado = (date: Date): string | null => {
  const mmdd = format(date, "MM-dd");
  const yyyymmdd = format(date, "yyyy-MM-dd");
  const ano = date.getFullYear();
  
  // Verifica feriados fixos primeiro
  if (nomesFeriadosFixos[mmdd]) return nomesFeriadosFixos[mmdd];
  
  // Calcula e verifica feriados móveis do ano
  const feriadosMoveis = calcularFeriadosMoveis(ano);
  return feriadosMoveis[yyyymmdd] || null;
};

// Função para formatar data no formato YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};
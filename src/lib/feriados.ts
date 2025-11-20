import { format } from "date-fns";

// Feriados nacionais brasileiros (formato MM-DD)
export const feriadosNacionais = [
  "01-01", // Ano Novo
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "09-07", // Independência
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "12-25", // Natal
];

// Função para verificar se uma data é feriado
export const isFeriado = (date: Date): boolean => {
  const mmdd = format(date, "MM-dd");
  return feriadosNacionais.includes(mmdd);
};

// Função para formatar data no formato YYYY-MM-DD
export const formatDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};
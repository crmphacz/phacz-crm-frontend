import { formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Corretor, StageConfig, StatusUnidade } from './types';

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}

/** Agora, no formato aceito por `<input type="datetime-local">` ("YYYY-MM-DDTHH:mm"), em horário local. */
export function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const localMs = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

/** Converte o valor de um `<input type="datetime-local">` (horário local, sem fuso) para ISO. */
export function datetimeLocalToISO(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export function getSlaStatus(corretor: Corretor, stage: StageConfig): 'ok' | 'warning' | 'exceeded' | 'none' {
  const enteredAt = corretor.etapaTimestamps[stage.id];
  if (!enteredAt) return 'none';
  if (stage.slaHoras === 0) return 'none';

  const now = new Date();
  const entered = new Date(enteredAt);

  if (stage.slaHoras) {
    const hrs = differenceInHours(now, entered);
    const pct = hrs / stage.slaHoras;
    if (pct >= 1) return 'exceeded';
    if (pct >= 0.7) return 'warning';
    return 'ok';
  }
  if (stage.slaDias) {
    const days = differenceInDays(now, entered);
    const pct = days / stage.slaDias;
    if (pct >= 1) return 'exceeded';
    if (pct >= 0.7) return 'warning';
    return 'ok';
  }
  return 'none';
}

export function getSlaLabel(corretor: Corretor, stage: StageConfig): string {
  const enteredAt = corretor.etapaTimestamps[stage.id];
  if (!enteredAt) return '';
  if (stage.slaHoras === 0) return 'Imediato';

  const now = new Date();
  const entered = new Date(enteredAt);

  if (stage.slaHoras) {
    const hrs = differenceInHours(now, entered);
    if (hrs === 0) return 'agora';
    return `${hrs}h na etapa`;
  }
  if (stage.slaDias) {
    const days = differenceInDays(now, entered);
    return `${days}d na etapa`;
  }
  return '';
}

export const TEMPERATURA_CONFIG = {
  quente: { label: 'Quente', bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
  morno: { label: 'Morno', bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  frio: { label: 'Frio', bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
} as const;

export const TIPO_INTERACAO_CONFIG = {
  ligacao: { label: 'Ligação', icon: '📞' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  email: { label: 'E-mail', icon: '📧' },
  visita: { label: 'Visita', icon: '🏢' },
  reuniao: { label: 'Reunião', icon: '🤝' },
  nota: { label: 'Nota', icon: '📝' },
  proposta: { label: 'Proposta', icon: '📄' },
  especulacao: { label: 'Especulação', icon: '💭' },
} as const;

/** Cor de badge própria e consistente para cada um dos 5 status de unidade em toda a tela. */
export const STATUS_UNIDADE_CONFIG: Record<StatusUnidade, { label: string; bg: string; text: string }> = {
  disponivel: { label: 'Disponível', bg: '#dcfce7', text: '#15803d' },
  vendido: { label: 'Vendido', bg: '#374151', text: '#ffffff' },
  em_negociacao: { label: 'Em negociação', bg: '#fef9c3', text: '#854d0e' },
  em_contrato: { label: 'Em contrato', bg: '#dbeafe', text: '#1e40af' },
  alugado: { label: 'Alugado', bg: '#f3e8ff', text: '#7e22ce' },
};

export const TIPO_INTERESSE_LABELS: Record<string, string> = {
  prontos: 'Prontos',
  planta: 'Na planta',
  investidor: 'Investidor',
  parceria: 'Parceria',
};

export function getMandatoryFieldsForStage(etapa: number): string[] {
  const fields: Record<number, string[]> = {
    1: ['nomeCorretor', 'telefoneCorretor', 'canalOrigem'],
    2: [],
    3: ['tiposInteresse', 'treinamento'],
    4: [],
    5: ['responsavelGR', 'responsavelGV'],
    6: [],
    7: [],
    8: [],
    9: [],
    10: [],
  };
  return fields[etapa] ?? [];
}

export function validateForStageMove(corretor: Corretor, toEtapa: number): string[] {
  const errors: string[] = [];
  const required = getMandatoryFieldsForStage(toEtapa - 1);

  for (const field of required) {
    const val = corretor[field as keyof Corretor];
    if (!val || (Array.isArray(val) && val.length === 0) || val === '') {
      const labels: Record<string, string> = {
        nomeCorretor: 'Nome do corretor',
        telefoneCorretor: 'Telefone',
        canalOrigem: 'Canal de origem',
        tiposInteresse: 'Tipo de interesse',
        treinamento: 'Status de treinamento',
        responsavelGR: 'Responsável GR',
        responsavelGV: 'Responsável GV',
      };
      errors.push(labels[field] ?? field);
    }
  }

  if (toEtapa === 8 && corretor.clientesFinais.length === 0 && !corretor.parentCorretorId) {
    errors.push('Ao menos um cliente final é necessário para negociação');
  }

  return errors;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/** Só o primeiro nome — usado onde o espaço é curto (ex.: rodapé da sidebar). */
export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

/** Telefone BR no formato do link do WhatsApp: só dígitos, com DDI 55. */
export function toWaNumber(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/** Formata um telefone progressivamente enquanto o usuário digita: (11) 91234-5678. */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formata um CPF progressivamente enquanto o usuário digita: 123.456.789-01. */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Formata um CNPJ progressivamente enquanto o usuário digita: 12.345.678/0001-90. */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Formata um número como moeda brasileira completa: 245000 -> "R$ 245.000,00". */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Formata um valor monetário progressivamente enquanto o usuário digita, estilo caixa/POS:
 * os dígitos são preenchidos da direita para a esquerda como centavos (ex: "245000" -> "R$ 2.450,00").
 * Isso evita ambiguidade ao reformatar a cada tecla, já que o valor exibido nunca introduz
 * dígitos que não foram digitados (apenas pontuação), tornando a extração sempre reversível.
 */
export function maskCurrencyBRLInput(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return formatCurrencyBRL(Number(digits) / 100);
}

/** Extrai o valor numérico em reais de uma string formatada por maskCurrencyBRLInput. */
export function parseCurrencyBRL(value: string): number | undefined {
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;
  return Number(digits) / 100;
}

/** Formata metragem com 2 casas decimais: 192.7 -> "192,70 m²". */
export function formatMetragem(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

/**
 * Constrói uma Date local (sem deslocamento de fuso) a partir de uma chave "YYYY-MM-DD".
 * Datas "sem hora" vindas da API (ex: início de obra, data de entrega) são strings assim —
 * usar `new Date(str)` direto as interpretaria como UTC e poderia exibir o dia errado
 * dependendo do fuso do navegador.
 */
export function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formata "2026-08-13" como "13/08/2026", só com manipulação de string (sem risco de fuso). */
export function formatDateKeyBR(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

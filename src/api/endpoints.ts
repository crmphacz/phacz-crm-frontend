import { apiFetch, downloadFile } from './client.js';
import {
  mapUserFromApi, mapCorretorFromApi, mapCreateCorretorToApi, mapCorretorUpdateToApi,
  mapEmailTemplateFromApi, mapEmailCampaignFromApi, mapChatMessageFromApi, mapCargoToApi,
  mapDestinatarioTipoToApi,
  type ApiUser, type ApiCorretor, type ApiEmailTemplate, type ApiEmailCampaign, type ApiChatMessage,
  type CreateCorretorPayload, type AppUser,
} from './mappers.js';
import type {
  Corretor, ClienteFinal, Interacao, Proposta, EmailTemplate, EmailCampaign,
  ChatMessage, DestinatarioTipo, UserCargo,
} from '../types';

export type { CreateCorretorPayload, AppUser } from './mappers.js';

// ── Auth ───────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: { id: string; nome: string; email: string; cargo: string; cor: string };
}

export const authApi = {
  login: (email: string, senha: string) =>
    apiFetch<LoginResult>('/api/auth/login', { method: 'POST', body: { email, senha } }),
  me: () => apiFetch<ApiUser>('/api/auth/me'),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
};

// ── Users ──────────────────────────────────────────────────────────

export const usersApi = {
  list: async (): Promise<AppUser[]> => {
    const users = await apiFetch<ApiUser[]>('/api/users');
    return users.map(mapUserFromApi);
  },
  create: (data: { nome: string; email: string; senha: string; cargo: UserCargo; cor?: string }) =>
    apiFetch<ApiUser>('/api/users', { method: 'POST', body: { ...data, cargo: mapCargoToApi(data.cargo) } }).then(mapUserFromApi),
  update: (id: string, data: Partial<{ nome: string; cargo: UserCargo; cor: string; ativo: boolean }>) => {
    const payload: Record<string, unknown> = { ...data };
    if (data.cargo) payload.cargo = mapCargoToApi(data.cargo);
    return apiFetch<ApiUser>(`/api/users/${id}`, { method: 'PATCH', body: payload }).then(mapUserFromApi);
  },
  remove: (id: string) => apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
};

// ── Corretores ──────────────────────────────────────────────────────

export interface ImobiliariaMatch {
  id: string;
  nomeCorretor: string;
  imobiliaria: string;
  responsavelSDR: { nome: string } | null;
  responsavelGV: { nome: string } | null;
  responsavelGR: { nome: string } | null;
}

export const corretoresApi = {
  list: async (): Promise<Corretor[]> => {
    const res = await apiFetch<{ corretores: ApiCorretor[]; total: number }>('/api/corretores', { query: { pageSize: 200 } });
    return res.corretores.map(mapCorretorFromApi);
  },
  get: (id: string): Promise<Corretor> => apiFetch<ApiCorretor>(`/api/corretores/${id}`).then(mapCorretorFromApi),
  create: (payload: CreateCorretorPayload): Promise<Corretor> =>
    apiFetch<ApiCorretor>('/api/corretores', { method: 'POST', body: mapCreateCorretorToApi(payload) }).then(mapCorretorFromApi),
  update: (
    id: string,
    updates: Partial<Corretor>,
    responsavelIds?: { responsavelSDRId?: string; responsavelGVId?: string; responsavelGRId?: string }
  ): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}`, {
      method: 'PATCH',
      body: { ...mapCorretorUpdateToApi(updates), ...responsavelIds },
    }).then(mapCorretorFromApi),
  move: (id: string, etapa: number): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}/move`, { method: 'POST', body: { etapa } }).then(mapCorretorFromApi),
  archive: (id: string, motivo: string): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}/archive`, { method: 'POST', body: { motivo } }).then(mapCorretorFromApi),
  markAsWon: (id: string, valor: number): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}/mark-won`, { method: 'POST', body: { valor } }).then(mapCorretorFromApi),
  markAsLost: (id: string, motivo: string): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}/mark-lost`, { method: 'POST', body: { motivo } }).then(mapCorretorFromApi),
  remove: (id: string): Promise<void> => apiFetch<void>(`/api/corretores/${id}`, { method: 'DELETE' }),
  gerarNegocio: (id: string, clienteFinalId: string): Promise<Corretor> =>
    apiFetch<ApiCorretor>(`/api/corretores/${id}/gerar-negocio`, { method: 'POST', body: { clienteFinalId } }).then(mapCorretorFromApi),

  addCliente: (id: string, data: Omit<ClienteFinal, 'id' | 'dataAdicionado' | 'negocioGerado' | 'negocioCorretorId'>) =>
    apiFetch(`/api/corretores/${id}/clientes`, { method: 'POST', body: data }),

  checkImobiliaria: (nome: string) =>
    apiFetch<{ existentes: ImobiliariaMatch[] }>('/api/corretores/imobiliaria-existente', { query: { nome } }),
  removeCliente: (id: string, cfId: string) =>
    apiFetch<void>(`/api/corretores/${id}/clientes/${cfId}`, { method: 'DELETE' }),

  addInteracao: (id: string, data: Omit<Interacao, 'id'>) =>
    apiFetch(`/api/corretores/${id}/interacoes`, {
      method: 'POST',
      body: { tipo: data.tipo.toUpperCase(), resumo: data.resumo, etapa: data.etapa },
    }),

  addProposta: (id: string, data: Omit<Proposta, 'id'>, arquivo?: File) => {
    if (!arquivo) {
      return apiFetch(`/api/corretores/${id}/propostas`, { method: 'POST', body: data });
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    form.append('arquivo', arquivo);
    return apiFetch(`/api/corretores/${id}/propostas`, { method: 'POST', body: form });
  },
  updateProposta: (id: string, propostaId: string, data: Partial<Proposta>) => {
    const payload: Record<string, unknown> = { ...data };
    if (data.status) payload.status = data.status.toUpperCase();
    return apiFetch(`/api/corretores/${id}/propostas/${propostaId}`, { method: 'PATCH', body: payload });
  },
  downloadPropostaAnexo: (id: string, propostaId: string, filename: string) =>
    downloadFile(`/api/corretores/${id}/propostas/${propostaId}/anexo`, filename),
};

// ── Dashboard ──────────────────────────────────────────────────────

export const dashboardApi = {
  overview: () => apiFetch('/api/dashboard/overview'),
  metas: (periodo: string) => apiFetch<unknown[]>('/api/dashboard/metas', { query: { periodo } }),
  upsertMeta: (data: { userId: string; periodo: string; tipo: 'VOLUME' | 'VALOR' | 'CONVERSAO'; valorMeta: number }) =>
    apiFetch('/api/dashboard/metas', { method: 'POST', body: data }),
  ranking: (periodo: string) => apiFetch<unknown[]>('/api/dashboard/ranking', { query: { periodo } }),
};

// ── PHACZ IA ─────────────────────────────────────────────────────────

export const iaApi = {
  chat: async (message: string): Promise<ChatMessage & { simulated: boolean }> => {
    const res = await apiFetch<ApiChatMessage & { simulated: boolean }>('/api/ia/chat', { method: 'POST', body: { message } });
    return { ...mapChatMessageFromApi(res), simulated: res.simulated };
  },
  history: async (): Promise<ChatMessage[]> => {
    const res = await apiFetch<ApiChatMessage[]>('/api/ia/history');
    return res.map(mapChatMessageFromApi);
  },
  clearHistory: () => apiFetch<void>('/api/ia/history', { method: 'DELETE' }),
};

// ── Email Marketing ──────────────────────────────────────────────────

export const emailApi = {
  templates: {
    list: async (): Promise<EmailTemplate[]> => {
      const res = await apiFetch<ApiEmailTemplate[]>('/api/email/templates');
      return res.map(mapEmailTemplateFromApi);
    },
    create: (data: Omit<EmailTemplate, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<EmailTemplate> =>
      apiFetch<ApiEmailTemplate>('/api/email/templates', { method: 'POST', body: data }).then(mapEmailTemplateFromApi),
    update: (id: string, data: Partial<Omit<EmailTemplate, 'id' | 'criadoEm' | 'atualizadoEm'>>): Promise<EmailTemplate> =>
      apiFetch<ApiEmailTemplate>(`/api/email/templates/${id}`, { method: 'PATCH', body: data }).then(mapEmailTemplateFromApi),
    remove: (id: string): Promise<void> => apiFetch<void>(`/api/email/templates/${id}`, { method: 'DELETE' }),
    duplicate: (id: string): Promise<EmailTemplate> =>
      apiFetch<ApiEmailTemplate>(`/api/email/templates/${id}/duplicate`, { method: 'POST' }).then(mapEmailTemplateFromApi),
  },
  campaigns: {
    list: async (): Promise<EmailCampaign[]> => {
      const res = await apiFetch<ApiEmailCampaign[]>('/api/email/campaigns');
      return res.map(mapEmailCampaignFromApi);
    },
    remove: (id: string): Promise<void> => apiFetch<void>(`/api/email/campaigns/${id}`, { method: 'DELETE' }),
    send: async (data: {
      templateId: string;
      destinatarioTipo: DestinatarioTipo;
      etapaAlvo?: number;
      empreendimentoAlvo?: string;
      clienteIds?: string[];
    }): Promise<{ campaign: EmailCampaign; resultadoEnvio: { simulated: boolean; enviados: number; falhas: number } }> => {
      const res = await apiFetch<{ campaign: ApiEmailCampaign; resultadoEnvio: { simulated: boolean; enviados: number; falhas: number } }>(
        '/api/email/campaigns/send',
        { method: 'POST', body: { ...data, destinatarioTipo: mapDestinatarioTipoToApi(data.destinatarioTipo) } }
      );
      return { campaign: mapEmailCampaignFromApi(res.campaign), resultadoEnvio: res.resultadoEnvio };
    },
  },
};

// ── WhatsApp ───────────────────────────────────────────────────────

export const whatsappApi = {
  send: (corretorId: string, message: string) =>
    apiFetch<{ simulated: boolean }>('/api/whatsapp/send', { method: 'POST', body: { corretorId, message } }),
};

// ── Push ───────────────────────────────────────────────────────────

export const pushApi = {
  vapidPublicKey: () => apiFetch<{ publicKey: string; configurado: boolean }>('/api/push/vapid-public-key'),
  subscribe: (subscription: PushSubscriptionJSON) =>
    apiFetch('/api/push/subscribe', { method: 'POST', body: subscription }),
  unsubscribe: (endpoint: string) => apiFetch<void>('/api/push/unsubscribe', { method: 'POST', body: { endpoint } }),
};

// ── Exportações ────────────────────────────────────────────────────

export const exportsApi = {
  corretoresCsv: () => downloadFile('/api/exports/corretores.csv', 'corretores-phacz-crm.csv'),
  corretoresXlsx: () => downloadFile('/api/exports/corretores.xlsx', 'corretores-phacz-crm.xlsx'),
  kpisPdf: (periodo: string) => downloadFile('/api/exports/kpis.pdf', `kpis-phacz-crm-${periodo}.pdf`, { periodo }),
};

// ── Buscas salvas ──────────────────────────────────────────────────

export interface SavedSearchItem {
  id: string;
  nome: string;
  filtros: Record<string, unknown>;
  createdAt: string;
}

export const savedSearchesApi = {
  list: () => apiFetch<SavedSearchItem[]>('/api/saved-searches'),
  create: (nome: string, filtros: Record<string, unknown>) =>
    apiFetch<SavedSearchItem>('/api/saved-searches', { method: 'POST', body: { nome, filtros } }),
  remove: (id: string) => apiFetch<void>(`/api/saved-searches/${id}`, { method: 'DELETE' }),
};

// ── Canais de Origem ───────────────────────────────────────────────

export interface CanalOrigemItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export const canaisOrigemApi = {
  list: () => apiFetch<CanalOrigemItem[]>('/api/canais-origem'),
  create: (nome: string) => apiFetch<CanalOrigemItem>('/api/canais-origem', { method: 'POST', body: { nome } }),
  update: (id: string, data: Partial<{ nome: string; ativo: boolean }>) =>
    apiFetch<CanalOrigemItem>(`/api/canais-origem/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiFetch<void>(`/api/canais-origem/${id}`, { method: 'DELETE' }),
};

// ── Tipos de Interesse ──────────────────────────────────────────────

export interface TipoInteresseItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export const tiposInteresseApi = {
  list: () => apiFetch<TipoInteresseItem[]>('/api/tipos-interesse'),
  create: (nome: string) => apiFetch<TipoInteresseItem>('/api/tipos-interesse', { method: 'POST', body: { nome } }),
  update: (id: string, data: Partial<{ nome: string; ativo: boolean }>) =>
    apiFetch<TipoInteresseItem>(`/api/tipos-interesse/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiFetch<void>(`/api/tipos-interesse/${id}`, { method: 'DELETE' }),
};

// ── Imobiliárias ────────────────────────────────────────────────────

export interface ImobiliariaItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export const imobiliariasApi = {
  list: () => apiFetch<ImobiliariaItem[]>('/api/imobiliarias'),
  create: (nome: string) => apiFetch<ImobiliariaItem>('/api/imobiliarias', { method: 'POST', body: { nome } }),
  update: (id: string, data: Partial<{ nome: string; ativo: boolean }>) =>
    apiFetch<ImobiliariaItem>(`/api/imobiliarias/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiFetch<void>(`/api/imobiliarias/${id}`, { method: 'DELETE' }),
};

// ── Condições de Pagamento ──────────────────────────────────────────

export interface CondicaoPagamentoItem {
  id: string;
  nome: string;
  ativo: boolean;
}

export const condicoesPagamentoApi = {
  list: () => apiFetch<CondicaoPagamentoItem[]>('/api/condicoes-pagamento'),
  create: (nome: string) => apiFetch<CondicaoPagamentoItem>('/api/condicoes-pagamento', { method: 'POST', body: { nome } }),
  update: (id: string, data: Partial<{ nome: string; ativo: boolean }>) =>
    apiFetch<CondicaoPagamentoItem>(`/api/condicoes-pagamento/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiFetch<void>(`/api/condicoes-pagamento/${id}`, { method: 'DELETE' }),
};

// ── Perfil da Empresa ──────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
  updatedAt: string;
}

export const companyProfileApi = {
  get: () => apiFetch<CompanyProfile>('/api/company-profile'),
  update: (data: Partial<{ nome: string; cnpj: string; cidade: string }>) =>
    apiFetch<CompanyProfile>('/api/company-profile', { method: 'PATCH', body: data }),
};

import { apiFetch, downloadFile } from './client.js';
import {
  mapUserFromApi, mapCorretorFromApi, mapCreateCorretorToApi, mapCorretorUpdateToApi,
  mapEmailTemplateFromApi, mapEmailCampaignFromApi, mapChatMessageFromApi, mapCargoToApi,
  mapDestinatarioTipoToApi, mapRodadaFromApi, mapRodadaListItemFromApi, mapCreateRodadaToApi, mapNotificacaoFromApi,
  mapEmpreendimentoFromApi, mapEmpreendimentoDetailFromApi, mapUnidadeFromApi, mapStatusUnidadeToApi,
  mapLogAcaoFromApi, mapTipoInteracaoFromApi,
  type ApiUser, type ApiCorretor, type ApiEmailTemplate, type ApiEmailCampaign, type ApiChatMessage,
  type ApiRodada, type ApiRodadaResumo, type ApiNotificacao, type ApiEmpreendimento, type ApiEmpreendimentoDetail, type ApiUnidade,
  type ApiLogAcao,
  type CreateCorretorPayload, type AppUser,
} from './mappers.js';
import type {
  Corretor, ClienteFinal, Interacao, Proposta, EmailTemplate, EmailCampaign,
  ChatMessage, DestinatarioTipo, UserCargo, Rodada, RodadaResumo, CreateRodadaPayload, Notificacao,
  Empreendimento, EmpreendimentoDetail, CreateEmpreendimentoPayload, Unidade, CreateUnidadePayload,
  LogAcao, TipoInteracao, AniversarioAgenda, SaudacaoAniversario,
  TabelaEmpreendimentoResumo, TabelaEmpreendimentoDetalhe, CelulaAlterada,
} from '../types';

export type { CreateCorretorPayload, AppUser } from './mappers.js';

// ── Auth ───────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: { id: string; nome: string; email: string; cargo: string; cor: string; deveTrocarSenha: boolean; whatsappNumeroExibicao?: string | null };
}

export interface MeResult {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  cor: string;
  deveTrocarSenha: boolean;
  whatsappNumeroExibicao?: string | null;
}

export const authApi = {
  login: (email: string, senha: string) =>
    apiFetch<LoginResult>('/api/auth/login', { method: 'POST', body: { email, senha } }),
  me: () => apiFetch<MeResult>('/api/auth/me'),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, novaSenha: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: { token, novaSenha } }),
  // Troca de senha revoga a sessão atual no servidor (tokenVersion), então a API já devolve
  // um token novo — sem isso, a próxima chamada autenticada falharia com o token antigo.
  changePassword: (senhaAtual: string, novaSenha: string) =>
    apiFetch<{ message: string; token: string }>('/api/auth/change-password', { method: 'POST', body: { senhaAtual, novaSenha } }),
  // Revoga a sessão no servidor (tokenVersion) — "sair" deixa de ser só limpar o localStorage.
  logout: () => apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};

// ── Users ──────────────────────────────────────────────────────────

export const usersApi = {
  list: async (): Promise<AppUser[]> => {
    const users = await apiFetch<ApiUser[]>('/api/users');
    return users.map(mapUserFromApi);
  },
  // Sem campo de senha: o backend gera uma senha provisória e manda por e-mail (ver POST /api/users).
  create: (data: { nome: string; email: string; cargo: UserCargo; cor?: string; whatsappPhoneNumberId?: string; whatsappNumeroExibicao?: string }) =>
    apiFetch<ApiUser>('/api/users', { method: 'POST', body: { ...data, cargo: mapCargoToApi(data.cargo) } }).then(mapUserFromApi),
  update: (id: string, data: Partial<{ nome: string; cargo: UserCargo; cor: string; ativo: boolean; whatsappPhoneNumberId: string; whatsappNumeroExibicao: string }>) => {
    const payload: Record<string, unknown> = { ...data };
    if (data.cargo) payload.cargo = mapCargoToApi(data.cargo);
    return apiFetch<ApiUser>(`/api/users/${id}`, { method: 'PATCH', body: payload }).then(mapUserFromApi);
  },
  remove: (id: string) => apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
  // Dispara o e-mail com o link de redefinição de senha para o próprio usuário (só Diretora).
  sendPasswordReset: (id: string) =>
    apiFetch<{ message: string }>(`/api/users/${id}/send-password-reset`, { method: 'POST' }),
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
    // 2000: teto seguro pra sempre trazer a base inteira (Pipeline/Corretores/Clientes filtram
    // e ordenam no client, não dá pra paginar de verdade sem redesenhar essas telas). Os 200
    // antigos eram batidos sem nenhum filtro de status — corretores arquivados/antigos podiam
    // já estar sendo truncados silenciosamente. A listagem não traz mais interacoes/propostas
    // (ver corretorListInclude no backend), então um teto alto continua barato.
    const res = await apiFetch<{ corretores: ApiCorretor[]; total: number }>('/api/corretores', { query: { pageSize: 2000 } });
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

  // `novoCorretorId` reatribui o cliente a outro corretor; omitido mantém o atual.
  updateCliente: (
    id: string,
    cfId: string,
    data: Omit<ClienteFinal, 'id' | 'dataAdicionado' | 'negocioGerado' | 'negocioCorretorId'>,
    novoCorretorId?: string
  ) =>
    apiFetch(`/api/corretores/${id}/clientes/${cfId}`, {
      method: 'PATCH',
      body: { ...data, ...(novoCorretorId ? { corretorId: novoCorretorId } : {}) },
    }),

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

export interface AtividadeRecente {
  id: string;
  tipo: TipoInteracao;
  data: string;
  resumo: string;
  corretorId: string;
  corretorNome: string;
  corretorEtapa: number;
}

export const dashboardApi = {
  overview: () => apiFetch('/api/dashboard/overview'),
  metas: (periodo: string) => apiFetch<unknown[]>('/api/dashboard/metas', { query: { periodo } }),
  upsertMeta: (data: { userId: string; periodo: string; tipo: 'VOLUME' | 'VALOR' | 'CONVERSAO'; valorMeta: number }) =>
    apiFetch('/api/dashboard/metas', { method: 'POST', body: data }),
  ranking: (periodo: string) => apiFetch<unknown[]>('/api/dashboard/ranking', { query: { periodo } }),

  // Movidos pro backend porque dependiam de `corretor.interacoes`/`.propostas` completos, que
  // a listagem leve de corretores não traz mais — ver DashGR/DashGV em Dashboard.tsx.
  atividadesGr: async (): Promise<{ visitasRealizadas: number; whatsappEnviados: number; recentActivities: AtividadeRecente[] }> => {
    const res = await apiFetch<{
      visitasRealizadas: number;
      whatsappEnviados: number;
      recentActivities: (Omit<AtividadeRecente, 'tipo'> & { tipo: string })[];
    }>('/api/dashboard/atividades-gr');
    return { ...res, recentActivities: res.recentActivities.map((a) => ({ ...a, tipo: mapTipoInteracaoFromApi(a.tipo) })) };
  },
  atividadesGv: () =>
    apiFetch<{
      propostasPendentes: number;
      propostasAceitas: number;
      primeiraPropostaPorCorretor: Record<string, { valor: number }>;
    }>('/api/dashboard/atividades-gv'),
  tempoPrimeiroContatoGrGv: () => apiFetch<{ avgHoras: number }>('/api/dashboard/tempo-primeiro-contato-gr-gv'),
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
  uploadAsset: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ url: string }>('/api/email/assets', { method: 'POST', body: form });
  },
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
      tipoInteresseAlvo?: string;
      corretorIds?: string[];
    }): Promise<{ campaign: EmailCampaign; resultadoEnvio: { simulated: boolean; enviados: number; falhas: number } }> => {
      const res = await apiFetch<{ campaign: ApiEmailCampaign; resultadoEnvio: { simulated: boolean; enviados: number; falhas: number } }>(
        '/api/email/campaigns/send',
        { method: 'POST', body: { ...data, destinatarioTipo: mapDestinatarioTipoToApi(data.destinatarioTipo) } }
      );
      return { campaign: mapEmailCampaignFromApi(res.campaign), resultadoEnvio: res.resultadoEnvio };
    },
  },
};

// ── Tabela de Empreendimentos ─────────────────────────────────────

export const tabelasEmpreendimentosApi = {
  list: () => apiFetch<TabelaEmpreendimentoResumo[]>('/api/tabelas-empreendimentos'),
  get: (id: string) => apiFetch<TabelaEmpreendimentoDetalhe>(`/api/tabelas-empreendimentos/${id}`),
  create: (nome: string) =>
    apiFetch<{ id: string; nome: string }>('/api/tabelas-empreendimentos', { method: 'POST', body: { nome } }),
  save: (
    id: string,
    payload: { nome?: string; dados: unknown; celulas: CelulaAlterada[] }
  ) =>
    apiFetch<{ ok: boolean; celulasAlteradas: number; atualizadoEm: string; atualizadoPorNome: string | null }>(
      `/api/tabelas-empreendimentos/${id}`,
      { method: 'PUT', body: payload }
    ),
  remove: (id: string) => apiFetch<void>(`/api/tabelas-empreendimentos/${id}`, { method: 'DELETE' }),
};

// ── Agenda / Aniversários ──────────────────────────────────────────

export const agendaApi = {
  aniversarios: (ano: number, mes: number) =>
    apiFetch<AniversarioAgenda[]>('/api/agenda/aniversarios', { query: { ano, mes } }),
  sugestao: (corretorId: string) =>
    apiFetch<{ mensagem: string; gerado: boolean }>(`/api/agenda/aniversarios/${corretorId}/sugestao`, { method: 'POST' }),
  registrar: (corretorId: string, ano: number, mensagem: string) =>
    apiFetch<{ saudacao: SaudacaoAniversario }>(`/api/agenda/aniversarios/${corretorId}/registrar`, {
      method: 'POST',
      body: { ano, mensagem },
    }),
};

// ── WhatsApp ───────────────────────────────────────────────────────

export const whatsappApi = {
  /**
   * Passe `corretorId` OU `clienteFinalId` (apenas um). Hoje é sempre `logOnly: true`: só
   * valida a permissão e registra a interação no card — o envio de fato é feito pela pessoa
   * no WhatsApp Web/app dela (link "click to chat"). Sem `logOnly`, tentaria enviar pela Meta.
   */
  send: (
    alvo: { corretorId: string } | { clienteFinalId: string },
    message: string,
    opts?: { logOnly?: boolean }
  ) =>
    apiFetch<{ simulated: boolean; logOnly?: boolean }>('/api/whatsapp/send', {
      method: 'POST',
      body: { ...alvo, message, ...(opts?.logOnly ? { logOnly: true } : {}) },
    }),
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
  /** Encarregado de Proteção de Dados (LGPD, art. 41) — exibido na política de privacidade. */
  dpoNome: string;
  dpoEmail: string;
  updatedAt: string;
}

export const companyProfileApi = {
  get: () => apiFetch<CompanyProfile>('/api/company-profile'),
  update: (data: Partial<{ nome: string; cnpj: string; cidade: string; dpoNome: string; dpoEmail: string }>) =>
    apiFetch<CompanyProfile>('/api/company-profile', { method: 'PATCH', body: data }),
};

// ── Calendário de Rodadas ────────────────────────────────────────────

export const rodadasApi = {
  // Perfis sem acesso ao formulário completo (todos exceto Diretoria) recebem cada item já
  // resumido pela própria API — ver `RODADA_SUMMARY_SELECT` no backend.
  list: async (): Promise<(Rodada | RodadaResumo)[]> => {
    const res = await apiFetch<(ApiRodada | ApiRodadaResumo)[]>('/api/rodadas');
    return res.map(mapRodadaListItemFromApi);
  },
  create: (data: CreateRodadaPayload): Promise<Rodada> =>
    apiFetch<ApiRodada>('/api/rodadas', { method: 'POST', body: mapCreateRodadaToApi(data) }).then(mapRodadaFromApi),
  update: (id: string, data: CreateRodadaPayload): Promise<Rodada> =>
    apiFetch<ApiRodada>(`/api/rodadas/${id}`, { method: 'PATCH', body: mapCreateRodadaToApi(data) }).then(mapRodadaFromApi),
  remove: (id: string): Promise<void> => apiFetch<void>(`/api/rodadas/${id}`, { method: 'DELETE' }),
  uploadAsset: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ url: string }>('/api/rodadas/assets', { method: 'POST', body: form });
  },
};

// ── Notificações ──────────────────────────────────────────────────────

export const notificacoesApi = {
  list: async (): Promise<{ notificacoes: Notificacao[]; naoLidas: number }> => {
    const res = await apiFetch<{ notificacoes: ApiNotificacao[]; naoLidas: number }>('/api/notificacoes');
    return { notificacoes: res.notificacoes.map(mapNotificacaoFromApi), naoLidas: res.naoLidas };
  },
  markRead: (id: string): Promise<void> =>
    apiFetch<void>(`/api/notificacoes/${id}`, { method: 'PATCH', body: { lida: true } }),
  markAllRead: (): Promise<void> => apiFetch<void>('/api/notificacoes/marcar-todas-lidas', { method: 'POST' }),
};

// ── Empreendimentos & Unidades ────────────────────────────────────────

function unidadePayloadToApi(data: CreateUnidadePayload) {
  return { ...data, status: mapStatusUnidadeToApi(data.status) };
}

export const empreendimentosApi = {
  list: async (): Promise<Empreendimento[]> => {
    const res = await apiFetch<ApiEmpreendimento[]>('/api/empreendimentos');
    return res.map(mapEmpreendimentoFromApi);
  },
  get: async (id: string): Promise<EmpreendimentoDetail> => {
    const res = await apiFetch<ApiEmpreendimentoDetail>(`/api/empreendimentos/${id}`);
    return mapEmpreendimentoDetailFromApi(res);
  },
  create: (data: CreateEmpreendimentoPayload): Promise<Empreendimento> =>
    apiFetch<ApiEmpreendimento>('/api/empreendimentos', { method: 'POST', body: data }).then(mapEmpreendimentoFromApi),
  update: (id: string, data: CreateEmpreendimentoPayload): Promise<Empreendimento> =>
    apiFetch<ApiEmpreendimento>(`/api/empreendimentos/${id}`, { method: 'PATCH', body: data }).then(mapEmpreendimentoFromApi),
  remove: (id: string): Promise<void> => apiFetch<void>(`/api/empreendimentos/${id}`, { method: 'DELETE' }),
  uploadAsset: (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ url: string }>('/api/empreendimentos/assets', { method: 'POST', body: form });
  },
  unidades: {
    create: (empreendimentoId: string, data: CreateUnidadePayload): Promise<Unidade> =>
      apiFetch<ApiUnidade>(`/api/empreendimentos/${empreendimentoId}/unidades`, {
        method: 'POST',
        body: unidadePayloadToApi(data),
      }).then(mapUnidadeFromApi),
  },
};

export const unidadesApi = {
  update: (id: string, data: CreateUnidadePayload): Promise<Unidade> =>
    apiFetch<ApiUnidade>(`/api/unidades/${id}`, { method: 'PATCH', body: unidadePayloadToApi(data) }).then(mapUnidadeFromApi),
  remove: (id: string): Promise<void> => apiFetch<void>(`/api/unidades/${id}`, { method: 'DELETE' }),
};

// ── Histórico de Ações ──────────────────────────────────────────────
// Só existe list() — não há create/update/delete pra esse recurso, nem no backend.

export interface LogAcaoListParams {
  q?: string;
  entidade?: string;
  de?: string;
  ate?: string;
  page?: number;
  pageSize?: number;
}

export interface LogAcaoListResult {
  logs: LogAcao[];
  total: number;
  page: number;
  pageSize: number;
  entidadesDisponiveis: string[];
}

export const logAcaoApi = {
  list: async (params?: LogAcaoListParams): Promise<LogAcaoListResult> => {
    const res = await apiFetch<{
      logs: ApiLogAcao[];
      total: number;
      page: number;
      pageSize: number;
      entidadesDisponiveis: string[];
    }>('/api/logs-acao', { query: { ...params } });
    return { ...res, logs: res.logs.map(mapLogAcaoFromApi) };
  },
};

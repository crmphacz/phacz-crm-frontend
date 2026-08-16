import { create } from 'zustand';
import type {
  Corretor, ClienteFinal, Interacao, Proposta, Temperatura, UserProfile, CanalOrigem,
  EmailTemplate, EmailCampaign, ChatMessage, DestinatarioTipo, UserCargo,
  Rodada, RodadaResumo, CreateRodadaPayload, Notificacao, Empreendimento, CreateEmpreendimentoPayload,
} from './types';
import {
  authApi, usersApi, corretoresApi, emailApi, iaApi, canaisOrigemApi, companyProfileApi, tiposInteresseApi, imobiliariasApi,
  condicoesPagamentoApi, pushApi, savedSearchesApi, rodadasApi, notificacoesApi, empreendimentosApi,
  type CreateCorretorPayload, type AppUser, type CanalOrigemItem, type CompanyProfile, type TipoInteresseItem, type ImobiliariaItem,
  type CondicaoPagamentoItem, type SavedSearchItem,
} from './api/endpoints.js';
import { mapCargoFromApi } from './api/mappers.js';
import { getToken, setToken, clearToken, ApiError } from './api/client.js';
import { isPushSupported, getExistingPushSubscription, subscribeToPush, unsubscribeFromPush } from './push';
import { getDefaultView } from './permissions';

export type ViewMode =
  | 'pipeline'
  | 'dashboard'
  | 'corretores'
  | 'clientes'
  | 'config-usuarios'
  | 'config-empresa'
  | 'config-regras'
  | 'indicadores'
  | 'email-marketing'
  | 'phacz-ia'
  | 'rodadas'
  | 'empreendimentos';

export interface PipelineFiltros {
  searchQuery: string;
  filterTemperatura: Temperatura | 'all';
  filterEtapa: number | 'all';
  filterResponsavel: string | 'all';
  filterCanalOrigem: CanalOrigem | 'all';
}

interface StoreState {
  corretores: Corretor[];
  users: AppUser[];
  canaisOrigem: CanalOrigemItem[];
  tiposInteresseOptions: TipoInteresseItem[];
  imobiliariasOptions: ImobiliariaItem[];
  condicoesPagamentoOptions: CondicaoPagamentoItem[];
  companyProfile: CompanyProfile | null;
  selectedCorretorId: string | null;
  view: ViewMode;
  filterTemperatura: Temperatura | 'all';
  filterEtapa: number | 'all';
  filterResponsavel: string | 'all';
  filterCanalOrigem: CanalOrigem | 'all';
  searchQuery: string;
  savedSearches: SavedSearchItem[];
  showNewCorretorModal: boolean;
  isLoggedIn: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  currentUser: UserProfile | null;

  emailTemplates: EmailTemplate[];
  emailCampaigns: EmailCampaign[];

  chatMessages: ChatMessage[];

  rodadas: (Rodada | RodadaResumo)[];
  notificacoes: Notificacao[];
  notificacoesNaoLidas: number;
  rodadaFocoData: string | null;

  empreendimentos: Empreendimento[];

  pushSupported: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  pushSubscribed: boolean;

  // Auth
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  initFromToken: () => Promise<void>;

  // Setters
  setView: (v: ViewMode) => void;
  setSelectedCorretor: (id: string | null) => void;
  setFilterTemperatura: (t: Temperatura | 'all') => void;
  setFilterEtapa: (e: number | 'all') => void;
  setFilterResponsavel: (r: string | 'all') => void;
  setFilterCanalOrigem: (c: CanalOrigem | 'all') => void;
  setSearchQuery: (q: string) => void;
  setShowNewCorretorModal: (v: boolean) => void;
  clearAdvancedFilters: () => void;

  // Corretor CRUD
  addCorretor: (corretor: CreateCorretorPayload) => Promise<string>;
  updateCorretor: (id: string, updates: Partial<Corretor>) => Promise<void>;
  moveCorretor: (id: string, toEtapa: number) => Promise<void>;
  archiveCorretor: (id: string, motivo: string) => Promise<void>;
  markAsWon: (id: string, valor: number) => Promise<void>;
  markAsLost: (id: string, motivo: string) => Promise<void>;
  deleteCorretor: (id: string) => Promise<void>;

  // ClienteFinal CRUD
  addClienteFinal: (corretorId: string, cf: Omit<ClienteFinal, 'id' | 'dataAdicionado' | 'negocioGerado'>) => Promise<void>;
  removeClienteFinal: (corretorId: string, cfId: string) => Promise<void>;

  // Interação
  addInteracao: (corretorId: string, interacao: Omit<Interacao, 'id'>) => Promise<void>;

  // Proposta
  addProposta: (corretorId: string, proposta: Omit<Proposta, 'id'>, arquivo?: File) => Promise<void>;
  updateProposta: (corretorId: string, propostaId: string, updates: Partial<Proposta>) => Promise<void>;
  downloadPropostaAnexo: (corretorId: string, propostaId: string, filename: string) => Promise<void>;

  // Gerar negócio (split)
  gerarNegocio: (parentCorretorId: string, clienteFinalId: string) => Promise<string>;

  // Email Marketing
  saveEmailTemplate: (template: EmailTemplate) => Promise<EmailTemplate>;
  deleteEmailTemplate: (id: string) => Promise<void>;
  duplicateEmailTemplate: (id: string) => Promise<string>;
  sendEmailCampaign: (data: {
    templateId: string;
    destinatarioTipo: DestinatarioTipo;
    etapaAlvo?: number;
    empreendimentoAlvo?: string;
    clienteIds?: string[];
  }) => Promise<{ enviados: number; falhas: number; simulated: boolean }>;
  deleteEmailCampaign: (id: string) => Promise<void>;

  // PHACZ IA
  sendChatMessage: (message: string) => Promise<void>;
  clearChat: () => Promise<void>;

  // Usuários da plataforma (Diretora)
  createUser: (data: { nome: string; email: string; senha: string; cargo: UserCargo; cor?: string }) => Promise<AppUser>;
  updateUser: (id: string, data: Partial<{ nome: string; cargo: UserCargo; cor: string; ativo: boolean }>) => Promise<AppUser>;
  deactivateUser: (id: string) => Promise<void>;

  // Canais de Origem
  createCanalOrigem: (nome: string) => Promise<CanalOrigemItem>;
  updateCanalOrigem: (id: string, data: Partial<{ nome: string; ativo: boolean }>) => Promise<CanalOrigemItem>;
  removeCanalOrigem: (id: string) => Promise<void>;

  // Tipos de Interesse
  createTipoInteresse: (nome: string) => Promise<TipoInteresseItem>;
  updateTipoInteresse: (id: string, data: Partial<{ nome: string; ativo: boolean }>) => Promise<TipoInteresseItem>;
  removeTipoInteresse: (id: string) => Promise<void>;

  // Imobiliárias
  createImobiliaria: (nome: string) => Promise<ImobiliariaItem>;
  updateImobiliaria: (id: string, data: Partial<{ nome: string; ativo: boolean }>) => Promise<ImobiliariaItem>;
  removeImobiliaria: (id: string) => Promise<void>;

  // Condições de Pagamento
  createCondicaoPagamento: (nome: string) => Promise<CondicaoPagamentoItem>;
  updateCondicaoPagamento: (id: string, data: Partial<{ nome: string; ativo: boolean }>) => Promise<CondicaoPagamentoItem>;
  removeCondicaoPagamento: (id: string) => Promise<void>;

  // Perfil da Empresa
  updateCompanyProfile: (data: Partial<{ nome: string; cnpj: string; cidade: string }>) => Promise<CompanyProfile>;

  // Notificações push
  refreshPushStatus: () => Promise<void>;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;

  // Buscas salvas
  createSavedSearch: (nome: string) => Promise<SavedSearchItem>;
  removeSavedSearch: (id: string) => Promise<void>;
  applySavedSearch: (search: SavedSearchItem) => void;

  // Calendário de Rodadas
  createRodada: (data: CreateRodadaPayload) => Promise<Rodada>;
  updateRodada: (id: string, data: CreateRodadaPayload) => Promise<Rodada>;
  removeRodada: (id: string) => Promise<void>;

  // Notificações in-app
  loadNotificacoes: () => Promise<void>;
  markNotificacaoLida: (id: string) => Promise<void>;
  markAllNotificacoesLidas: () => Promise<void>;
  abrirNotificacaoRodada: (n: Notificacao) => void;
  clearRodadaFoco: () => void;

  // Empreendimentos & Unidades
  createEmpreendimento: (data: CreateEmpreendimentoPayload) => Promise<Empreendimento>;
  updateEmpreendimento: (id: string, data: CreateEmpreendimentoPayload) => Promise<Empreendimento>;
  removeEmpreendimento: (id: string) => Promise<void>;
  refreshEmpreendimentoSummary: (id: string) => Promise<void>;
}

function findUserIdByName(users: AppUser[], nome: string): string | undefined {
  return users.find((u) => u.nome === nome)?.id;
}

export const useStore = create<StoreState>()((set, get) => ({
  corretores: [],
  users: [],
  canaisOrigem: [],
  tiposInteresseOptions: [],
  imobiliariasOptions: [],
  condicoesPagamentoOptions: [],
  companyProfile: null,
  selectedCorretorId: null,
  view: 'pipeline',
  filterTemperatura: 'all',
  filterEtapa: 'all',
  filterResponsavel: 'all',
  filterCanalOrigem: 'all',
  searchQuery: '',
  savedSearches: [],
  showNewCorretorModal: false,
  isLoggedIn: false,
  isBootstrapping: false,
  authError: null,
  currentUser: null,

  emailTemplates: [],
  emailCampaigns: [],

  chatMessages: [],

  rodadas: [],
  notificacoes: [],
  notificacoesNaoLidas: 0,
  rodadaFocoData: null,

  empreendimentos: [],

  pushSupported: isPushSupported(),
  pushPermission: isPushSupported() ? Notification.permission : 'unsupported',
  pushSubscribed: false,

  login: async (email, senha) => {
    set({ authError: null });
    try {
      const result = await authApi.login(email, senha);
      setToken(result.token);
      set({
        isLoggedIn: true,
        currentUser: {
          id: result.user.id,
          nome: result.user.nome,
          email: result.user.email,
          cargo: mapCargoFromApi(result.user.cargo),
          cor: result.user.cor,
        },
      });
      await get().initFromToken();
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível conectar ao servidor';
      set({ authError: message });
      return false;
    }
  },

  logout: () => {
    clearToken();
    set({
      isLoggedIn: false,
      currentUser: null,
      selectedCorretorId: null,
      view: 'pipeline',
      corretores: [],
      users: [],
      canaisOrigem: [],
      tiposInteresseOptions: [],
      imobiliariasOptions: [],
      condicoesPagamentoOptions: [],
      companyProfile: null,
      emailTemplates: [],
      emailCampaigns: [],
      chatMessages: [],
      savedSearches: [],
      rodadas: [],
      notificacoes: [],
      notificacoesNaoLidas: 0,
      rodadaFocoData: null,
      empreendimentos: [],
    });
  },

  initFromToken: async () => {
    const token = getToken();
    if (!token) return;

    set({ isBootstrapping: true });
    try {
      const me = await authApi.me();
      const currentUser = { id: me.id, nome: me.nome, email: me.email, cargo: mapCargoFromApi(me.cargo), cor: me.cor };
      set({
        isLoggedIn: true,
        currentUser,
        view: getDefaultView(currentUser),
      });

      const [corretores, users, canaisOrigem, tiposInteresseOptions, imobiliariasOptions, condicoesPagamentoOptions, companyProfile, emailTemplates, emailCampaigns, chatMessages, savedSearches, rodadas, notificacoesResult, empreendimentos] = await Promise.all([
        corretoresApi.list(),
        usersApi.list(),
        canaisOrigemApi.list(),
        tiposInteresseApi.list(),
        imobiliariasApi.list(),
        condicoesPagamentoApi.list(),
        companyProfileApi.get(),
        emailApi.templates.list(),
        emailApi.campaigns.list(),
        iaApi.history(),
        savedSearchesApi.list(),
        rodadasApi.list(),
        notificacoesApi.list(),
        empreendimentosApi.list(),
      ]);

      set({
        corretores, users, canaisOrigem, tiposInteresseOptions, imobiliariasOptions, condicoesPagamentoOptions,
        companyProfile, emailTemplates, emailCampaigns, chatMessages, savedSearches, rodadas, empreendimentos,
        notificacoes: notificacoesResult.notificacoes, notificacoesNaoLidas: notificacoesResult.naoLidas,
      });
      get().refreshPushStatus().catch(() => undefined);
    } catch {
      clearToken();
      set({ isLoggedIn: false, currentUser: null });
    } finally {
      set({ isBootstrapping: false });
    }
  },

  setView: (v) => set({ view: v, selectedCorretorId: null }),
  setSelectedCorretor: (id) => set({ selectedCorretorId: id }),
  setFilterTemperatura: (t) => set({ filterTemperatura: t }),
  setFilterEtapa: (e) => set({ filterEtapa: e }),
  setFilterResponsavel: (r) => set({ filterResponsavel: r }),
  setFilterCanalOrigem: (c) => set({ filterCanalOrigem: c }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setShowNewCorretorModal: (v) => set({ showNewCorretorModal: v }),
  clearAdvancedFilters: () => set({ filterEtapa: 'all', filterResponsavel: 'all', filterCanalOrigem: 'all' }),

  addCorretor: async (corretorData) => {
    const corretor = await corretoresApi.create(corretorData);
    set((state) => ({ corretores: [...state.corretores, corretor] }));
    return corretor.id;
  },

  updateCorretor: async (id, updates) => {
    const { users } = get();
    const responsavelIds: { responsavelSDRId?: string; responsavelGVId?: string; responsavelGRId?: string } = {};

    if (updates.responsavelSDR !== undefined) {
      responsavelIds.responsavelSDRId = updates.responsavelSDR ? findUserIdByName(users, updates.responsavelSDR) : undefined;
    }
    if (updates.responsavelGV !== undefined) {
      responsavelIds.responsavelGVId = updates.responsavelGV ? findUserIdByName(users, updates.responsavelGV) : undefined;
    }
    if (updates.responsavelGR !== undefined) {
      responsavelIds.responsavelGRId = updates.responsavelGR ? findUserIdByName(users, updates.responsavelGR) : undefined;
    }

    const updated = await corretoresApi.update(id, updates, responsavelIds);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === id ? updated : l)) }));
  },

  moveCorretor: async (id, toEtapa) => {
    const updated = await corretoresApi.move(id, toEtapa);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === id ? updated : l)) }));
  },

  archiveCorretor: async (id, motivo) => {
    const updated = await corretoresApi.archive(id, motivo);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === id ? updated : l)) }));
  },

  markAsWon: async (id, valor) => {
    const updated = await corretoresApi.markAsWon(id, valor);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === id ? updated : l)) }));
  },

  markAsLost: async (id, motivo) => {
    const updated = await corretoresApi.markAsLost(id, motivo);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === id ? updated : l)) }));
  },

  deleteCorretor: async (id) => {
    await corretoresApi.remove(id);
    set((state) => ({
      corretores: state.corretores.filter((l) => l.id !== id),
      selectedCorretorId: state.selectedCorretorId === id ? null : state.selectedCorretorId,
    }));
  },

  addClienteFinal: async (corretorId, cfData) => {
    await corretoresApi.addCliente(corretorId, cfData);
    const refreshed = await corretoresApi.get(corretorId);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === corretorId ? refreshed : l)) }));
  },

  removeClienteFinal: async (corretorId, cfId) => {
    await corretoresApi.removeCliente(corretorId, cfId);
    set((state) => ({
      corretores: state.corretores.map((l) =>
        l.id === corretorId ? { ...l, clientesFinais: l.clientesFinais.filter((cf) => cf.id !== cfId) } : l
      ),
    }));
  },

  addInteracao: async (corretorId, interacaoData) => {
    await corretoresApi.addInteracao(corretorId, interacaoData);
    const refreshed = await corretoresApi.get(corretorId);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === corretorId ? refreshed : l)) }));
  },

  addProposta: async (corretorId, propostaData, arquivo) => {
    await corretoresApi.addProposta(corretorId, propostaData, arquivo);
    const refreshed = await corretoresApi.get(corretorId);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === corretorId ? refreshed : l)) }));
  },

  updateProposta: async (corretorId, propostaId, updates) => {
    await corretoresApi.updateProposta(corretorId, propostaId, updates);
    const refreshed = await corretoresApi.get(corretorId);
    set((state) => ({ corretores: state.corretores.map((l) => (l.id === corretorId ? refreshed : l)) }));
  },

  downloadPropostaAnexo: (corretorId, propostaId, filename) =>
    corretoresApi.downloadPropostaAnexo(corretorId, propostaId, filename),

  gerarNegocio: async (parentCorretorId, clienteFinalId) => {
    const novoNegocio = await corretoresApi.gerarNegocio(parentCorretorId, clienteFinalId);
    const parentAtualizado = await corretoresApi.get(parentCorretorId);
    set((state) => ({
      corretores: [...state.corretores.map((l) => (l.id === parentCorretorId ? parentAtualizado : l)), novoNegocio],
    }));
    return novoNegocio.id;
  },

  saveEmailTemplate: async (template) => {
    const exists = get().emailTemplates.some((t) => t.id === template.id);
    const saved = exists
      ? await emailApi.templates.update(template.id, template)
      : await emailApi.templates.create(template);

    set((state) => ({
      emailTemplates: exists
        ? state.emailTemplates.map((t) => (t.id === saved.id ? saved : t))
        : [...state.emailTemplates, saved],
    }));
    return saved;
  },

  deleteEmailTemplate: async (id) => {
    await emailApi.templates.remove(id);
    set((state) => ({ emailTemplates: state.emailTemplates.filter((t) => t.id !== id) }));
  },

  duplicateEmailTemplate: async (id) => {
    const copy = await emailApi.templates.duplicate(id);
    set((state) => ({ emailTemplates: [...state.emailTemplates, copy] }));
    return copy.id;
  },

  sendEmailCampaign: async (data) => {
    const { campaign, resultadoEnvio } = await emailApi.campaigns.send(data);
    set((state) => ({ emailCampaigns: [campaign, ...state.emailCampaigns] }));
    return resultadoEnvio;
  },

  deleteEmailCampaign: async (id) => {
    await emailApi.campaigns.remove(id);
    set((state) => ({ emailCampaigns: state.emailCampaigns.filter((c) => c.id !== id) }));
  },

  sendChatMessage: async (message) => {
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      criadoEm: new Date().toISOString(),
    };
    set((state) => ({ chatMessages: [...state.chatMessages, userMessage] }));

    const assistantMessage = await iaApi.chat(message);
    set((state) => ({ chatMessages: [...state.chatMessages, assistantMessage] }));
  },

  clearChat: async () => {
    await iaApi.clearHistory();
    set({ chatMessages: [] });
  },

  createUser: async (data) => {
    const user = await usersApi.create(data);
    set((state) => ({ users: [...state.users, user] }));
    return user;
  },

  updateUser: async (id, data) => {
    const updated = await usersApi.update(id, data);
    set((state) => ({ users: state.users.map((u) => (u.id === id ? updated : u)) }));
    return updated;
  },

  deactivateUser: async (id) => {
    await usersApi.remove(id);
    set((state) => ({ users: state.users.map((u) => (u.id === id ? { ...u, ativo: false } : u)) }));
  },

  createCanalOrigem: async (nome) => {
    const canal = await canaisOrigemApi.create(nome);
    set((state) => ({ canaisOrigem: [...state.canaisOrigem, canal] }));
    return canal;
  },

  updateCanalOrigem: async (id, data) => {
    const updated = await canaisOrigemApi.update(id, data);
    set((state) => ({ canaisOrigem: state.canaisOrigem.map((c) => (c.id === id ? updated : c)) }));
    return updated;
  },

  removeCanalOrigem: async (id) => {
    await canaisOrigemApi.remove(id);
    set((state) => ({ canaisOrigem: state.canaisOrigem.filter((c) => c.id !== id) }));
  },

  createTipoInteresse: async (nome) => {
    const tipo = await tiposInteresseApi.create(nome);
    set((state) => ({ tiposInteresseOptions: [...state.tiposInteresseOptions, tipo] }));
    return tipo;
  },

  updateTipoInteresse: async (id, data) => {
    const updated = await tiposInteresseApi.update(id, data);
    set((state) => ({ tiposInteresseOptions: state.tiposInteresseOptions.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  removeTipoInteresse: async (id) => {
    await tiposInteresseApi.remove(id);
    set((state) => ({ tiposInteresseOptions: state.tiposInteresseOptions.filter((t) => t.id !== id) }));
  },

  createImobiliaria: async (nome) => {
    const imobiliaria = await imobiliariasApi.create(nome);
    set((state) => ({ imobiliariasOptions: [...state.imobiliariasOptions, imobiliaria] }));
    return imobiliaria;
  },

  updateImobiliaria: async (id, data) => {
    const updated = await imobiliariasApi.update(id, data);
    set((state) => ({ imobiliariasOptions: state.imobiliariasOptions.map((i) => (i.id === id ? updated : i)) }));
    return updated;
  },

  removeImobiliaria: async (id) => {
    await imobiliariasApi.remove(id);
    set((state) => ({ imobiliariasOptions: state.imobiliariasOptions.filter((i) => i.id !== id) }));
  },

  createCondicaoPagamento: async (nome) => {
    const condicao = await condicoesPagamentoApi.create(nome);
    set((state) => ({ condicoesPagamentoOptions: [...state.condicoesPagamentoOptions, condicao] }));
    return condicao;
  },

  updateCondicaoPagamento: async (id, data) => {
    const updated = await condicoesPagamentoApi.update(id, data);
    set((state) => ({ condicoesPagamentoOptions: state.condicoesPagamentoOptions.map((c) => (c.id === id ? updated : c)) }));
    return updated;
  },

  removeCondicaoPagamento: async (id) => {
    await condicoesPagamentoApi.remove(id);
    set((state) => ({ condicoesPagamentoOptions: state.condicoesPagamentoOptions.filter((c) => c.id !== id) }));
  },

  updateCompanyProfile: async (data) => {
    const updated = await companyProfileApi.update(data);
    set({ companyProfile: updated });
    return updated;
  },

  refreshPushStatus: async () => {
    if (!isPushSupported()) {
      set({ pushSupported: false, pushPermission: 'unsupported', pushSubscribed: false });
      return;
    }
    const subscription = await getExistingPushSubscription().catch(() => null);
    set({
      pushSupported: true,
      pushPermission: Notification.permission,
      pushSubscribed: Boolean(subscription),
    });
  },

  enablePush: async () => {
    const { publicKey, configurado } = await pushApi.vapidPublicKey();
    if (!configurado || !publicKey) {
      throw new Error('Notificações push ainda não foram configuradas no servidor.');
    }
    const subscription = await subscribeToPush(publicKey);
    await pushApi.subscribe(subscription.toJSON());
    set({ pushSubscribed: true, pushPermission: Notification.permission });
  },

  disablePush: async () => {
    const endpoint = await unsubscribeFromPush();
    if (endpoint) await pushApi.unsubscribe(endpoint).catch(() => undefined);
    set({ pushSubscribed: false });
  },

  createSavedSearch: async (nome) => {
    const { searchQuery, filterTemperatura, filterEtapa, filterResponsavel, filterCanalOrigem } = get();
    const filtros: PipelineFiltros = { searchQuery, filterTemperatura, filterEtapa, filterResponsavel, filterCanalOrigem };
    const saved = await savedSearchesApi.create(nome, filtros as unknown as Record<string, unknown>);
    set((state) => ({ savedSearches: [saved, ...state.savedSearches] }));
    return saved;
  },

  removeSavedSearch: async (id) => {
    await savedSearchesApi.remove(id);
    set((state) => ({ savedSearches: state.savedSearches.filter((s) => s.id !== id) }));
  },

  applySavedSearch: (search) => {
    const filtros = search.filtros as Partial<PipelineFiltros>;
    set({
      searchQuery: filtros.searchQuery ?? '',
      filterTemperatura: filtros.filterTemperatura ?? 'all',
      filterEtapa: filtros.filterEtapa ?? 'all',
      filterResponsavel: filtros.filterResponsavel ?? 'all',
      filterCanalOrigem: filtros.filterCanalOrigem ?? 'all',
    });
  },

  createRodada: async (data) => {
    const rodada = await rodadasApi.create(data);
    set((state) => ({ rodadas: [...state.rodadas, rodada] }));
    get().loadNotificacoes().catch(() => undefined);
    return rodada;
  },

  updateRodada: async (id, data) => {
    const updated = await rodadasApi.update(id, data);
    set((state) => ({ rodadas: state.rodadas.map((r) => (r.id === id ? updated : r)) }));
    return updated;
  },

  removeRodada: async (id) => {
    await rodadasApi.remove(id);
    set((state) => ({ rodadas: state.rodadas.filter((r) => r.id !== id) }));
  },

  loadNotificacoes: async () => {
    const { notificacoes, naoLidas } = await notificacoesApi.list();
    set({ notificacoes, notificacoesNaoLidas: naoLidas });
  },

  markNotificacaoLida: async (id) => {
    set((state) => ({
      notificacoes: state.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      notificacoesNaoLidas: Math.max(0, state.notificacoesNaoLidas - (state.notificacoes.find((n) => n.id === id)?.lida ? 0 : 1)),
    }));
    await notificacoesApi.markRead(id).catch(() => undefined);
  },

  markAllNotificacoesLidas: async () => {
    set((state) => ({
      notificacoes: state.notificacoes.map((n) => ({ ...n, lida: true })),
      notificacoesNaoLidas: 0,
    }));
    await notificacoesApi.markAllRead().catch(() => undefined);
  },

  abrirNotificacaoRodada: (n) => {
    set({ view: 'rodadas', selectedCorretorId: null, rodadaFocoData: n.rodadaDataInicio ?? null });
    if (!n.lida) get().markNotificacaoLida(n.id);
  },

  clearRodadaFoco: () => set({ rodadaFocoData: null }),

  createEmpreendimento: async (data) => {
    const empreendimento = await empreendimentosApi.create(data);
    set((state) => ({ empreendimentos: [empreendimento, ...state.empreendimentos] }));
    return empreendimento;
  },

  updateEmpreendimento: async (id, data) => {
    const updated = await empreendimentosApi.update(id, data);
    set((state) => ({ empreendimentos: state.empreendimentos.map((e) => (e.id === id ? updated : e)) }));
    return updated;
  },

  removeEmpreendimento: async (id) => {
    await empreendimentosApi.remove(id);
    set((state) => ({ empreendimentos: state.empreendimentos.filter((e) => e.id !== id) }));
  },

  refreshEmpreendimentoSummary: async (id) => {
    const detail = await empreendimentosApi.get(id);
    const totalUnidades = detail.unidades.length;
    const unidadesDisponiveis = detail.unidades.filter((u) => u.status === 'disponivel').length;
    set((state) => ({
      empreendimentos: state.empreendimentos.map((e) =>
        e.id === id ? { ...e, totalUnidades, unidadesDisponiveis, updatedAt: detail.updatedAt } : e
      ),
    }));
  },
}));

export const useSelectedCorretor = () => {
  const corretores = useStore((s) => s.corretores);
  const selectedCorretorId = useStore((s) => s.selectedCorretorId);
  return corretores.find((l) => l.id === selectedCorretorId) ?? null;
};

export interface ClienteFinalComContexto extends ClienteFinal {
  corretorId: string;
  nomeCorretor: string;
  imobiliaria: string;
  etapaCorretor: number;
}

export const useAllClientesFinais = (): ClienteFinalComContexto[] => {
  const corretores = useStore((s) => s.corretores);
  return corretores.flatMap((l) =>
    l.clientesFinais.map((cf) => ({
      ...cf,
      corretorId: l.id,
      nomeCorretor: l.nomeCorretor,
      imobiliaria: l.imobiliaria,
      etapaCorretor: l.etapa,
    }))
  );
};

export const useFilteredCorretores = () => {
  const corretores = useStore((s) => s.corretores);
  const filterTemperatura = useStore((s) => s.filterTemperatura);
  const filterEtapa = useStore((s) => s.filterEtapa);
  const filterResponsavel = useStore((s) => s.filterResponsavel);
  const filterCanalOrigem = useStore((s) => s.filterCanalOrigem);
  const searchQuery = useStore((s) => s.searchQuery);

  return corretores.filter((l) => {
    if (l.status === 'arquivado' || l.status === 'perdido') return false;
    if (filterTemperatura !== 'all' && l.temperatura !== filterTemperatura) return false;
    if (filterEtapa !== 'all' && l.etapa !== filterEtapa) return false;
    if (filterCanalOrigem !== 'all' && l.canalOrigem !== filterCanalOrigem) return false;
    if (filterResponsavel !== 'all') {
      const match =
        l.responsavelSDR === filterResponsavel ||
        l.responsavelGV === filterResponsavel ||
        l.responsavelGR === filterResponsavel;
      if (!match) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.nomeCorretor.toLowerCase().includes(q) ||
        l.imobiliaria.toLowerCase().includes(q) ||
        (l.clienteFinalNome?.toLowerCase().includes(q) ?? false) ||
        l.clientesFinais.some((cf) => cf.nome.toLowerCase().includes(q))
      );
    }
    return true;
  });
};

export const useUsersByCargo = (cargo: UserProfile['cargo']) => {
  const users = useStore((s) => s.users);
  return users.filter((u) => u.cargo === cargo && u.ativo).map((u) => u.nome);
};

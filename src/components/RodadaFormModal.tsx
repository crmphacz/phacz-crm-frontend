import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import {
  X, CalendarDays, ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Upload, Loader2,
} from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { rodadasApi } from '../api/endpoints';
import { maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL } from '../utils';
import { canWriteRodadas } from '../permissions';
import type {
  Rodada, CreateRodadaPayload, TipoAcaoRodada, VinculoRodadaTipo, PerfilImobiliaria, HistoricoParceria, IntencaoPrincipal,
  PublicoEsperado, CarteiraPublico, MaterialComercial, EstruturaOperacao, CategoriaOrcamento,
  ResponsavelEntrega, StatusEntrega, ComoConvite, ProximoPasso, InvestimentoOuMoradia, PlanoB,
  PotencialRetorno, PrioridadeTrimestre, Recomendacao,
} from '../types';

// ── Opções de cada campo de seleção ──────────────────────────────────

const TIPO_ACAO_OPTIONS: { value: TipoAcaoRodada; label: string }[] = [
  { value: 'rodada', label: 'Rodada' },
  { value: 'cafe_na_obra', label: 'Café na obra' },
  { value: 'evento_externo', label: 'Evento externo' },
  { value: 'trafego_pago', label: 'Tráfego pago' },
  { value: 'almoco_jantar', label: 'Almoço/Jantar' },
  { value: 'outro', label: 'Outro' },
];

const PERFIL_IMOBILIARIA_OPTIONS: { value: PerfilImobiliaria; label: string }[] = [
  { value: 'alto_padrao', label: 'Alto padrão' },
  { value: 'misto', label: 'Misto' },
  { value: 'investidor', label: 'Investidor' },
  { value: 'baixo_ticket', label: 'Baixo ticket' },
];

const HISTORICO_PARCERIA_OPTIONS: { value: HistoricoParceria; label: string }[] = [
  { value: 'ja_parceira', label: 'Já é parceira' },
  { value: 'nao_parceira', label: 'Não é parceira' },
];

const INTENCAO_PRINCIPAL_OPTIONS: { value: IntencaoPrincipal; label: string }[] = [
  { value: 'abrir_relacionamento', label: 'Abrir relacionamento/ativar parceria' },
  { value: 'reativar_base', label: 'Reativar base' },
  { value: 'engajar_corretores', label: 'Engajar corretores' },
  { value: 'gerar_visitas_propostas', label: 'Gerar visitas e propostas' },
  { value: 'conversao_vendas', label: 'Conversão em vendas' },
];

const PUBLICO_ESPERADO_OPTIONS: { value: PublicoEsperado; label: string }[] = [
  { value: 'corretores', label: 'Corretores' },
  { value: 'gerentes', label: 'Gerentes' },
  { value: 'donos', label: 'Donos' },
  { value: 'clientes_finais', label: 'Clientes finais' },
];

const CARTEIRA_PUBLICO_OPTIONS: { value: CarteiraPublico; label: string }[] = [
  { value: 'investidor', label: 'Investidor' },
  { value: 'moradia', label: 'Moradia' },
];

const MATERIAL_COMERCIAL_OPTIONS: { value: MaterialComercial; label: string }[] = [
  { value: 'apresentacao_ppt', label: 'Apresentação (PPT)' },
  { value: 'book_digital_pdf', label: 'Book digital/PDF' },
  { value: 'tabela_precos', label: 'Tabela de preços (atualizada)' },
  { value: 'plantas_imagens', label: 'Plantas/imagens' },
];

const ESTRUTURA_OPERACAO_OPTIONS: { value: EstruturaOperacao; label: string }[] = [
  { value: 'tv_projetor', label: 'TV/Projetor' },
  { value: 'som_microfone', label: 'Som/microfone' },
  { value: 'brindes', label: 'Brindes' },
];

const CATEGORIA_ORCAMENTO_OPTIONS: { value: CategoriaOrcamento; label: string }[] = [
  { value: 'deslocamento', label: 'Deslocamento e logística' },
  { value: 'hospedagem', label: 'Hospedagem da equipe' },
  { value: 'evento_estrutura', label: 'Evento/estrutura' },
  { value: 'impressos_materiais', label: 'Impressos/materiais extras' },
  { value: 'custos_internos', label: 'Custos internos' },
];

const RESPONSAVEL_ENTREGA_OPTIONS: { value: ResponsavelEntrega; label: string }[] = [
  { value: 'phacz', label: 'Phacz' },
  { value: 'corretor', label: 'Corretor' },
  { value: 'imobiliaria', label: 'Imobiliária' },
];

const STATUS_ENTREGA_OPTIONS: { value: StatusEntrega; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
];

const COMO_CONVITE_OPTIONS: { value: ComoConvite; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'email', label: 'E-mail' },
  { value: 'presencial', label: 'Presencial' },
];

const PROXIMO_PASSO_OPTIONS: { value: ProximoPasso; label: string }[] = [
  { value: 'visita', label: 'Visita' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'nutricao_conteudo', label: 'Nutrição de conteúdo' },
];

const INVESTIMENTO_OU_MORADIA_OPTIONS: { value: InvestimentoOuMoradia; label: string }[] = [
  { value: 'investimento', label: 'Investimento' },
  { value: 'moradia', label: 'Moradia' },
];

const PLANO_B_OPTIONS: { value: PlanoB; label: string }[] = [
  { value: 'reagendar', label: 'Reagendar' },
  { value: 'alterar_formato', label: 'Alterar formato' },
  { value: 'trocar_local', label: 'Trocar local' },
  { value: 'reduzir_escopo', label: 'Reduzir escopo' },
];

const POTENCIAL_RETORNO_OPTIONS: { value: PotencialRetorno; label: string }[] = [
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Médio' },
  { value: 'baixo', label: 'Baixo' },
];

const PRIORIDADE_TRIMESTRE_OPTIONS: { value: PrioridadeTrimestre; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const RECOMENDACAO_OPTIONS: { value: Recomendacao; label: string }[] = [
  { value: 'seguir', label: 'Seguir com a ação' },
  { value: 'seguir_com_ajustes', label: 'Seguir com ajustes' },
  { value: 'nao_seguir', label: 'Não seguir' },
];

const DEFAULT_ENTREGAS_ROWS = [
  { descricao: 'Quem irá apresentar a rodada?', responsavel: 'phacz' as ResponsavelEntrega, prazo: '', status: 'pendente' as StatusEntrega },
  { descricao: 'Quem estará no plantão?', responsavel: 'phacz' as ResponsavelEntrega, prazo: '', status: 'pendente' as StatusEntrega },
];

// ── Tipos de linha do formulário (com _key local para renderização em lista) ─

interface CorretorRow { _key: string; nome: string; creci: string; cargo: string; potencial: string; contato: string; observacoes: string; }
interface OrcamentoItemRow {
  _key: string; categoria: CategoriaOrcamento; descricao: string; valor: string; fornecedor: string; contato: string;
  cnpj: string; pago: boolean; periodoInicio: string; periodoFim: string; nomeReserva: string; numeroQuartos: string;
  anexoUrl: string; uploading: boolean;
}
interface EntregaRow { _key: string; descricao: string; responsavel: ResponsavelEntrega; prazo: string; status: StatusEntrega; }
interface ConvidadoRow { _key: string; nome: string; perfil: string; jaConheceLitoral: boolean; possuiOutrosImoveis: boolean; investimentoOuMoradia: InvestimentoOuMoradia | ''; }
interface VisitaRow { _key: string; clienteOuImobiliaria: string; horario: string; local: string; }
interface AgendaBlocoRow { _key: string; texto: string; }

interface FormState {
  dataSolicitacao: string;
  dataInicio: string;
  dataFim: string;
  cidade: string;
  uf: string;
  tipoAcao: TipoAcaoRodada;
  tipoAcaoOutro: string;
  imobiliaria: string;
  vinculoTipo: VinculoRodadaTipo;
  responsavelImobiliaria: string;
  gerenteVendasInternas: string;
  solicitanteRelacionamento: string;

  parceiroEndereco: string;
  parceiroPerfil: PerfilImobiliaria | '';
  parceiroHistorico: HistoricoParceria | '';
  parceiroParticipouAcaoAnterior: boolean | null;
  parceiroParticipouQuando: string;
  parceiroResumoRelacionamento: string;

  corretoresConvidados: CorretorRow[];
  equipeApoios: string;
  equipePresentes: string;

  intencaoPrincipal: IntencaoPrincipal | '';
  justificativaEstrategica: string;

  publicoEsperado: PublicoEsperado[];
  quantidadeEstimadaParticipantes: string;
  quantidadeEstimadaDetalhe: string;
  perfilPublicoTicketMedio: string;
  perfilPublicoCarteira: CarteiraPublico | '';
  empreendimentoIds: string[];
  perfilClientesSegmento: string;
  metaMinParticipantes: string;
  metaMinAgendamentos: string;
  metaMinVendas: string;
  vgvPotencialEstimado: string;

  eventoData: string;
  eventoLocalNome: string;
  eventoLocalEndereco: string;
  eventoHorario: string;
  eventoAgendaRoteiro: AgendaBlocoRow[];
  eventoAbordagemComercial: string;

  materiaisComerciais: MaterialComercial[];
  estruturaOperacao: EstruturaOperacao[];
  brindesDescricao: string;

  orcamentoItens: OrcamentoItemRow[];
  orcamentoReservaContingenciaPercentual: string;

  entregas: EntregaRow[];

  comoConvites: ComoConvite[];
  comoConvitesObs: string;
  rsvpDataLimite: string;
  rsvpResponsavel: string;
  posEventoPrazoMaterial: string;
  posEventoPrazoRegistroCrm: string;
  posEventoProximosPassos: ProximoPasso[];
  convidados: ConvidadoRow[];
  possuiVisitasAgendadas: boolean;
  visitasAgendadas: VisitaRow[];

  riscosPrincipais: string;
  mitigacaoRiscos: string;
  planoB: PlanoB | '';
  planoBDetalhes: string;

  potencialRetorno: PotencialRetorno | '';
  prioridadeTrimestre: PrioridadeTrimestre | '';
  comentarioFinalSolicitante: string;
  recomendacao: Recomendacao | '';
}

function buildInitialState(rodada?: Rodada | null, dataInicial?: string | null): FormState {
  if (!rodada) {
    return {
      dataSolicitacao: '', dataInicio: dataInicial ?? '', dataFim: dataInicial ?? '', cidade: '', uf: '',
      tipoAcao: 'rodada', tipoAcaoOutro: '', imobiliaria: '', vinculoTipo: 'imobiliaria', responsavelImobiliaria: '',
      gerenteVendasInternas: '', solicitanteRelacionamento: '',
      parceiroEndereco: '', parceiroPerfil: '', parceiroHistorico: '', parceiroParticipouAcaoAnterior: null,
      parceiroParticipouQuando: '', parceiroResumoRelacionamento: '',
      corretoresConvidados: [], equipeApoios: '', equipePresentes: '',
      intencaoPrincipal: '', justificativaEstrategica: '',
      publicoEsperado: [], quantidadeEstimadaParticipantes: '', quantidadeEstimadaDetalhe: '',
      perfilPublicoTicketMedio: '', perfilPublicoCarteira: '', empreendimentoIds: [], perfilClientesSegmento: '',
      metaMinParticipantes: '', metaMinAgendamentos: '', metaMinVendas: '', vgvPotencialEstimado: '',
      eventoData: '', eventoLocalNome: '', eventoLocalEndereco: '', eventoHorario: '', eventoAgendaRoteiro: [],
      eventoAbordagemComercial: '',
      materiaisComerciais: [], estruturaOperacao: [], brindesDescricao: '',
      orcamentoItens: [], orcamentoReservaContingenciaPercentual: '',
      entregas: DEFAULT_ENTREGAS_ROWS.map((e) => ({ ...e, _key: uuid() })),
      comoConvites: [], comoConvitesObs: '', rsvpDataLimite: '', rsvpResponsavel: '',
      posEventoPrazoMaterial: '', posEventoPrazoRegistroCrm: '', posEventoProximosPassos: [],
      convidados: [], possuiVisitasAgendadas: false, visitasAgendadas: [],
      riscosPrincipais: '', mitigacaoRiscos: '', planoB: '', planoBDetalhes: '',
      potencialRetorno: '', prioridadeTrimestre: '', comentarioFinalSolicitante: '', recomendacao: '',
    };
  }

  return {
    dataSolicitacao: rodada.dataSolicitacao ?? '',
    dataInicio: rodada.dataInicio,
    dataFim: rodada.dataFim,
    cidade: rodada.cidade,
    uf: rodada.uf,
    tipoAcao: rodada.tipoAcao,
    tipoAcaoOutro: rodada.tipoAcaoOutro,
    imobiliaria: rodada.imobiliaria,
    vinculoTipo: rodada.vinculoTipo,
    responsavelImobiliaria: rodada.responsavelImobiliaria,
    gerenteVendasInternas: rodada.gerenteVendasInternas,
    solicitanteRelacionamento: rodada.solicitanteRelacionamento,
    parceiroEndereco: rodada.parceiroEndereco,
    parceiroPerfil: rodada.parceiroPerfil ?? '',
    parceiroHistorico: rodada.parceiroHistorico ?? '',
    parceiroParticipouAcaoAnterior: rodada.parceiroParticipouAcaoAnterior ?? null,
    parceiroParticipouQuando: rodada.parceiroParticipouQuando,
    parceiroResumoRelacionamento: rodada.parceiroResumoRelacionamento,
    corretoresConvidados: rodada.corretoresConvidados.map((c) => ({ ...c, _key: uuid() })),
    equipeApoios: rodada.equipeApoios,
    equipePresentes: rodada.equipePresentes,
    intencaoPrincipal: rodada.intencaoPrincipal ?? '',
    justificativaEstrategica: rodada.justificativaEstrategica,
    publicoEsperado: rodada.publicoEsperado,
    quantidadeEstimadaParticipantes: rodada.quantidadeEstimadaParticipantes != null ? String(rodada.quantidadeEstimadaParticipantes) : '',
    quantidadeEstimadaDetalhe: rodada.quantidadeEstimadaDetalhe,
    perfilPublicoTicketMedio: rodada.perfilPublicoTicketMedio != null ? formatCurrencyBRL(rodada.perfilPublicoTicketMedio) : '',
    perfilPublicoCarteira: rodada.perfilPublicoCarteira ?? '',
    empreendimentoIds: rodada.empreendimentos.map((e) => e.id),
    perfilClientesSegmento: rodada.perfilClientesSegmento,
    metaMinParticipantes: rodada.metaMinParticipantes != null ? String(rodada.metaMinParticipantes) : '',
    metaMinAgendamentos: rodada.metaMinAgendamentos != null ? String(rodada.metaMinAgendamentos) : '',
    metaMinVendas: rodada.metaMinVendas != null ? String(rodada.metaMinVendas) : '',
    vgvPotencialEstimado: rodada.vgvPotencialEstimado != null ? formatCurrencyBRL(rodada.vgvPotencialEstimado) : '',
    eventoData: rodada.eventoData ?? '',
    eventoLocalNome: rodada.eventoLocalNome,
    eventoLocalEndereco: rodada.eventoLocalEndereco,
    eventoHorario: rodada.eventoHorario,
    eventoAgendaRoteiro: rodada.eventoAgendaRoteiro.map((texto) => ({ _key: uuid(), texto })),
    eventoAbordagemComercial: rodada.eventoAbordagemComercial,
    materiaisComerciais: rodada.materiaisComerciais,
    estruturaOperacao: rodada.estruturaOperacao,
    brindesDescricao: rodada.brindesDescricao,
    orcamentoItens: rodada.orcamentoItens.map((o) => ({
      _key: uuid(),
      categoria: o.categoria,
      descricao: o.descricao,
      valor: formatCurrencyBRL(o.valor),
      fornecedor: o.fornecedor,
      contato: o.contato,
      cnpj: o.cnpj,
      pago: o.pago,
      periodoInicio: o.periodoInicio ?? '',
      periodoFim: o.periodoFim ?? '',
      nomeReserva: o.nomeReserva,
      numeroQuartos: o.numeroQuartos != null ? String(o.numeroQuartos) : '',
      anexoUrl: o.anexoUrl,
      uploading: false,
    })),
    orcamentoReservaContingenciaPercentual: rodada.orcamentoReservaContingenciaPercentual != null ? String(rodada.orcamentoReservaContingenciaPercentual) : '',
    entregas: rodada.entregas.length > 0
      ? rodada.entregas.map((e) => ({ ...e, prazo: e.prazo ?? '', _key: uuid() }))
      : DEFAULT_ENTREGAS_ROWS.map((e) => ({ ...e, _key: uuid() })),
    comoConvites: rodada.comoConvites,
    comoConvitesObs: rodada.comoConvitesObs,
    rsvpDataLimite: rodada.rsvpDataLimite ?? '',
    rsvpResponsavel: rodada.rsvpResponsavel,
    posEventoPrazoMaterial: rodada.posEventoPrazoMaterial ?? '',
    posEventoPrazoRegistroCrm: rodada.posEventoPrazoRegistroCrm ?? '',
    posEventoProximosPassos: rodada.posEventoProximosPassos,
    convidados: rodada.convidados.map((c) => ({ ...c, investimentoOuMoradia: c.investimentoOuMoradia ?? '', _key: uuid() })),
    possuiVisitasAgendadas: rodada.possuiVisitasAgendadas,
    visitasAgendadas: rodada.visitasAgendadas.map((v) => ({ ...v, _key: uuid() })),
    riscosPrincipais: rodada.riscosPrincipais,
    mitigacaoRiscos: rodada.mitigacaoRiscos,
    planoB: rodada.planoB ?? '',
    planoBDetalhes: rodada.planoBDetalhes,
    potencialRetorno: rodada.potencialRetorno ?? '',
    prioridadeTrimestre: rodada.prioridadeTrimestre ?? '',
    comentarioFinalSolicitante: rodada.comentarioFinalSolicitante,
    recomendacao: rodada.recomendacao ?? '',
  };
}

function toPayload(form: FormState): CreateRodadaPayload {
  return {
    dataSolicitacao: form.dataSolicitacao || undefined,
    dataInicio: form.dataInicio,
    dataFim: form.dataFim,
    cidade: form.cidade.trim(),
    uf: form.uf.trim().toUpperCase(),
    tipoAcao: form.tipoAcao,
    tipoAcaoOutro: form.tipoAcaoOutro.trim(),
    imobiliaria: form.imobiliaria,
    vinculoTipo: form.vinculoTipo,
    responsavelImobiliaria: form.responsavelImobiliaria.trim(),
    gerenteVendasInternas: form.gerenteVendasInternas.trim(),
    solicitanteRelacionamento: form.solicitanteRelacionamento.trim(),

    parceiroEndereco: form.parceiroEndereco.trim(),
    parceiroPerfil: form.parceiroPerfil || undefined,
    parceiroHistorico: form.parceiroHistorico || undefined,
    parceiroParticipouAcaoAnterior: form.parceiroParticipouAcaoAnterior ?? undefined,
    parceiroParticipouQuando: form.parceiroParticipouQuando.trim(),
    parceiroResumoRelacionamento: form.parceiroResumoRelacionamento.trim(),

    corretoresConvidados: form.corretoresConvidados.map(({ _key, ...c }) => c),
    equipeApoios: form.equipeApoios.trim(),
    equipePresentes: form.equipePresentes.trim(),

    intencaoPrincipal: form.intencaoPrincipal || undefined,
    justificativaEstrategica: form.justificativaEstrategica.trim(),

    publicoEsperado: form.publicoEsperado,
    quantidadeEstimadaParticipantes: form.quantidadeEstimadaParticipantes ? Number(form.quantidadeEstimadaParticipantes) : undefined,
    quantidadeEstimadaDetalhe: form.quantidadeEstimadaDetalhe.trim(),
    perfilPublicoTicketMedio: parseCurrencyBRL(form.perfilPublicoTicketMedio),
    perfilPublicoCarteira: form.perfilPublicoCarteira || undefined,
    empreendimentoIds: form.empreendimentoIds,
    perfilClientesSegmento: form.perfilClientesSegmento.trim(),
    metaMinParticipantes: form.metaMinParticipantes ? Number(form.metaMinParticipantes) : undefined,
    metaMinAgendamentos: form.metaMinAgendamentos ? Number(form.metaMinAgendamentos) : undefined,
    metaMinVendas: form.metaMinVendas ? Number(form.metaMinVendas) : undefined,
    vgvPotencialEstimado: parseCurrencyBRL(form.vgvPotencialEstimado),

    eventoData: form.eventoData || undefined,
    eventoLocalNome: form.eventoLocalNome.trim(),
    eventoLocalEndereco: form.eventoLocalEndereco.trim(),
    eventoHorario: form.eventoHorario.trim(),
    eventoAgendaRoteiro: form.eventoAgendaRoteiro.map((b) => b.texto.trim()).filter(Boolean),
    eventoAbordagemComercial: form.eventoAbordagemComercial.trim(),

    materiaisComerciais: form.materiaisComerciais,
    estruturaOperacao: form.estruturaOperacao,
    brindesDescricao: form.brindesDescricao.trim(),

    orcamentoItens: form.orcamentoItens.map(({ _key, valor, numeroQuartos, uploading, periodoInicio, periodoFim, ...o }) => ({
      ...o,
      valor: parseCurrencyBRL(valor) ?? 0,
      numeroQuartos: numeroQuartos ? Number(numeroQuartos) : undefined,
      periodoInicio: periodoInicio || undefined,
      periodoFim: periodoFim || undefined,
    })),
    orcamentoReservaContingenciaPercentual: form.orcamentoReservaContingenciaPercentual ? Number(form.orcamentoReservaContingenciaPercentual) : undefined,

    entregas: form.entregas.map(({ _key, prazo, ...e }) => ({ ...e, prazo: prazo || undefined })),

    comoConvites: form.comoConvites,
    comoConvitesObs: form.comoConvitesObs.trim(),
    rsvpDataLimite: form.rsvpDataLimite || undefined,
    rsvpResponsavel: form.rsvpResponsavel.trim(),
    posEventoPrazoMaterial: form.posEventoPrazoMaterial || undefined,
    posEventoPrazoRegistroCrm: form.posEventoPrazoRegistroCrm || undefined,
    posEventoProximosPassos: form.posEventoProximosPassos,
    convidados: form.convidados.map(({ _key, investimentoOuMoradia, ...c }) => ({
      ...c,
      investimentoOuMoradia: investimentoOuMoradia || undefined,
    })),
    possuiVisitasAgendadas: form.possuiVisitasAgendadas,
    visitasAgendadas: form.possuiVisitasAgendadas ? form.visitasAgendadas.map(({ _key, ...v }) => v) : [],

    riscosPrincipais: form.riscosPrincipais.trim(),
    mitigacaoRiscos: form.mitigacaoRiscos.trim(),
    planoB: form.planoB || undefined,
    planoBDetalhes: form.planoBDetalhes.trim(),

    potencialRetorno: form.potencialRetorno || undefined,
    prioridadeTrimestre: form.prioridadeTrimestre || undefined,
    comentarioFinalSolicitante: form.comentarioFinalSolicitante.trim(),
    recomendacao: form.recomendacao || undefined,
  };
}

// ── Componente principal ──────────────────────────────────────────────

interface RodadaFormModalProps {
  rodada?: Rodada | null;
  dataInicial?: string | null;
  onClose: () => void;
  onSaved?: (rodada: Rodada) => void;
}

export function RodadaFormModal({ rodada, dataInicial, onClose, onSaved }: RodadaFormModalProps) {
  const currentUser = useStore((s) => s.currentUser);
  // Só a Diretoria cria/edita rodadas; os demais perfis com acesso ao módulo só visualizam.
  const isReadOnly = !canWriteRodadas(currentUser);
  const imobiliariasOptions = useStore((s) => s.imobiliariasOptions).filter((i) => i.ativo);
  const corretoresOptions = useStore((s) => s.corretores).filter((c) => c.status !== 'arquivado' && c.status !== 'perdido');
  const empreendimentosOptions = useStore((s) => s.empreendimentos);
  const ensureEmpreendimentosLoaded = useStore((s) => s.ensureEmpreendimentosLoaded);
  const createRodada = useStore((s) => s.createRodada);
  const updateRodada = useStore((s) => s.updateRodada);

  // O seletor de empreendimento usa essa lista, mas o modal pode abrir sem que a tela de
  // Empreendimentos já tenha sido visitada nesta sessão (ela é carregada sob demanda).
  useEffect(() => {
    ensureEmpreendimentosLoaded().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState<FormState>(() => buildInitialState(rodada, dataInicial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function clearError(key: string) {
    setErrors((er) => ({ ...er, [key]: '' }));
  }

  // Guarda a div de cada campo validável, pra poder rolar até o primeiro erro ao tentar
  // salvar — ver fieldRef()/handleSubmit(). `Object.keys(e)` em validate() já segue a mesma
  // ordem visual dos campos no formulário, então o primeiro erro do objeto já é o primeiro
  // campo com problema de cima pra baixo.
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function fieldRef(key: string) {
    return (el: HTMLDivElement | null) => { fieldRefs.current[key] = el; };
  }

  // Total do orçamento — somado automaticamente a partir dos itens, nunca digitado.
  const orcamentoTotal = form.orcamentoItens.reduce((sum, item) => sum + (parseCurrencyBRL(item.valor) ?? 0), 0);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.dataInicio) e.dataInicio = 'Informe a data de início prevista';
    if (!form.dataFim) e.dataFim = 'Informe a data de fim prevista';
    if (form.dataInicio && form.dataFim && form.dataFim < form.dataInicio) e.dataFim = 'A data fim não pode ser anterior à data início';
    if (!form.cidade.trim()) e.cidade = 'Informe a cidade';
    if (!form.uf.trim()) e.uf = 'Informe a UF';
    if (form.tipoAcao === 'outro' && !form.tipoAcaoOutro.trim()) e.tipoAcaoOutro = 'Descreva o tipo de ação';
    if (!form.imobiliaria) e.imobiliaria = form.vinculoTipo === 'corretor' ? 'Selecione o corretor' : 'Selecione a imobiliária';
    if (!form.metaMinParticipantes && !form.metaMinAgendamentos && !form.metaMinVendas) {
      e.metaMinima = 'Informe ao menos uma meta mínima: participantes, agendamentos ou vendas';
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const firstErrorKey = Object.keys(e)[0];
      fieldRefs.current[firstErrorKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = toPayload(form);
      const saved = rodada ? await updateRodada(rodada.id, payload) : await createRodada(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível salvar a rodada. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '94vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fff7ed' }}>
              <CalendarDays size={18} style={{ color: '#d55006' }} />
            </div>
            <div className="min-w-0">
              <h2 className="font-questrial font-bold text-lg text-gray-900 truncate">
                {isReadOnly ? 'Visualizar Rodada' : rodada ? 'Editar Rodada' : 'Nova Rodada'}
              </h2>
              <p className="text-xs text-gray-400">Formulário completo: cabeçalho, orçamento, convidados e mais</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {isReadOnly && (
            <div className="px-3 py-2.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              Seu perfil tem acesso apenas de visualização nesta área — as alterações não podem ser salvas.
            </div>
          )}
          {/* Cabeçalho da rodada */}
          <FormSection title="Cabeçalho da rodada">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Data da solicitação</FormLabel>
                <input type="date" className="form-input" value={form.dataSolicitacao} onChange={(ev) => set('dataSolicitacao', ev.target.value)} />
              </div>
              <div />
              <div ref={fieldRef('dataInicio')}>
                <FormLabel required>Data prevista — início</FormLabel>
                <input
                  type="date"
                  className={`form-input ${errors.dataInicio ? 'border-red-400' : ''}`}
                  value={form.dataInicio}
                  onChange={(ev) => { set('dataInicio', ev.target.value); clearError('dataInicio'); clearError('dataFim'); }}
                />
                {errors.dataInicio && <p className="text-xs text-red-500 mt-1">{errors.dataInicio}</p>}
              </div>
              <div ref={fieldRef('dataFim')}>
                <FormLabel required>Data prevista — fim</FormLabel>
                <input
                  type="date"
                  min={form.dataInicio || undefined}
                  className={`form-input ${errors.dataFim ? 'border-red-400' : ''}`}
                  value={form.dataFim}
                  onChange={(ev) => { set('dataFim', ev.target.value); clearError('dataFim'); }}
                />
                {errors.dataFim && <p className="text-xs text-red-500 mt-1">{errors.dataFim}</p>}
              </div>
              <div ref={fieldRef('cidade')}>
                <FormLabel required>Cidade</FormLabel>
                <input
                  className={`form-input ${errors.cidade ? 'border-red-400' : ''}`}
                  value={form.cidade}
                  onChange={(ev) => { set('cidade', ev.target.value); clearError('cidade'); }}
                />
                {errors.cidade && <p className="text-xs text-red-500 mt-1">{errors.cidade}</p>}
              </div>
              <div ref={fieldRef('uf')}>
                <FormLabel required>UF</FormLabel>
                <input
                  maxLength={2}
                  className={`form-input ${errors.uf ? 'border-red-400' : ''}`}
                  value={form.uf}
                  onChange={(ev) => { set('uf', ev.target.value.toUpperCase()); clearError('uf'); }}
                />
                {errors.uf && <p className="text-xs text-red-500 mt-1">{errors.uf}</p>}
              </div>
              <div>
                <FormLabel required>Tipo de ação</FormLabel>
                <select className="form-input" value={form.tipoAcao} onChange={(ev) => set('tipoAcao', ev.target.value as TipoAcaoRodada)}>
                  {TIPO_ACAO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.tipoAcao === 'outro' && (
                <div ref={fieldRef('tipoAcaoOutro')}>
                  <FormLabel required>Qual ação?</FormLabel>
                  <input
                    className={`form-input ${errors.tipoAcaoOutro ? 'border-red-400' : ''}`}
                    value={form.tipoAcaoOutro}
                    onChange={(ev) => { set('tipoAcaoOutro', ev.target.value); clearError('tipoAcaoOutro'); }}
                  />
                  {errors.tipoAcaoOutro && <p className="text-xs text-red-500 mt-1">{errors.tipoAcaoOutro}</p>}
                </div>
              )}
              <div ref={fieldRef('imobiliaria')} className="sm:col-span-2">
                <FormLabel required>Vincular a</FormLabel>
                <div className="flex items-center gap-2 mb-2">
                  {([
                    { v: 'imobiliaria' as const, label: 'Imobiliária' },
                    { v: 'corretor' as const, label: 'Corretor' },
                  ]).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => { set('vinculoTipo', opt.v); set('imobiliaria', ''); clearError('imobiliaria'); }}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                      style={
                        form.vinculoTipo === opt.v
                          ? { backgroundColor: '#fff7ed', borderColor: '#d55006', color: '#d55006' }
                          : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#fff' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <select
                  className={`form-input ${errors.imobiliaria ? 'border-red-400' : ''}`}
                  value={form.imobiliaria}
                  onChange={(ev) => { set('imobiliaria', ev.target.value); clearError('imobiliaria'); }}
                >
                  <option value="">
                    {form.vinculoTipo === 'imobiliaria' ? 'Selecionar imobiliária...' : 'Selecionar corretor...'}
                  </option>
                  {form.vinculoTipo === 'imobiliaria'
                    ? imobiliariasOptions.map((i) => <option key={i.id} value={i.nome}>{i.nome}</option>)
                    : corretoresOptions.map((c) => <option key={c.id} value={c.nomeCorretor}>{c.nomeCorretor}</option>)}
                </select>
                {errors.imobiliaria && <p className="text-xs text-red-500 mt-1">{errors.imobiliaria}</p>}
              </div>
              <div>
                <FormLabel>Responsável (imobiliária)</FormLabel>
                <input className="form-input" value={form.responsavelImobiliaria} onChange={(ev) => set('responsavelImobiliaria', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Gerente de Vendas Internas</FormLabel>
                <input className="form-input" value={form.gerenteVendasInternas} onChange={(ev) => set('gerenteVendasInternas', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Solicitante (Relacionamento)</FormLabel>
                <input className="form-input" value={form.solicitanteRelacionamento} onChange={(ev) => set('solicitanteRelacionamento', ev.target.value)} />
              </div>
            </div>
          </FormSection>

          {/* 1. Dados do parceiro */}
          <CollapsibleSection title="1. Dados do parceiro (Imobiliária)" defaultOpen={Boolean(rodada)}>
            <div>
              <FormLabel>Endereço</FormLabel>
              <input className="form-input" value={form.parceiroEndereco} onChange={(ev) => set('parceiroEndereco', ev.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Perfil da imobiliária</FormLabel>
                <select className="form-input" value={form.parceiroPerfil} onChange={(ev) => set('parceiroPerfil', ev.target.value as PerfilImobiliaria | '')}>
                  <option value="">Selecionar...</option>
                  {PERFIL_IMOBILIARIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Histórico com a Phacz</FormLabel>
                <select className="form-input" value={form.parceiroHistorico} onChange={(ev) => set('parceiroHistorico', ev.target.value as HistoricoParceria | '')}>
                  <option value="">Selecionar...</option>
                  {HISTORICO_PARCERIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FormLabel>Já participou de ação anterior?</FormLabel>
              <SimNaoPills value={form.parceiroParticipouAcaoAnterior} onChange={(v) => set('parceiroParticipouAcaoAnterior', v)} />
            </div>
            {form.parceiroParticipouAcaoAnterior && (
              <div>
                <FormLabel>Quando</FormLabel>
                <input className="form-input" placeholder="Data ou descrição" value={form.parceiroParticipouQuando} onChange={(ev) => set('parceiroParticipouQuando', ev.target.value)} />
              </div>
            )}
            <div>
              <FormLabel>Resumo do relacionamento (últimos 90 dias)</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 72 }} value={form.parceiroResumoRelacionamento} onChange={(ev) => set('parceiroResumoRelacionamento', ev.target.value)} />
            </div>
          </CollapsibleSection>

          {/* 2. Corretores envolvidos e time Phacz */}
          <CollapsibleSection title="2. Corretores envolvidos e time Phacz" defaultOpen={Boolean(rodada)}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">2.1 Corretores/convidados da imobiliária</p>
            <div className="space-y-2">
              {form.corretoresConvidados.map((row, index) => (
                <div key={row._key} className="p-3 rounded-lg border space-y-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="form-input" placeholder="Nome" value={row.nome} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { nome: ev.target.value })} />
                    <input className="form-input" placeholder="CRECI" value={row.creci} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { creci: ev.target.value })} />
                    <input className="form-input" placeholder="Cargo/Perfil" value={row.cargo} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { cargo: ev.target.value })} />
                    <select className="form-input" value={row.potencial} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { potencial: ev.target.value })}>
                      <option value="">Potencial...</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                    <input className="form-input" placeholder="Contato" value={row.contato} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { contato: ev.target.value })} />
                    <input className="form-input" placeholder="Observações" value={row.observacoes} onChange={(ev) => updateRow(setForm, 'corretoresConvidados', index, { observacoes: ev.target.value })} />
                  </div>
                  <RemoveRowButton onClick={() => removeRow(setForm, 'corretoresConvidados', index)} label="Remover corretor" />
                </div>
              ))}
            </div>
            <AddRowButton label="Adicionar corretor" onClick={() => setForm((f) => ({ ...f, corretoresConvidados: [...f.corretoresConvidados, { _key: uuid(), nome: '', creci: '', cargo: '', potencial: '', contato: '', observacoes: '' }] }))} />

            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-2">2.2 Equipe Phacz envolvida</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Apoios (Marketing / Operações / Diretoria)</FormLabel>
                <input className="form-input" value={form.equipeApoios} onChange={(ev) => set('equipeApoios', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Quem estará presente (nomes)</FormLabel>
                <input className="form-input" value={form.equipePresentes} onChange={(ev) => set('equipePresentes', ev.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* 3. Objetivo */}
          <CollapsibleSection title="3. Objetivo, intenção e justificativa" defaultOpen={Boolean(rodada)}>
            <div>
              <FormLabel>Intenção principal</FormLabel>
              <select className="form-input" value={form.intencaoPrincipal} onChange={(ev) => set('intencaoPrincipal', ev.target.value as IntencaoPrincipal | '')}>
                <option value="">Selecionar...</option>
                {INTENCAO_PRINCIPAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <FormLabel>Justificativa estratégica (por quê)</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 72 }} value={form.justificativaEstrategica} onChange={(ev) => set('justificativaEstrategica', ev.target.value)} />
            </div>
          </CollapsibleSection>

          {/* 4. Público-alvo, expectativa e metas */}
          <CollapsibleSection title="4. Público-alvo, expectativa e metas (KPIs)" defaultOpen>
            <div>
              <FormLabel>Público esperado</FormLabel>
              <MultiSelectPills options={PUBLICO_ESPERADO_OPTIONS} value={form.publicoEsperado} onChange={(v) => set('publicoEsperado', v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Quantidade estimada de participantes</FormLabel>
                <input type="number" min={0} className="form-input" value={form.quantidadeEstimadaParticipantes} onChange={(ev) => set('quantidadeEstimadaParticipantes', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Detalhamento (opcional)</FormLabel>
                <input className="form-input" placeholder='Ex: "10 clientes (5 casais)"' value={form.quantidadeEstimadaDetalhe} onChange={(ev) => set('quantidadeEstimadaDetalhe', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Ticket médio do público (R$)</FormLabel>
                <input className="form-input" placeholder="R$ 0,00" value={form.perfilPublicoTicketMedio} onChange={(ev) => set('perfilPublicoTicketMedio', maskCurrencyBRLInput(ev.target.value))} />
              </div>
              <div>
                <FormLabel>Carteira</FormLabel>
                <select className="form-input" value={form.perfilPublicoCarteira} onChange={(ev) => set('perfilPublicoCarteira', ev.target.value as CarteiraPublico | '')}>
                  <option value="">Selecionar...</option>
                  {CARTEIRA_PUBLICO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FormLabel>Empreendimento(s) em foco</FormLabel>
              {empreendimentosOptions.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum empreendimento cadastrado ainda.</p>
              ) : (
                <MultiSelectPills
                  options={empreendimentosOptions.map((e) => ({ value: e.id, label: e.nome }))}
                  value={form.empreendimentoIds}
                  onChange={(v) => set('empreendimentoIds', v)}
                />
              )}
            </div>
            <div>
              <FormLabel>Perfil dos clientes (profissão/segmento)</FormLabel>
              <input className="form-input" value={form.perfilClientesSegmento} onChange={(ev) => set('perfilClientesSegmento', ev.target.value)} />
            </div>
            <div>
              <FormLabel required>Meta mínima obrigatória</FormLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="number" min={0} className={`form-input ${errors.metaMinima ? 'border-red-400' : ''}`} placeholder="Nº participantes" value={form.metaMinParticipantes} onChange={(ev) => { set('metaMinParticipantes', ev.target.value); clearError('metaMinima'); }} />
                <input type="number" min={0} className={`form-input ${errors.metaMinima ? 'border-red-400' : ''}`} placeholder="Nº agendamentos" value={form.metaMinAgendamentos} onChange={(ev) => { set('metaMinAgendamentos', ev.target.value); clearError('metaMinima'); }} />
                <input type="number" min={0} className={`form-input ${errors.metaMinima ? 'border-red-400' : ''}`} placeholder="Nº vendas" value={form.metaMinVendas} onChange={(ev) => { set('metaMinVendas', ev.target.value); clearError('metaMinima'); }} />
              </div>
              {errors.metaMinima && <p className="text-xs text-red-500 mt-1">{errors.metaMinima}</p>}
            </div>
            <div>
              <FormLabel>VGV potencial estimado para a ação</FormLabel>
              <input className="form-input" placeholder="R$ 0,00" value={form.vgvPotencialEstimado} onChange={(ev) => set('vgvPotencialEstimado', maskCurrencyBRLInput(ev.target.value))} />
            </div>
          </CollapsibleSection>

          {/* 5. Detalhamento do evento/atividade */}
          <CollapsibleSection title="5. Detalhamento do evento/atividade" defaultOpen={Boolean(rodada)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Data</FormLabel>
                <input type="date" className="form-input" value={form.eventoData} onChange={(ev) => set('eventoData', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Horário</FormLabel>
                <input className="form-input" placeholder="Ex: 14h às 18h" value={form.eventoHorario} onChange={(ev) => set('eventoHorario', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Local (nome)</FormLabel>
                <input className="form-input" value={form.eventoLocalNome} onChange={(ev) => set('eventoLocalNome', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Local (endereço)</FormLabel>
                <input className="form-input" value={form.eventoLocalEndereco} onChange={(ev) => set('eventoLocalEndereco', ev.target.value)} />
              </div>
            </div>
            <div>
              <FormLabel>Agenda/roteiro</FormLabel>
              <div className="space-y-2">
                {form.eventoAgendaRoteiro.map((row, index) => (
                  <div key={row._key} className="flex items-center gap-2">
                    <input
                      className="form-input"
                      placeholder={`Bloco ${index + 1}`}
                      value={row.texto}
                      onChange={(ev) => updateRow(setForm, 'eventoAgendaRoteiro', index, { texto: ev.target.value })}
                    />
                    <button type="button" onClick={() => removeRow(setForm, 'eventoAgendaRoteiro', index)} className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <AddRowButton label="Adicionar bloco" onClick={() => setForm((f) => ({ ...f, eventoAgendaRoteiro: [...f.eventoAgendaRoteiro, { _key: uuid(), texto: '' }] }))} />
            </div>
            <div>
              <FormLabel>Abordagem comercial</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 72 }} value={form.eventoAbordagemComercial} onChange={(ev) => set('eventoAbordagemComercial', ev.target.value)} />
            </div>
          </CollapsibleSection>

          {/* 6. Materiais e estrutura */}
          <CollapsibleSection title="6. Materiais e estrutura" defaultOpen={Boolean(rodada)}>
            <div>
              <FormLabel>Materiais comerciais</FormLabel>
              <MultiSelectPills options={MATERIAL_COMERCIAL_OPTIONS} value={form.materiaisComerciais} onChange={(v) => set('materiaisComerciais', v)} />
            </div>
            <div>
              <FormLabel>Estrutura e operação</FormLabel>
              <MultiSelectPills options={ESTRUTURA_OPERACAO_OPTIONS} value={form.estruturaOperacao} onChange={(v) => set('estruturaOperacao', v)} />
            </div>
            {form.estruturaOperacao.includes('brindes') && (
              <div>
                <FormLabel>Quais brindes?</FormLabel>
                <input className="form-input" placeholder="Ex: Canetas, blocos, copos, bonés" value={form.brindesDescricao} onChange={(ev) => set('brindesDescricao', ev.target.value)} />
              </div>
            )}
          </CollapsibleSection>

          {/* 7. Orçamento previsto */}
          <CollapsibleSection title="7. Orçamento previsto" defaultOpen={Boolean(rodada)}>
            <div className="space-y-3">
              {form.orcamentoItens.map((row, index) => (
                <OrcamentoItemEditor key={row._key} row={row} onUpdate={(patch) => updateRow(setForm, 'orcamentoItens', index, patch)} onRemove={() => removeRow(setForm, 'orcamentoItens', index)} />
              ))}
            </div>
            <AddRowButton
              label="Adicionar item de orçamento"
              onClick={() => setForm((f) => ({
                ...f,
                orcamentoItens: [...f.orcamentoItens, {
                  _key: uuid(), categoria: 'deslocamento', descricao: '', valor: '', fornecedor: '', contato: '', cnpj: '',
                  pago: false, periodoInicio: '', periodoFim: '', nomeReserva: '', numeroQuartos: '', anexoUrl: '', uploading: false,
                }],
              }))}
            />
            <div>
              <FormLabel>Reserva/contingência para imprevistos (%)</FormLabel>
              <input type="number" min={0} max={100} className="form-input" value={form.orcamentoReservaContingenciaPercentual} onChange={(ev) => set('orcamentoReservaContingenciaPercentual', ev.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#fff7ed' }}>
              <span className="text-sm font-bold text-gray-700">Total do orçamento (somado automaticamente)</span>
              <span className="text-base font-bold" style={{ color: '#d55006' }}>{formatCurrencyBRL(orcamentoTotal)}</span>
            </div>
          </CollapsibleSection>

          {/* 8. Responsabilidades e prazos */}
          <CollapsibleSection title="8. Responsabilidades e prazos" defaultOpen={Boolean(rodada)}>
            <div className="space-y-2">
              {form.entregas.map((row, index) => (
                <div key={row._key} className="p-3 rounded-lg border grid grid-cols-1 sm:grid-cols-4 gap-2 items-start" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                  <input className="form-input sm:col-span-2" placeholder="Descrição da entrega" value={row.descricao} onChange={(ev) => updateRow(setForm, 'entregas', index, { descricao: ev.target.value })} />
                  <select className="form-input" value={row.responsavel} onChange={(ev) => updateRow(setForm, 'entregas', index, { responsavel: ev.target.value as ResponsavelEntrega })}>
                    {RESPONSAVEL_ENTREGA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select className="form-input" value={row.status} onChange={(ev) => updateRow(setForm, 'entregas', index, { status: ev.target.value as StatusEntrega })}>
                    {STATUS_ENTREGA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="date" className="form-input" value={row.prazo} onChange={(ev) => updateRow(setForm, 'entregas', index, { prazo: ev.target.value })} />
                  <div className="sm:col-span-3 flex justify-end">
                    <RemoveRowButton onClick={() => removeRow(setForm, 'entregas', index)} label="Remover entrega" />
                  </div>
                </div>
              ))}
            </div>
            <AddRowButton label="Adicionar entrega" onClick={() => setForm((f) => ({ ...f, entregas: [...f.entregas, { _key: uuid(), descricao: '', responsavel: 'phacz', prazo: '', status: 'pendente' }] }))} />
          </CollapsibleSection>

          {/* 9. Convites, confirmações e follow-up */}
          <CollapsibleSection title="9. Convites, confirmações e follow-up" defaultOpen={Boolean(rodada)}>
            <div>
              <FormLabel>Como serão feitos os convites</FormLabel>
              <MultiSelectPills options={COMO_CONVITE_OPTIONS} value={form.comoConvites} onChange={(v) => set('comoConvites', v)} />
              <input className="form-input mt-2" placeholder="Observações" value={form.comoConvitesObs} onChange={(ev) => set('comoConvitesObs', ev.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Data limite para confirmação (RSVP)</FormLabel>
                <input type="date" className="form-input" value={form.rsvpDataLimite} onChange={(ev) => set('rsvpDataLimite', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Responsável por confirmações</FormLabel>
                <input className="form-input" value={form.rsvpResponsavel} onChange={(ev) => set('rsvpResponsavel', ev.target.value)} />
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-2">Pós-evento (obrigatório)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Prazo p/ enviar material/agradecimento</FormLabel>
                <input type="date" className="form-input" value={form.posEventoPrazoMaterial} onChange={(ev) => set('posEventoPrazoMaterial', ev.target.value)} />
              </div>
              <div>
                <FormLabel>Prazo p/ registrar no CRM (participantes + notas)</FormLabel>
                <input type="date" className="form-input" value={form.posEventoPrazoRegistroCrm} onChange={(ev) => set('posEventoPrazoRegistroCrm', ev.target.value)} />
              </div>
            </div>
            <div>
              <FormLabel>Próximos passos</FormLabel>
              <MultiSelectPills options={PROXIMO_PASSO_OPTIONS} value={form.posEventoProximosPassos} onChange={(v) => set('posEventoProximosPassos', v)} />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-2">Lista de convidados</p>
            <div className="space-y-2">
              {form.convidados.map((row, index) => (
                <div key={row._key} className="p-3 rounded-lg border space-y-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="form-input" placeholder="Nome" value={row.nome} onChange={(ev) => updateRow(setForm, 'convidados', index, { nome: ev.target.value })} />
                    <input className="form-input" placeholder="Perfil" value={row.perfil} onChange={(ev) => updateRow(setForm, 'convidados', index, { perfil: ev.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={row.jaConheceLitoral} onChange={(ev) => updateRow(setForm, 'convidados', index, { jaConheceLitoral: ev.target.checked })} />
                      Já conhece o litoral
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={row.possuiOutrosImoveis} onChange={(ev) => updateRow(setForm, 'convidados', index, { possuiOutrosImoveis: ev.target.checked })} />
                      Possui outros imóveis
                    </label>
                    <select className="form-input" value={row.investimentoOuMoradia} onChange={(ev) => updateRow(setForm, 'convidados', index, { investimentoOuMoradia: ev.target.value as InvestimentoOuMoradia | '' })}>
                      <option value="">Investimento ou moradia?</option>
                      {INVESTIMENTO_OU_MORADIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <RemoveRowButton onClick={() => removeRow(setForm, 'convidados', index)} label="Remover convidado" />
                </div>
              ))}
            </div>
            <AddRowButton label="Adicionar convidado" onClick={() => setForm((f) => ({ ...f, convidados: [...f.convidados, { _key: uuid(), nome: '', perfil: '', jaConheceLitoral: false, possuiOutrosImoveis: false, investimentoOuMoradia: '' }] }))} />

            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-2">Agenda de visitas</p>
            <FormLabel>Já há visitas agendadas?</FormLabel>
            <SimNaoPills value={form.possuiVisitasAgendadas} onChange={(v) => set('possuiVisitasAgendadas', v ?? false)} />
            {form.possuiVisitasAgendadas && (
              <div className="space-y-2 pt-1">
                {form.visitasAgendadas.map((row, index) => (
                  <div key={row._key} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input className="form-input" placeholder="Cliente/Imobiliária" value={row.clienteOuImobiliaria} onChange={(ev) => updateRow(setForm, 'visitasAgendadas', index, { clienteOuImobiliaria: ev.target.value })} />
                    <input className="form-input" placeholder="Horário" value={row.horario} onChange={(ev) => updateRow(setForm, 'visitasAgendadas', index, { horario: ev.target.value })} />
                    <input className="form-input" placeholder="Local" value={row.local} onChange={(ev) => updateRow(setForm, 'visitasAgendadas', index, { local: ev.target.value })} />
                    <button type="button" onClick={() => removeRow(setForm, 'visitasAgendadas', index)} className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 self-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <AddRowButton label="Adicionar visita" onClick={() => setForm((f) => ({ ...f, visitasAgendadas: [...f.visitasAgendadas, { _key: uuid(), clienteOuImobiliaria: '', horario: '', local: '' }] }))} />
              </div>
            )}
          </CollapsibleSection>

          {/* 10. Riscos, dependências e plano B */}
          <CollapsibleSection title="10. Riscos, dependências e plano B" defaultOpen={Boolean(rodada)}>
            <div>
              <FormLabel>Riscos principais</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 64 }} value={form.riscosPrincipais} onChange={(ev) => set('riscosPrincipais', ev.target.value)} />
            </div>
            <div>
              <FormLabel>Mitigação (como reduzir riscos)</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 64 }} value={form.mitigacaoRiscos} onChange={(ev) => set('mitigacaoRiscos', ev.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Plano B</FormLabel>
                <select className="form-input" value={form.planoB} onChange={(ev) => set('planoB', ev.target.value as PlanoB | '')}>
                  <option value="">Selecionar...</option>
                  {PLANO_B_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Detalhes</FormLabel>
                <input className="form-input" value={form.planoBDetalhes} onChange={(ev) => set('planoBDetalhes', ev.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* 11. Parecer de viabilidade */}
          <CollapsibleSection title="11. Parecer de viabilidade (decisão da gestora)" defaultOpen={Boolean(rodada)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Potencial de retorno</FormLabel>
                <select className="form-input" value={form.potencialRetorno} onChange={(ev) => set('potencialRetorno', ev.target.value as PotencialRetorno | '')}>
                  <option value="">Selecionar...</option>
                  {POTENCIAL_RETORNO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Prioridade no trimestre</FormLabel>
                <select className="form-input" value={form.prioridadeTrimestre} onChange={(ev) => set('prioridadeTrimestre', ev.target.value as PrioridadeTrimestre | '')}>
                  <option value="">Selecionar...</option>
                  {PRIORIDADE_TRIMESTRE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <FormLabel>Comentário final do solicitante</FormLabel>
              <textarea className="form-input resize-none" style={{ minHeight: 64 }} value={form.comentarioFinalSolicitante} onChange={(ev) => set('comentarioFinalSolicitante', ev.target.value)} />
            </div>
            <div>
              <FormLabel>Recomendação</FormLabel>
              <select className="form-input" value={form.recomendacao} onChange={(ev) => set('recomendacao', ev.target.value as Recomendacao | '')}>
                <option value="">Selecionar...</option>
                {RECOMENDACAO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </CollapsibleSection>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#d55006' }}
            >
              {submitting ? 'Salvando...' : rodada ? 'Salvar alterações' : 'Cadastrar Rodada'}
              {!submitting && <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers genéricos para as listas repetíveis ──────────────────────

type ArrayFields = 'corretoresConvidados' | 'orcamentoItens' | 'entregas' | 'convidados' | 'visitasAgendadas' | 'eventoAgendaRoteiro';

function updateRow<K extends ArrayFields>(
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  key: K,
  index: number,
  patch: Partial<FormState[K][number]>
) {
  setForm((f) => ({
    ...f,
    [key]: (f[key] as FormState[K]).map((item, i) => (i === index ? { ...item, ...patch } : item)),
  }));
}

function removeRow<K extends ArrayFields>(setForm: React.Dispatch<React.SetStateAction<FormState>>, key: K, index: number) {
  setForm((f) => ({ ...f, [key]: (f[key] as FormState[K]).filter((_, i) => i !== index) }));
}

// ── Subcomponentes de UI ──────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{title}</h3>
      <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
        {children}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 pt-3 space-y-3 border-t" style={{ borderColor: '#f3f4f6', backgroundColor: '#fafafa' }}>{children}</div>}
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-gray-600 mb-1 block">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function MultiSelectPills<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  function toggle(v: T) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            style={active ? { backgroundColor: '#fff7ed', borderColor: '#d55006', color: '#d55006' } : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#fff' }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SimNaoPills({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      {[{ v: true, label: 'Sim' }, { v: false, label: 'Não' }].map((opt) => (
        <button
          key={String(opt.v)}
          type="button"
          onClick={() => onChange(value === opt.v ? null : opt.v)}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={value === opt.v ? { backgroundColor: '#fff7ed', borderColor: '#d55006', color: '#d55006' } : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#fff' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-dashed hover:border-orange-300 hover:text-orange-600 transition-colors"
      style={{ borderColor: '#d1d5db', color: '#6b7280' }}
    >
      <Plus size={13} /> {label}
    </button>
  );
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">
      <Trash2 size={12} /> {label}
    </button>
  );
}

function OrcamentoItemEditor({ row, onUpdate, onRemove }: {
  row: OrcamentoItemRow;
  onUpdate: (patch: Partial<OrcamentoItemRow>) => void;
  onRemove: () => void;
}) {
  async function handleUploadAnexo(file: File) {
    onUpdate({ uploading: true });
    try {
      const { url } = await rodadasApi.uploadAsset(file);
      onUpdate({ anexoUrl: url, uploading: false });
    } catch {
      onUpdate({ uploading: false });
    }
  }

  return (
    <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select className="form-input" value={row.categoria} onChange={(ev) => onUpdate({ categoria: ev.target.value as CategoriaOrcamento })}>
          {CATEGORIA_ORCAMENTO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input className="form-input sm:col-span-2" placeholder="Descrição (ex: Passagens, Hotel, Buffet...)" value={row.descricao} onChange={(ev) => onUpdate({ descricao: ev.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input className="form-input" placeholder="R$ 0,00" value={row.valor} onChange={(ev) => onUpdate({ valor: maskCurrencyBRLInput(ev.target.value) })} />
        <input className="form-input" placeholder="Fornecedor" value={row.fornecedor} onChange={(ev) => onUpdate({ fornecedor: ev.target.value })} />
        <input className="form-input" placeholder="Contato" value={row.contato} onChange={(ev) => onUpdate({ contato: ev.target.value })} />
        <input className="form-input" placeholder="CNPJ" value={row.cnpj} onChange={(ev) => onUpdate({ cnpj: ev.target.value })} />
      </div>

      {row.categoria === 'hospedagem' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input type="date" className="form-input" title="Período início" value={row.periodoInicio} onChange={(ev) => onUpdate({ periodoInicio: ev.target.value })} />
          <input type="date" className="form-input" title="Período fim" value={row.periodoFim} onChange={(ev) => onUpdate({ periodoFim: ev.target.value })} />
          <input className="form-input" placeholder="Nome da reserva" value={row.nomeReserva} onChange={(ev) => onUpdate({ nomeReserva: ev.target.value })} />
          <input type="number" min={0} className="form-input" placeholder="Nº de quartos" value={row.numeroQuartos} onChange={(ev) => onUpdate({ numeroQuartos: ev.target.value })} />
        </div>
      )}

      {row.categoria === 'evento_estrutura' && (
        <div>
          <FormLabel>Anexo do cardápio selecionado</FormLabel>
          {row.anexoUrl && (
            <a href={row.anexoUrl} target="_blank" rel="noreferrer" className="text-xs underline block mb-1" style={{ color: '#d55006' }}>Ver anexo enviado</a>
          )}
          <label
            htmlFor={`orcamento-anexo-${row._key}`}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed text-xs font-semibold cursor-pointer transition-colors hover:border-orange-300 hover:text-orange-600"
            style={{ borderColor: '#d1d5db', color: '#6b7280' }}
          >
            {row.uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {row.uploading ? 'Enviando...' : 'Anexar arquivo (PDF/imagem)'}
          </label>
          <input
            id={`orcamento-anexo-${row._key}`}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={row.uploading}
            onChange={(ev) => { const file = ev.target.files?.[0]; if (file) handleUploadAnexo(file); ev.target.value = ''; }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={row.pago} onChange={(ev) => onUpdate({ pago: ev.target.checked })} />
          Pago
        </label>
        <RemoveRowButton onClick={onRemove} label="Remover item" />
      </div>
    </div>
  );
}

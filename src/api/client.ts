const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const TOKEN_KEY = 'phacz_crm_token';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Rótulo legível de cada campo que o backend valida — o Zod devolve o nome técnico. */
const CAMPO_LABEL: Record<string, string> = {
  nome: 'Nome completo',
  nomeCorretor: 'Nome do corretor',
  telefone: 'Telefone',
  telefoneCorretor: 'Telefone',
  email: 'E-mail',
  emailCorretor: 'E-mail',
  cidade: 'Cidade',
  uf: 'Estado',
  interesse: 'Interesse / Tipo de imóvel',
  orcamento: 'Orçamento',
  observacoes: 'Observações',
  canalOrigem: 'Canal de origem',
  imobiliaria: 'Imobiliária',
  cpf: 'CPF',
  creci: 'CRECI',
  valor: 'Valor',
  unidade: 'Unidade',
  empreendimento: 'Empreendimento',
  condicoes: 'Condições de pagamento',
  motivo: 'Motivo',
  resumo: 'Resumo',
  etapa: 'Etapa',
  data: 'Data',
};

/**
 * Traduz o `details` que o backend manda num erro 400 (o `flatten()` do Zod) para uma frase
 * que diga QUAL campo travou o salvamento.
 *
 * Sem isto, toda falha de validação chegava na tela como "Dados inválidos", sem dizer o quê —
 * o backend já mandava os campos, e o cliente jogava fora.
 */
export function detalharErroDeValidacao(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.details) return null;

  const d = err.details as {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };

  const campos = Object.entries(d.fieldErrors ?? {})
    .filter(([, mensagens]) => (mensagens?.length ?? 0) > 0)
    .map(([campo]) => CAMPO_LABEL[campo] ?? campo);

  if (campos.length > 0) {
    return campos.length === 1
      ? `Confira o campo ${campos[0]}.`
      : `Confira estes campos: ${campos.join(', ')}.`;
  }

  return d.formErrors?.length ? d.formErrors.join(' ') : null;
}

/** Mensagem pronta para a tela: a do servidor, acrescida dos campos que falharam. */
export function mensagemDeErro(err: unknown, padrao: string): string {
  if (!(err instanceof ApiError)) return padrao;
  const detalhe = detalharErroDeValidacao(err);
  return detalhe ? `${err.message} — ${detalhe}` : err.message;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Sessão expirada (401 com a tela aberta) ───────────────────────────────────
//
// O token vale 24h e não há refresh. Quem deixa a aba aberta de um dia para o outro
// continua vendo a tela logada — nome, menus, dados — mas toda chamada passa a voltar 401.
// Era assim que um formulário preenchido simplesmente não salvava: aparecia um toast de
// "token inválido" e nada mais acontecia, sem deslogar e sem explicar.
//
// Agora um 401 pede a senha e REFAZ a requisição, para o que estava sendo salvo não se perder.

/** Devolve `true` se um token novo foi gravado, `false` se a pessoa preferiu sair. */
type HandlerDeSessaoExpirada = () => Promise<boolean>;

let handlerDeSessaoExpirada: HandlerDeSessaoExpirada | null = null;
let reautenticacaoEmAndamento: Promise<boolean> | null = null;

/** O modal de reautenticação se registra aqui ao montar; devolve a função que o desregistra. */
export function registrarHandlerDeSessaoExpirada(handler: HandlerDeSessaoExpirada): () => void {
  handlerDeSessaoExpirada = handler;
  return () => {
    if (handlerDeSessaoExpirada === handler) handlerDeSessaoExpirada = null;
  };
}

/**
 * As rotas de `/api/auth/` ficam de fora: ali 401 significa "senha errada" (login) ou "abriu o
 * app com token velho" (me), e nos dois casos a tela de login é o lugar certo. Sem esta exceção,
 * a senha digitada errada no próprio modal abriria outro modal, em recursão.
 */
function ehRotaDeAutenticacao(path: string): boolean {
  return path.startsWith('/api/auth/');
}

/**
 * Uma expiração derruba TODAS as requisições em voo de uma vez — e a tela costuma disparar
 * várias em paralelo. Sem esta trava apareceria um modal por requisição; com ela, todas esperam
 * a mesma resposta e a senha é pedida uma única vez.
 */
function pedirReautenticacao(): Promise<boolean> {
  if (!handlerDeSessaoExpirada) return Promise.resolve(false);
  if (!reautenticacaoEmAndamento) {
    reautenticacaoEmAndamento = handlerDeSessaoExpirada().finally(() => {
      reautenticacaoEmAndamento = null;
    });
  }
  return reautenticacaoEmAndamento;
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Dispara a requisição. Separado de `interpretar` para poder ser repetido após reautenticar. */
function enviar(path: string, options: ApiFetchOptions): Promise<Response> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    // Respostas de API autenticada nunca deveriam vir do cache HTTP do navegador: um GET
    // repetido (ex: /auth/me logo após o login) podia voltar 304 (sem corpo) por causa do ETag
    // que o Express gera automaticamente — e como 304 está fora do range 200-299, virava um
    // ApiError falso-positivo aqui embaixo, derrubando a sessão que acabara de ser criada.
    cache: 'no-store',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData
      ? (options.body as FormData)
      : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function interpretar<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'error' in data ? String(data.error) : null) ?? 'Erro na comunicação com o servidor';
    throw new ApiError(response.status, message, data && typeof data === 'object' ? (data as { details?: unknown }).details : undefined);
  }

  return data as T;
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const response = await enviar(path, options);

  // Sessão expirou no meio do uso: pede a senha e refaz a chamada com o token novo, para o que
  // estava sendo salvo chegar ao servidor. Uma repetição só — se o 401 voltar, o erro sobe
  // normalmente em vez de insistir em laço.
  if (response.status === 401 && !ehRotaDeAutenticacao(path) && (await pedirReautenticacao())) {
    return interpretar<T>(await enviar(path, options));
  }

  return interpretar<T>(response);
}

/** Baixa um arquivo autenticado (export CSV/XLSX/PDF) e dispara o download no navegador. */
export async function downloadFile(path: string, filename: string, query?: ApiFetchOptions['query']): Promise<void> {
  const baixar = () => {
    const token = getToken();
    return fetch(buildUrl(path, query), {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  };

  let response = await baixar();
  // Mesmo tratamento do apiFetch: um export pedido com a sessão vencida refaz o download depois
  // da senha, em vez de só falhar.
  if (response.status === 401 && (await pedirReautenticacao())) response = await baixar();

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, (data?.error as string) ?? 'Falha ao gerar o arquivo');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { BASE_URL };

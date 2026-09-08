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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(buildUrl(path, options.query), {
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

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'error' in data ? String(data.error) : null) ?? 'Erro na comunicação com o servidor';
    throw new ApiError(response.status, message, data && typeof data === 'object' ? (data as { details?: unknown }).details : undefined);
  }

  return data as T;
}

/** Baixa um arquivo autenticado (export CSV/XLSX/PDF) e dispara o download no navegador. */
export async function downloadFile(path: string, filename: string, query?: ApiFetchOptions['query']): Promise<void> {
  const token = getToken();
  const response = await fetch(buildUrl(path, query), {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

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

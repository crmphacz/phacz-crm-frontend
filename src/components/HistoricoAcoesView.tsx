import { useEffect, useState } from 'react';
import { Search, History, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { logAcaoApi } from '../api/endpoints';
import type { LogAcao } from '../types';

const PAGE_SIZE = 30;

export function HistoricoAcoesView() {
  const [logs, setLogs] = useState<LogAcao[]>([]);
  const [total, setTotal] = useState(0);
  const [entidadesDisponiveis, setEntidadesDisponiveis] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entidadeFiltro, setEntidadeFiltro] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce da busca livre — evita disparar uma requisição a cada tecla digitada.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    logAcaoApi
      .list({
        q: search || undefined,
        entidade: entidadeFiltro || undefined,
        de: de ? new Date(de).toISOString() : undefined,
        ate: ate ? new Date(`${ate}T23:59:59`).toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setLogs(res.logs);
        setTotal(res.total);
        setEntidadesDisponiveis(res.entidadesDisponiveis);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico de ações.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, entidadeFiltro, de, ate, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800 flex items-center gap-2">
              <History size={20} style={{ color: '#d55006' }} />
              Histórico de Ações
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Lock size={12} />
              Registro somente leitura — nenhuma ação pode ser apagada, nem por quem a criou.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação, descrição ou registro afetado..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border rounded-lg w-full"
              style={{ borderColor: '#e5e7eb' }}
            />
          </div>

          <select
            className="px-3 py-2 text-sm border rounded-lg"
            style={{ borderColor: '#e5e7eb' }}
            value={entidadeFiltro}
            onChange={(e) => {
              setEntidadeFiltro(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os registros</option>
            {entidadesDisponiveis.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={de}
            onChange={(e) => {
              setDe(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border rounded-lg"
            style={{ borderColor: '#e5e7eb' }}
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={ate}
            onChange={(e) => {
              setAte(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border rounded-lg"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {error && (
          <div className="m-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <table className="w-full text-sm min-w-[880px]">
          <thead className="sticky top-0 bg-white border-b" style={{ borderColor: '#e5e7eb' }}>
            <tr>
              <Th>Data/Hora</Th>
              <Th>Usuário</Th>
              <Th>Cargo</Th>
              <Th>Ação</Th>
              <Th>Registro afetado</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b" style={{ borderColor: '#f9fafb' }}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.criadoEm).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 font-questrial whitespace-nowrap">
                  {log.userNome}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#6b7280' }}>
                    {log.userCargo}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{log.descricao}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{log.entidade ?? '—'}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                  Nenhuma ação encontrada
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-400 text-sm">
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white border-t px-4 md:px-6 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
        <p className="text-xs text-gray-400">{total} registros</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
            style={{ borderColor: '#e5e7eb' }}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
            style={{ borderColor: '#e5e7eb' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

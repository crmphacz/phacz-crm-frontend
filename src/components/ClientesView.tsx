import { useEffect, useState } from 'react';
import { Plus, Search, Building2, Phone, Mail, Link, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { STAGES } from '../data';
import { formatCurrency, formatRelativeTime } from '../utils';
import { canWhatsappCliente } from '../permissions';
import { corretoresApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { ClienteFinalComContexto } from '../types';
import { NewClienteModal } from './NewClienteModal';
import { WhatsappSendModal } from './WhatsappSendModal';
import { WhatsappIcon } from './WhatsappIcon';

type ClienteComComprou = ClienteFinalComContexto & { comprou: boolean };
type SortField = 'nome' | 'dataAdicionado' | 'orcamento';

const PAGE_SIZE = 300;

/**
 * Paginação real (300/página), no mesmo espírito da tela de Corretores: antes, esta tela
 * montava a lista inteira no client fazendo flatMap sobre `corretores.clientesFinais` do
 * carregamento em massa (teto de 2000 corretores) — sem paginação de verdade e sem contagem
 * real. Agora busca a própria página em GET /api/corretores/clientes, com `total` do banco.
 */
export function ClientesView() {
  const currentUser = useStore((s) => s.currentUser);
  // Só quem chega nesta tela é Diretoria/Marketing/Administrativo/Recepção (ver Sidebar); só a
  // Diretoria de fato escreve em clientes/corretores — os outros três são leitura.
  const isReadOnly = currentUser?.cargo !== 'Diretora';
  const setView = useStore((s) => s.setView);
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);

  const [rows, setRows] = useState<ClienteComComprou[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('dataAdicionado');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteComComprou | null>(null);
  const [whatsappCliente, setWhatsappCliente] = useState<ClienteComComprou | null>(null);

  const [primeiraCargaFeita, setPrimeiraCargaFeita] = useState(false);
  useViewReady(primeiraCargaFeita);

  // Debounce da busca livre — evita disparar uma requisição a cada tecla digitada.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
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
    corretoresApi
      .listClientesPaged({ page, pageSize: PAGE_SIZE, search: search || undefined, sort: sortField, dir: sortDir })
      .then((res) => {
        if (cancelled) return;
        setRows(res.clientes);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os clientes.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setPrimeiraCargaFeita(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search, sortField, sortDir, page, reloadTick]);

  function toggleSort(field: SortField) {
    setPage(1);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir(field === 'nome' ? 'asc' : 'desc'); }
  }

  function reload() {
    setReloadTick((t) => t + 1);
  }

  // Diretoria (única que escreve aqui) clica pra editar o cliente (dados + corretor
  // responsável); os demais perfis com acesso a esta tela (Marketing/Administrativo/Recepção,
  // só leitura) clicam pra ver o corretor no Pipeline, como já era.
  function handleRowClick(cliente: ClienteComComprou) {
    if (isReadOnly) {
      setView('pipeline');
      setSelectedCorretor(cliente.corretorId);
    } else {
      setEditingCliente(cliente);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#d55006' }} /> : <ChevronDown size={12} style={{ color: '#d55006' }} />;
  };

  if (!primeiraCargaFeita) return <ViewLoader label="Carregando clientes…" />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Clientes Finais</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} registro{total !== 1 ? 's' : ''}
              {totalPages > 1 && <span className="text-gray-400"> — página {page} de {totalPages}</span>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente, corretor ou imobiliária..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border rounded-lg w-full sm:w-64"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>

            {!isReadOnly && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor: '#d55006' }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border-b px-4 md:px-6 py-2" style={{ borderColor: '#fecaca' }}>{error}</p>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 bg-white/60">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#fed7aa', borderTopColor: '#d55006' }} />
          </div>
        )}
        <table className="w-full text-sm min-w-[880px]">
          <thead className="sticky top-0 bg-white border-b" style={{ borderColor: '#e5e7eb' }}>
            <tr>
              <Th onClick={() => toggleSort('nome')}>
                <span className="flex items-center gap-1">Cliente <SortIcon field="nome" /></span>
              </Th>
              <Th>Contato</Th>
              <Th>Corretor</Th>
              <Th>Etapa</Th>
              <Th>Interesse</Th>
              <Th onClick={() => toggleSort('orcamento')}>
                <span className="flex items-center gap-1">Orçamento <SortIcon field="orcamento" /></span>
              </Th>
              <Th onClick={() => toggleSort('dataAdicionado')}>
                <span className="flex items-center gap-1">Cadastrado <SortIcon field="dataAdicionado" /></span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const stage = STAGES.find((s) => s.id === c.etapaCorretor);
              return (
                <tr
                  key={c.id}
                  onClick={() => handleRowClick(c)}
                  className="border-b cursor-pointer bg-white hover:bg-gray-100 transition-colors"
                  style={{ borderColor: '#f9fafb' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: stage?.cor ?? '#64748b' }}>
                        {c.nome[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate font-questrial">{c.nome}</p>
                        {c.negocioGerado && (
                          <p className="text-xs flex items-center gap-1" style={{ color: '#059669' }}>
                            <Link size={10} /> Negócio gerado
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone size={11} className="flex-shrink-0" />
                        {c.telefone}
                      </div>
                      {canWhatsappCliente(currentUser, c.comprou) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setWhatsappCliente(c); }}
                          title="Enviar WhatsApp"
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ color: '#059669', backgroundColor: '#ecfdf5' }}
                        >
                          <WhatsappIcon size={13} />
                        </button>
                      )}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Mail size={11} className="flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 truncate">{c.nomeCorretor}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                      <Building2 size={10} />
                      {c.imobiliaria || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {stage && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: stage.cor }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.cor }} />
                        {stage.id}. {stage.nomeAbrev}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[160px]">
                    {c.interesse || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.orcamento ? (
                      <span className="font-semibold" style={{ color: '#d55006' }}>{formatCurrency(c.orcamento)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatRelativeTime(c.dataAdicionado)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t bg-white flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <p className="text-xs text-gray-400">
            Mostrando {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + rows.length} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              style={{ borderColor: '#e5e7eb' }}
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold text-gray-600 px-1">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 rounded-lg border flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              style={{ borderColor: '#e5e7eb' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {showNewModal && <NewClienteModal onClose={() => { setShowNewModal(false); reload(); }} />}
      {editingCliente && <NewClienteModal cliente={editingCliente} onClose={() => { setEditingCliente(null); reload(); }} />}
      {whatsappCliente && (
        <WhatsappSendModal
          alvo={{ clienteFinalId: whatsappCliente.id }}
          nomeDestinatario={whatsappCliente.nome}
          telefone={whatsappCliente.telefone}
          onClose={() => setWhatsappCliente(null)}
        />
      )}
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider ${onClick ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

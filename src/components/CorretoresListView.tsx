import { useEffect, useRef, useState } from 'react';
import { Plus, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Building2, Users } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { STAGES } from '../data';
import { TEMPERATURA_CONFIG, formatRelativeTime, formatCurrency } from '../utils';
import { canCreateCorretor } from '../permissions';
import { corretoresApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Corretor } from '../types';

type SortField = 'nomeCorretor' | 'etapa' | 'temperatura' | 'dataUltimaInteracao';

const PAGE_SIZE = 300;

/**
 * Paginação real (300/página), diferente das outras telas que carregam `store.corretores`
 * inteiro. Com a base crescendo bem além do teto de 2000 do carregamento em massa (ver
 * corretoresApi.list), essa tela teria um recorte truncado e silencioso do banco — o "336
 * registros" travado que não batia com o card "corretores ativos" da sidebar (esse soma
 * ativo+nutrição sobre o recorte de 2000; aqui contamos só "ativo", com `total` vindo direto
 * do banco pro filtro aplicado). Por isso busca a própria página no backend em vez de reusar o
 * estado global.
 */
export function CorretoresListView() {
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const selectedCorretorId = useStore((s) => s.selectedCorretorId);
  const setShowNewCorretorModal = useStore((s) => s.setShowNewCorretorModal);
  const showNewCorretorModal = useStore((s) => s.showNewCorretorModal);
  const currentUser = useStore((s) => s.currentUser);
  const isReadOnly = !canCreateCorretor(currentUser);

  const [rows, setRows] = useState<Corretor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ativo');
  const [sortField, setSortField] = useState<SortField>('dataUltimaInteracao');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

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
      .listPaged({ page, pageSize: PAGE_SIZE, status: statusFilter, search: search || undefined, sort: sortField, dir: sortDir })
      .then((res) => {
        if (cancelled) return;
        setRows(res.corretores);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os corretores.');
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
  }, [statusFilter, search, sortField, sortDir, page, reloadTick]);

  // Editar/criar/excluir acontece via o painel de detalhe e o modal de novo corretor, que
  // escrevem em `store.corretores` — não nesta página carregada à parte. Ao fechar qualquer um
  // dos dois, busca a página de novo pra refletir a mudança em vez de ficar com dado velho.
  const prevSelectedRef = useRef(selectedCorretorId);
  const prevModalRef = useRef(showNewCorretorModal);
  useEffect(() => {
    const fechouDetalhe = prevSelectedRef.current !== null && selectedCorretorId === null;
    const fechouModalNovo = prevModalRef.current && !showNewCorretorModal;
    prevSelectedRef.current = selectedCorretorId;
    prevModalRef.current = showNewCorretorModal;
    if (fechouDetalhe || fechouModalNovo) setReloadTick((t) => t + 1);
  }, [selectedCorretorId, showNewCorretorModal]);

  function toggleSort(field: SortField) {
    setPage(1);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  function changeStatusFilter(v: string) {
    setStatusFilter(v);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#d55006' }} /> : <ChevronDown size={12} style={{ color: '#d55006' }} />;
  };

  if (!primeiraCargaFeita) return <ViewLoader label="Carregando corretores…" />;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Corretores</h1>
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
                placeholder="Buscar..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border rounded-lg w-full sm:w-56"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                className="px-3 py-2 text-sm border rounded-lg flex-1 sm:flex-none"
                style={{ borderColor: '#e5e7eb' }}
                value={statusFilter}
                onChange={(e) => changeStatusFilter(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="ativo">Ativos</option>
                <option value="nutricao">Nutrição</option>
                <option value="ganho">Ganhos</option>
                <option value="perdido">Perdidos</option>
                <option value="arquivado">Arquivados</option>
              </select>

              {!isReadOnly && (
                <button
                  onClick={() => setShowNewCorretorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: '#d55006' }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Novo Corretor</span>
                </button>
              )}
            </div>
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
              <Th onClick={() => toggleSort('nomeCorretor')}>
                <span className="flex items-center gap-1">Corretor <SortIcon field="nomeCorretor" /></span>
              </Th>
              <Th>Canal</Th>
              <Th onClick={() => toggleSort('etapa')}>
                <span className="flex items-center gap-1">Etapa <SortIcon field="etapa" /></span>
              </Th>
              <Th onClick={() => toggleSort('temperatura')}>
                <span className="flex items-center gap-1">Temp. <SortIcon field="temperatura" /></span>
              </Th>
              <Th>Equipe</Th>
              <Th>Clientes</Th>
              <Th onClick={() => toggleSort('dataUltimaInteracao')}>
                <span className="flex items-center gap-1">Última atividade <SortIcon field="dataUltimaInteracao" /></span>
              </Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((corretor) => (
              <CorretorRow key={corretor.id} corretor={corretor} onClick={() => setSelectedCorretor(corretor.id)} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                  Nenhum corretor encontrado
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
    </div>
  );
}

function CorretorRow({ corretor, onClick }: { corretor: Corretor; onClick: () => void }) {
  const stage = STAGES.find((s) => s.id === corretor.etapa)!;
  const tempConfig = TEMPERATURA_CONFIG[corretor.temperatura];
  const isNegocio = Boolean(corretor.parentCorretorId);

  const statusMap = {
    ativo: { bg: '#dcfce7', text: '#166534', label: 'Ativo' },
    nutricao: { bg: '#fef9c3', text: '#854d0e', label: 'Nutrição' },
    ganho: { bg: '#dcfce7', text: '#166534', label: 'Ganho' },
    perdido: { bg: '#fee2e2', text: '#b91c1c', label: 'Perdido' },
    arquivado: { bg: '#f1f5f9', text: '#64748b', label: 'Arquivado' },
  };
  const st = statusMap[corretor.status];

  return (
    <tr
      onClick={onClick}
      className="border-b cursor-pointer bg-white hover:bg-gray-100 transition-colors"
      style={{ borderColor: '#f9fafb' }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: stage.cor }}>
            {(isNegocio && corretor.clienteFinalNome ? corretor.clienteFinalNome : corretor.nomeCorretor)[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate font-questrial">
              {isNegocio && corretor.clienteFinalNome ? corretor.clienteFinalNome : corretor.nomeCorretor}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <Building2 size={10} />
              {isNegocio ? `via ${corretor.nomeCorretor}` : (corretor.imobiliaria || '—')}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f1f5f9', color: '#6b7280' }}>
          {corretor.canalOrigem}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: stage.cor }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.cor }} />
          {corretor.etapa}. {stage.nomeAbrev}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: tempConfig.bg, color: tempConfig.text }}>
          {tempConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {corretor.responsavelSDR && <AvatarDot name={corretor.responsavelSDR} color="#64748b" role="SDR" />}
          {corretor.responsavelGR && <AvatarDot name={corretor.responsavelGR} color="#0d9488" role="GR" />}
          {corretor.responsavelGV && <AvatarDot name={corretor.responsavelGV} color="#d55006" role="GV" />}
        </div>
      </td>
      <td className="px-4 py-3">
        {corretor.clientesFinais.length > 0 ? (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} />
            {corretor.clientesFinais.length}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
        {corretor.valorFechamento && (
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#059669' }}>
            {formatCurrency(corretor.valorFechamento)}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {corretor.ultimaAtividadeEm ? formatRelativeTime(corretor.ultimaAtividadeEm) : <span className="text-gray-300">Sem atividade</span>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: st.bg, color: st.text }}>
          {st.label}
        </span>
      </td>
    </tr>
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

function AvatarDot({ name, color, role }: { name: string; color: string; role: string }) {
  return (
    <span
      title={`${role}: ${name}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white font-semibold"
      style={{ backgroundColor: color, fontSize: '10px' }}
    >
      {role}: {name.split(' ')[0]}
    </span>
  );
}

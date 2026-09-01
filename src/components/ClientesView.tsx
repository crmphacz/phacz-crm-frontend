import { useMemo, useState } from 'react';
import { Plus, Search, Building2, Phone, Mail, Link, MessageSquare } from 'lucide-react';
import { useStore, useAllClientesFinais, clienteComprou } from '../store';
import type { ClienteFinalComContexto } from '../store';
import { STAGES } from '../data';
import { formatCurrency, formatRelativeTime } from '../utils';
import { canWhatsappCliente } from '../permissions';
import { NewClienteModal } from './NewClienteModal';
import { WhatsappSendModal } from './WhatsappSendModal';

export function ClientesView() {
  const currentUser = useStore((s) => s.currentUser);
  // Só quem chega nesta tela é Diretoria/Marketing/Administrativo/Recepção (ver Sidebar); só a
  // Diretoria de fato escreve em clientes/corretores — os outros três são leitura.
  const isReadOnly = currentUser?.cargo !== 'Diretora';
  const setView = useStore((s) => s.setView);
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);

  const allClientes = useAllClientesFinais();
  const corretores = useStore((s) => s.corretores);
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteFinalComContexto | null>(null);
  const [whatsappCliente, setWhatsappCliente] = useState<ClienteFinalComContexto | null>(null);

  const filtered = useMemo(() => {
    if (!search) return allClientes;
    const q = search.toLowerCase();
    return allClientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.telefone.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        c.nomeCorretor.toLowerCase().includes(q) ||
        c.imobiliaria.toLowerCase().includes(q) ||
        c.interesse.toLowerCase().includes(q)
    );
  }, [allClientes, search]);

  // Diretoria (única que escreve aqui) clica pra editar o cliente (dados + corretor
  // responsável); os demais perfis com acesso a esta tela (Marketing/Administrativo/Recepção,
  // só leitura) clicam pra ver o corretor no Pipeline, como já era.
  function handleRowClick(cliente: ClienteFinalComContexto) {
    if (isReadOnly) {
      setView('pipeline');
      setSelectedCorretor(cliente.corretorId);
    } else {
      setEditingCliente(cliente);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="font-questrial text-xl text-gray-800">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} registros</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente, corretor ou imobiliária..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm min-w-[880px]">
          <thead className="sticky top-0 bg-white border-b" style={{ borderColor: '#e5e7eb' }}>
            <tr>
              <Th>Cliente</Th>
              <Th>Contato</Th>
              <Th>Corretor</Th>
              <Th>Etapa</Th>
              <Th>Interesse</Th>
              <Th>Orçamento</Th>
              <Th>Cadastrado</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
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
                      {canWhatsappCliente(currentUser, clienteComprou(c, corretores)) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setWhatsappCliente(c); }}
                          title="Enviar WhatsApp"
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ color: '#059669', backgroundColor: '#ecfdf5' }}
                        >
                          <MessageSquare size={12} />
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && <NewClienteModal onClose={() => setShowNewModal(false)} />}
      {editingCliente && <NewClienteModal cliente={editingCliente} onClose={() => setEditingCliente(null)} />}
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}

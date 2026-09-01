import { useState } from 'react';
import { UserPlus, Pencil, Ban, RotateCcw, X, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { getInitials } from '../utils';
import { ApiError } from '../api/client';
import type { AppUser } from '../api/endpoints';
import type { UserCargo } from '../types';

const CARGO_OPTIONS: UserCargo[] = ['Diretora', 'GR', 'GV', 'SDR', 'Marketing', 'Administrativo', 'Recepcao'];

const CARGO_COLORS: Record<UserCargo, string> = {
  Diretora: '#d55006',
  GR: '#0d9488',
  GV: '#3b82f6',
  SDR: '#8b5cf6',
  Marketing: '#db2777',
  Administrativo: '#64748b',
  Recepcao: '#059669',
};

const CARGO_LABELS: Record<UserCargo, string> = {
  Diretora: 'Diretora — acesso total',
  GR: 'GR — Gerente de Relacionamento',
  GV: 'GRV — Gerente de Vendas',
  SDR: 'SDR — Qualificação',
  Marketing: 'Marketing — visualização geral + Email Marketing',
  Administrativo: 'Administrativo — visualização (somente leitura)',
  Recepcao: 'Recepção — visualização (somente leitura)',
};

export function UsersManagement() {
  const currentUser = useStore((s) => s.currentUser);
  const users = useStore((s) => s.users);
  const createUser = useStore((s) => s.createUser);
  const updateUser = useStore((s) => s.updateUser);
  const deactivateUser = useStore((s) => s.deactivateUser);
  const showToast = useStore((s) => s.showToast);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [error, setError] = useState('');

  if (currentUser?.cargo !== 'Diretora') return null;

  const ordered = [...users].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  function openCreate() {
    setEditingUser(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(user: AppUser) {
    setEditingUser(user);
    setError('');
    setShowForm(true);
  }

  async function handleToggleAtivo(user: AppUser) {
    try {
      if (user.ativo) {
        await deactivateUser(user.id);
      } else {
        await updateUser(user.id, { ativo: true });
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível atualizar o status do usuário.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-gray-400">
          {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''} — apenas a Diretora pode gerenciar acessos.
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#d55006' }}
        >
          <UserPlus size={14} />
          Novo usuário
        </button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e6e3de' }}>
        {ordered.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
            style={{ borderColor: '#f3f4f6', opacity: user.ativo ? 1 : 0.55 }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: user.cor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {getInitials(user.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800 truncate">{user.nome}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                  style={{ backgroundColor: `${CARGO_COLORS[user.cargo]}18`, color: CARGO_COLORS[user.cargo] }}
                >
                  {user.cargo}
                </span>
                {!user.ativo && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                    Inativo
                  </span>
                )}
                {currentUser.email === user.email && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: '#fff7ed', color: '#d55006' }}>
                    Você
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => openEdit(user)}
                title="Editar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Pencil size={14} />
              </button>
              {currentUser.email !== user.email && (
                <button
                  onClick={() => handleToggleAtivo(user)}
                  title={user.ativo ? 'Desativar' : 'Reativar'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    user.ativo ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {user.ativo ? <Ban size={14} /> : <RotateCcw size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">Nenhum usuário cadastrado ainda.</p>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => setShowForm(false)}
          onCreate={createUser}
          onUpdate={updateUser}
          onCreated={(email) => showToast(`E-mail com os dados de acesso enviado para ${email}.`)}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onCreate, onUpdate, onCreated }: {
  user: AppUser | null;
  onClose: () => void;
  onCreate: (data: { nome: string; email: string; cargo: UserCargo; cor?: string; whatsappPhoneNumberId?: string; whatsappNumeroExibicao?: string }) => Promise<AppUser>;
  onUpdate: (id: string, data: Partial<{ nome: string; cargo: UserCargo; cor: string; ativo: boolean; whatsappPhoneNumberId: string; whatsappNumeroExibicao: string }>) => Promise<AppUser>;
  onCreated: (email: string) => void;
}) {
  const isEditing = Boolean(user);
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [cargo, setCargo] = useState<UserCargo>(user?.cargo ?? 'SDR');
  const [cor, setCor] = useState(user?.cor ?? CARGO_COLORS.SDR);
  const [waNumero, setWaNumero] = useState(user?.whatsappNumeroExibicao ?? '');
  const [waPhoneId, setWaPhoneId] = useState(user?.whatsappPhoneNumberId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!nome.trim()) return setError('Informe o nome completo.');
    if (!isEditing && !email.trim()) return setError('Informe o e-mail.');

    setSubmitting(true);
    try {
      if (isEditing && user) {
        await onUpdate(user.id, {
          nome: nome.trim(),
          cargo,
          cor,
          whatsappNumeroExibicao: waNumero.trim(),
          whatsappPhoneNumberId: waPhoneId.trim(),
        });
      } else {
        await onCreate({
          nome: nome.trim(),
          email: email.trim(),
          cargo,
          cor,
          whatsappNumeroExibicao: waNumero.trim() || undefined,
          whatsappPhoneNumberId: waPhoneId.trim() || undefined,
        });
        onCreated(email.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <ShieldCheck size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">
                {isEditing ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <p className="text-xs text-gray-400">Defina o nível de acesso desta pessoa na plataforma</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nome completo</label>
            <input className="form-input" placeholder="Nome da pessoa" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          {!isEditing && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">E-mail de acesso</label>
              <input
                className="form-input"
                type="email"
                placeholder="nome@phacz.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Uma senha provisória será gerada e enviada para este e-mail. A pessoa será solicitada a trocá-la no primeiro acesso.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nível de acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {CARGO_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCargo(c); if (!isEditing) setCor(CARGO_COLORS[c]); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                  style={
                    cargo === c
                      ? { borderColor: CARGO_COLORS[c], backgroundColor: `${CARGO_COLORS[c]}10` }
                      : { borderColor: '#e5e7eb' }
                  }
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CARGO_COLORS[c] }} />
                  <span className="text-xs font-semibold text-gray-700">{c}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{CARGO_LABELS[cargo]}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Cor de identificação</label>
            <div className="flex items-center gap-2">
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer flex-shrink-0" style={{ borderColor: '#e5e7eb', padding: 2 }} />
              <input className="form-input" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
          </div>

          <div className="pt-1 border-t" style={{ borderColor: '#f3f4f6' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-3 mb-2">WhatsApp (Meta) — para uso futuro</p>
            <p className="text-xs text-gray-400 mb-2">
              Hoje o disparo abre o WhatsApp Web/app da pessoa para envio manual — estes campos não são usados ainda.
              Ficam prontos para quando a integração com a API da Meta for ativada.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Número de envio (exibição)</label>
                <input
                  className="form-input"
                  placeholder="+55 47 99973-1108"
                  value={waNumero}
                  onChange={(e) => setWaNumero(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number ID</label>
                <input
                  className="form-input"
                  placeholder="Ex: 123456789012345"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  O ID do número no WhatsApp Cloud API (Meta → WhatsApp → API Setup). Deixe vazio para usar o número padrão do sistema.
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}

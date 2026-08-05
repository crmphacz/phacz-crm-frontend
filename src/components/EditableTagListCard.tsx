import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { ApiError } from '../api/client';
import { SettingsCard } from './SettingsCard';

interface Item {
  id: string;
  nome: string;
}

export function EditableTagListCard({
  icon, title, subtitle, placeholder, items, onCreate, onUpdate, onRemove, readOnly,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  placeholder: string;
  items: Item[];
  onCreate: (nome: string) => Promise<unknown>;
  onUpdate: (id: string, nome: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [novoItem, setNovoItem] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

  async function handleAdd() {
    const nome = novoItem.trim();
    if (!nome) return;
    setError(null);
    try {
      await onCreate(nome);
      setNovoItem('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o item');
    }
  }

  function startEditing(item: Item) {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingNome('');
  }

  async function handleSaveEdit(id: string) {
    const nome = editingNome.trim();
    if (!nome) return;
    setError(null);
    try {
      await onUpdate(id, nome);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o item');
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await onRemove(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir o item');
    }
  }

  return (
    <SettingsCard icon={icon} title={title} subtitle={subtitle}>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ backgroundColor: '#fafafa', border: '1px solid #e6e3de' }}
          >
            {editingId === item.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border focus:outline-none"
                  style={{ borderColor: '#d55006' }}
                  value={editingNome}
                  onChange={(e) => setEditingNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(item.id);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button
                  onClick={() => handleSaveEdit(item.id)}
                  title="Salvar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors flex-shrink-0"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={cancelEditing}
                  title="Cancelar"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <span
                  className="flex-1 text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{ backgroundColor: '#fff7ed', color: '#d55006', border: '1px solid #fed7aa' }}
                >
                  {item.nome}
                </span>
                {!readOnly && (
                  <>
                    <button
                      onClick={() => startEditing(item)}
                      title="Editar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      title="Excluir"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-gray-400 py-2">Nenhum item cadastrado ainda.</p>
        )}
      </div>

      {error && (
        <p className="text-xs mt-3" style={{ color: '#dc2626' }}>{error}</p>
      )}

      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: '#e6e3de' }}>
          <input
            className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border focus:outline-none transition-colors"
            style={{ borderColor: '#e5e7eb' }}
            placeholder={placeholder}
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            onFocus={(e) => (e.target.style.borderColor = '#d55006')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all flex-shrink-0"
            style={{ backgroundColor: '#d55006' }}
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      )}
    </SettingsCard>
  );
}

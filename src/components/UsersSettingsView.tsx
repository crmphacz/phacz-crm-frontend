import { ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { SettingsCard } from './SettingsCard';
import { UsersManagement } from './UsersManagement';

export function UsersSettingsView() {
  const currentUser = useStore((s) => s.currentUser);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Usuários
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie contas e defina o nível de acesso de cada pessoa na plataforma.
          </p>
        </div>

        {currentUser?.cargo === 'Diretora' ? (
          <SettingsCard
            icon={<ShieldCheck size={18} style={{ color: '#d55006' }} />}
            title="Usuários da Plataforma"
            subtitle="Crie contas e defina o nível de acesso de cada pessoa"
          >
            <UsersManagement />
          </SettingsCard>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ShieldCheck size={28} className="mx-auto mb-3" style={{ color: '#d1d5db' }} />
            <p className="text-sm font-semibold text-gray-600">Acesso restrito</p>
            <p className="text-xs text-gray-400 mt-1">Somente a Diretora pode gerenciar usuários da plataforma.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Users, Filter, Tag, Search, Layers } from 'lucide-react';
import { useStore } from '../store';
import { STAGES } from '../data';
import { getInitials } from '../utils';
import { GRUPOS_FUNIL_LISTA, resolveDestinatarios, type CanalCampanha, type PublicoAlvo } from '../lib/publicoAlvo';
import type { Corretor } from '../types';

/**
 * Escolha de quem vai receber uma campanha. É o mesmo seletor para e-mail e WhatsApp — a
 * diferença é o canal, que define quem é elegível (e-mail válido × telefone válido) e se o
 * critério "funil inteiro" aparece.
 */
interface Props {
  canal: CanalCampanha;
  elegiveis: Corretor[];
  valor: PublicoAlvo;
  onChange: (v: PublicoAlvo) => void;
}

export function PublicoAlvoPicker({ canal, elegiveis, valor, onChange }: Props) {
  const corretores = useStore((s) => s.corretores);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions);
  const [search, setSearch] = useState('');

  const tiposAtivos = useMemo(
    () => tiposInteresseOptions.filter((t) => t.ativo).map((t) => t.nome),
    [tiposInteresseOptions]
  );

  const campoDeContato = (c: Corretor) =>
    canal === 'email' ? c.emailCorretor : c.whatsappCorretor || c.telefoneCorretor;

  const buscaCorretores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return elegiveis
      .filter((c) => c.nomeCorretor.toLowerCase().includes(q) || campoDeContato(c).toLowerCase().includes(q))
      .slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegiveis, search, canal]);

  /** Quantos entram no critério × quantos existem — mostra o que fica de fora por falta de contato. */
  function contagem(filtra: (c: Corretor) => boolean) {
    const elegiveisNoCriterio = elegiveis.filter(filtra).length;
    const totalNoCriterio = corretores.filter((c) => c.status !== 'arquivado' && filtra(c)).length;
    return { elegiveisNoCriterio, totalNoCriterio };
  }

  const semContato = canal === 'email' ? 'sem e-mail cadastrado' : 'sem telefone válido ou que pediram para não receber';

  const opcoes: { tipo: PublicoAlvo['tipo']; icone: React.ReactNode; label: string }[] = [
    { tipo: 'individual', icone: <Users size={16} />, label: 'Corretores específicos' },
    ...(canal === 'whatsapp'
      ? [{ tipo: 'grupo_funil' as const, icone: <Layers size={16} />, label: 'Funil inteiro' }]
      : []),
    { tipo: 'funil', icone: <Filter size={16} />, label: 'Etapa da pipeline' },
    { tipo: 'empreendimento', icone: <Tag size={16} />, label: 'Perfil de qualificação' },
  ];

  const selecionados = resolveDestinatarios(elegiveis, valor);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Quem vai receber?</p>
        <div className={`grid gap-2 ${opcoes.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          {opcoes.map((o) => (
            <RadioCard
              key={o.tipo}
              active={valor.tipo === o.tipo}
              icon={o.icone}
              label={o.label}
              onClick={() => onChange({ ...valor, tipo: o.tipo })}
            />
          ))}
        </div>
      </div>

      {valor.tipo === 'individual' && (
        <div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder={canal === 'email' ? 'Buscar corretor por nome ou e-mail...' : 'Buscar corretor por nome ou telefone...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() ? (
            <div className="border rounded-xl overflow-y-auto" style={{ borderColor: '#e5e7eb', maxHeight: 220 }}>
              {buscaCorretores.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">Nenhum corretor encontrado para "{search.trim()}".</p>
              )}
              {buscaCorretores.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#f3f4f6' }}
                >
                  <input
                    type="checkbox"
                    checked={valor.corretorIds.includes(c.id)}
                    onChange={() =>
                      onChange({
                        ...valor,
                        corretorIds: valor.corretorIds.includes(c.id)
                          ? valor.corretorIds.filter((id) => id !== c.id)
                          : [...valor.corretorIds, c.id],
                      })
                    }
                    className="w-4 h-4 flex-shrink-0 accent-orange-600"
                  />
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                    {getInitials(c.nomeCorretor)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.nomeCorretor}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {campoDeContato(c)}{c.imobiliaria ? ` · ${c.imobiliaria}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Busque pelo nome para escolher um a um.</p>
          )}
          {valor.corretorIds.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{valor.corretorIds.length} selecionado(s).</p>
          )}
        </div>
      )}

      {valor.tipo === 'grupo_funil' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Funil</label>
          <select
            className="form-input"
            value={valor.funilAlvo}
            onChange={(e) => onChange({ ...valor, funilAlvo: e.target.value as PublicoAlvo['funilAlvo'] })}
          >
            {GRUPOS_FUNIL_LISTA.map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </select>
          <Resumo {...contagem((c) => GRUPOS_FUNIL_LISTA.find(([id]) => id === valor.funilAlvo)![1].etapas.includes(c.etapa))} semContato={semContato} />
        </div>
      )}

      {valor.tipo === 'funil' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Etapa</label>
          <select
            className="form-input"
            value={valor.etapaAlvo}
            onChange={(e) => onChange({ ...valor, etapaAlvo: Number(e.target.value) })}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.id}. {s.nome}</option>
            ))}
          </select>
          <Resumo {...contagem((c) => c.etapa === valor.etapaAlvo)} semContato={semContato} />
        </div>
      )}

      {valor.tipo === 'empreendimento' && (
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Perfil de qualificação</label>
          <select
            className="form-input"
            value={valor.tipoInteresseAlvo}
            onChange={(e) => onChange({ ...valor, tipoInteresseAlvo: e.target.value })}
          >
            <option value="">Selecionar...</option>
            {tiposAtivos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {valor.tipoInteresseAlvo && (
            <Resumo {...contagem((c) => c.tiposInteresse.includes(valor.tipoInteresseAlvo))} semContato={semContato} />
          )}
        </div>
      )}

      <div className="rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: '#f8f9fa' }}>
        <strong className="text-gray-800">{selecionados.length}</strong>
        <span className="text-gray-500"> {selecionados.length === 1 ? 'corretor vai receber' : 'corretores vão receber'}.</span>
      </div>
    </div>
  );
}

function Resumo({ elegiveisNoCriterio, totalNoCriterio, semContato }: { elegiveisNoCriterio: number; totalNoCriterio: number; semContato: string }) {
  const fora = totalNoCriterio - elegiveisNoCriterio;
  return (
    <p className="text-xs text-gray-400 mt-1.5">
      {elegiveisNoCriterio} de {totalNoCriterio} corretor(es) nesse critério
      {fora > 0 ? ` — ${fora} ficou(ram) de fora por estar(em) ${semContato}.` : '.'}
    </p>
  );
}

function RadioCard({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
      style={
        active
          ? { borderColor: '#d55006', backgroundColor: '#fff7ed', color: '#d55006' }
          : { borderColor: '#e5e7eb', color: '#6b7280' }
      }
    >
      {icon}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

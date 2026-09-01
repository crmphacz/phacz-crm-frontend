import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Save, Clock } from 'lucide-react';
import '@fortune-sheet/react/dist/index.css';
import { Workbook } from '@fortune-sheet/react';
import type { WorkbookInstance } from '@fortune-sheet/react';
import type { Sheet } from '@fortune-sheet/core';
import { useStore } from '../store';
import { tabelasEmpreendimentosApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { formatRelativeTime } from '../utils';
import type { CelulaAlterada } from '../types';

interface Props {
  id: string;
  nomeInicial: string;
  readOnly: boolean;
  onBack: () => void;
  onNomeChange?: (nome: string) => void;
}

function colLetter(c: number): string {
  let s = '';
  let n = c;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function abaVazia(): Sheet {
  return { name: 'Planilha 1', celldata: [], order: 0, row: 200, column: 30, config: {} } as unknown as Sheet;
}

function normalizarDados(dados: unknown): Sheet[] {
  if (Array.isArray(dados) && dados.length > 0) return dados as Sheet[];
  const obj = dados as { sheets?: unknown } | null;
  if (obj && Array.isArray(obj.sheets) && obj.sheets.length > 0) return obj.sheets as Sheet[];
  return [abaVazia()];
}

/** Extrai as células preenchidas de cada aba no formato normalizado (aba, ref, valor, fórmula). */
function sheetsParaCelulas(sheets: Sheet[]): CelulaAlterada[] {
  const out: CelulaAlterada[] = [];
  for (const sh of sheets ?? []) {
    const aba = String((sh as { name?: string })?.name ?? 'Planilha 1');
    const celldata = Array.isArray((sh as { celldata?: unknown }).celldata)
      ? ((sh as { celldata: { r: number; c: number; v: unknown }[] }).celldata)
      : [];
    for (const cd of celldata) {
      if (!cd || typeof cd.r !== 'number' || typeof cd.c !== 'number') continue;
      const raw = cd.v;
      const v = (raw && typeof raw === 'object' ? raw : { v: raw }) as {
        v?: unknown; m?: unknown; f?: unknown;
      };
      const formula = typeof v.f === 'string' && v.f.startsWith('=') ? v.f : null;
      let valor = '';
      if (v.m !== undefined && v.m !== null) valor = String(v.m);
      else if (v.v !== undefined && v.v !== null) valor = String(v.v);
      if (valor === '' && !formula) continue;
      out.push({ aba, ref: `${colLetter(cd.c)}${cd.r + 1}`, valor, formula });
    }
  }
  return out;
}

export function TabelaEmpreendimentoEditor({ id, nomeInicial, readOnly, onBack, onNomeChange }: Props) {
  const showToast = useStore((s) => s.showToast);

  const wbRef = useRef<WorkbookInstance>(null);
  const sheetsRef = useRef<Sheet[] | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sheetsIniciais, setSheetsIniciais] = useState<Sheet[] | null>(null);
  const [nome, setNome] = useState(nomeInicial);
  const [dirty, setDirty] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [atualizadoPorNome, setAtualizadoPorNome] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    tabelasEmpreendimentosApi
      .get(id)
      .then((t) => {
        if (!vivo) return;
        setSheetsIniciais(normalizarDados(t.dados));
        setNome(t.nome);
        setAtualizadoPorNome(t.atualizadoPorNome);
        setAtualizadoEm(t.atualizadoEm);
      })
      .catch((err) => { if (vivo) setErro(err instanceof ApiError ? err.message : 'Não foi possível abrir a tabela.'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [id]);

  const salvar = useCallback(async () => {
    if (readOnly || salvando) return;
    const sheets = (wbRef.current?.getAllSheets() ?? sheetsRef.current ?? sheetsIniciais ?? []) as Sheet[];
    setSalvando(true);
    try {
      const res = await tabelasEmpreendimentosApi.save(id, {
        nome: nome.trim() || nomeInicial,
        dados: sheets,
        celulas: sheetsParaCelulas(sheets),
      });
      setDirty(false);
      setAtualizadoPorNome(res.atualizadoPorNome);
      setAtualizadoEm(res.atualizadoEm);
      onNomeChange?.(nome.trim() || nomeInicial);
      showToast(`Tabela salva — ${res.celulasAlteradas} célula(s) alterada(s).`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível salvar a tabela.');
    } finally {
      setSalvando(false);
    }
  }, [id, nome, nomeInicial, readOnly, salvando, sheetsIniciais, onNomeChange, showToast]);

  // Ctrl/Cmd+S salva
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) salvar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, salvar]);

  function handleBack() {
    if (dirty && !window.confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onBack();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderColor: '#e5e7eb' }}>
        <button
          onClick={handleBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          title="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
        <input
          className="font-questrial text-lg text-gray-800 bg-transparent border-0 border-b border-transparent focus:border-gray-300 focus:outline-none min-w-0 flex-1"
          value={nome}
          disabled={readOnly}
          onChange={(e) => { setNome(e.target.value); setDirty(true); }}
        />
        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
          <Clock size={12} />
          {atualizadoEm
            ? `${atualizadoPorNome ? `${atualizadoPorNome} · ` : ''}${formatRelativeTime(atualizadoEm)}`
            : '—'}
        </div>
        {!readOnly && (
          <button
            onClick={salvar}
            disabled={!dirty || salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-40 flex-shrink-0 transition-opacity"
            style={{ backgroundColor: '#d55006' }}
          >
            <Save size={15} />
            {salvando ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative">
        {carregando && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 bg-white z-10">Carregando planilha…</div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 bg-white z-10">{erro}</div>
        )}
        {sheetsIniciais && (
          <Workbook
            key={id}
            ref={wbRef}
            data={sheetsIniciais}
            lang="en"
            allowEdit={!readOnly}
            showToolbar={!readOnly}
            showFormulaBar
            onChange={(data) => { sheetsRef.current = data as Sheet[]; setDirty(true); }}
          />
        )}
      </div>
    </div>
  );
}

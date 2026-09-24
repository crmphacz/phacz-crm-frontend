import { useEffect, useState } from 'react';
import { Send, AlertTriangle, Ban, CheckCircle2, Clock, XCircle, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { useViewReady } from '../navLoading';
import { ViewLoader } from './ViewLoader';
import { ApiError } from '../api/client';
import { whatsappBroadcastApi } from '../api/endpoints';
import { formatRelativeTime } from '../utils';
import { descreveCriterio } from '../lib/publicoAlvo';
import { WhatsappIcon } from './WhatsappIcon';
import { WhatsappBroadcastModal } from './WhatsappBroadcastModal';
import { canDeleteLeadClienteOuCard } from '../permissions';
import type { WhatsappCampaign, WhatsappOptOut } from '../types';

const STATUS_CONFIG = {
  pendente: { label: 'Na fila', icon: Clock, bg: '#fef9c3', text: '#854d0e' },
  enviando: { label: 'Enviando', icon: Loader2, bg: '#dbeafe', text: '#1d4ed8' },
  concluido: { label: 'Concluído', icon: CheckCircle2, bg: '#dcfce7', text: '#166534' },
  cancelado: { label: 'Cancelado', icon: XCircle, bg: '#f3f4f6', text: '#4b5563' },
} as const;

export function WhatsappBroadcastView() {
  const campanhas = useStore((s) => s.whatsappCampaigns);
  const configurado = useStore((s) => s.whatsappBroadcastConfigurado);
  const loadWhatsappBroadcast = useStore((s) => s.loadWhatsappBroadcast);
  const currentUser = useStore((s) => s.currentUser);
  const showToast = useStore((s) => s.showToast);
  const podeExcluir = canDeleteLeadClienteOuCard(currentUser);
  const somenteLeitura = currentUser?.cargo !== 'Diretora' && currentUser?.cargo !== 'Marketing';

  const [ready, setReady] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [optOuts, setOptOuts] = useState<WhatsappOptOut[]>([]);
  const [mostrarOptOuts, setMostrarOptOuts] = useState(false);
  useViewReady(ready);

  useEffect(() => {
    loadWhatsappBroadcast()
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Não foi possível carregar os disparos.', 'error'))
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Campanha na fila avança sozinha (o cron envia em lotes) — enquanto houver alguma em
  // andamento, a tela se atualiza para o progresso não ficar parado.
  const temAndamento = campanhas.some((c) => c.status === 'pendente' || c.status === 'enviando');
  useEffect(() => {
    if (!temAndamento) return;
    const t = setInterval(() => { loadWhatsappBroadcast().catch(() => undefined); }, 20_000);
    return () => clearInterval(t);
  }, [temAndamento, loadWhatsappBroadcast]);

  async function abrirOptOuts() {
    setMostrarOptOuts((v) => !v);
    if (optOuts.length === 0) {
      try {
        setOptOuts(await whatsappBroadcastApi.optOuts());
      } catch {
        showToast('Não foi possível carregar a lista de descadastrados.', 'error');
      }
    }
  }

  async function cancelar(c: WhatsappCampaign) {
    if (!window.confirm(`Cancelar o disparo "${c.nome}"? As mensagens que ainda não saíram não serão enviadas.`)) return;
    try {
      await whatsappBroadcastApi.cancelar(c.id);
      await loadWhatsappBroadcast();
      showToast('Disparo cancelado.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível cancelar.', 'error');
    }
  }

  async function excluir(c: WhatsappCampaign) {
    if (!window.confirm(`Excluir o registro do disparo "${c.nome}"? O histórico dele some.`)) return;
    try {
      await whatsappBroadcastApi.remover(c.id);
      await loadWhatsappBroadcast();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível excluir.', 'error');
    }
  }

  if (!ready) return <ViewLoader label="Carregando disparos…" />;

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: '#e6e3de' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              WhatsApp em massa
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Comunicados para a base de corretores, pelo número dedicado a disparos.
            </p>
          </div>
          {!somenteLeitura && (
            <button
              onClick={() => setModalAberto(true)}
              disabled={!configurado}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors flex-shrink-0 disabled:opacity-50"
              style={{ backgroundColor: '#059669' }}
            >
              <Send size={16} /> Novo disparo
            </button>
          )}
        </div>

        {!configurado && (
          <div className="rounded-2xl border px-4 py-3 flex items-start gap-2.5" style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
            <AlertTriangle size={16} style={{ color: '#b45309' }} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: '#92400e' }}>
              <p className="font-semibold">O número de disparo ainda não está configurado.</p>
              <p className="text-xs mt-1">
                Falta preencher, no ambiente do servidor, o token da Meta, o número dedicado aos disparos e o
                identificador da conta (WABA) de onde vêm os templates aprovados.
              </p>
            </div>
          </div>
        )}

        {/* Como funciona — a regra da Meta não é óbvia e explica o formato da tela */}
        <div className="bg-white rounded-2xl border px-4 py-3" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-start gap-2.5">
            <WhatsappIcon size={16} className="flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-500 leading-relaxed">
              O disparo usa um <strong className="text-gray-700">template aprovado na Meta</strong> — é a única forma
              permitida de iniciar conversa com quem não respondeu nas últimas 24 horas. Você escolhe o template,
              preenche as variáveis e anexa a imagem ou o vídeo do cabeçalho.
              Quem responder recebe, automaticamente, a orientação de falar com a Recepção, e quem pedir para sair
              deixa de receber os próximos.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Disparos realizados</h2>
          <button onClick={abrirOptOuts} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
            <Ban size={13} /> Descadastrados
          </button>
        </div>

        {mostrarOptOuts && (
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e5e7eb' }}>
            {optOuts.length === 0 ? (
              <p className="text-sm text-gray-400">Ninguém pediu para sair da lista até agora.</p>
            ) : (
              <ul className="space-y-1.5">
                {optOuts.map((o) => (
                  <li key={o.id} className="text-sm text-gray-700 flex items-center justify-between gap-3">
                    <span className="truncate">{o.nomeCorretor}{o.imobiliaria ? ` · ${o.imobiliaria}` : ''}</span>
                    {o.desdeEm && <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(o.desdeEm)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {campanhas.length === 0 ? (
          <div className="bg-white rounded-2xl border flex flex-col items-center justify-center text-center py-16 gap-3" style={{ borderColor: '#e5e7eb' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
              <WhatsappIcon size={22} />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nenhum disparo realizado ainda</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Crie o primeiro disparo escolhendo um template aprovado e o público que vai receber.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {campanhas.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const Icone = cfg.icon;
              const progresso = c.totalDestinatarios > 0
                ? Math.round(((c.enviados + c.falhas) / c.totalDestinatarios) * 100)
                : 0;
              return (
                <div key={c.id} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e5e7eb' }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          {c.templateName}
                        </p>
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                          <Icone size={11} className={c.status === 'enviando' ? 'animate-spin' : ''} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {descreveCriterio(c.destinatarioTipo, c)} · {c.totalDestinatarios} destinatário(s) · por {c.criadoPorNome} · {formatRelativeTime(c.criadoEm)}
                      </p>
                      {c.previewTexto && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2 whitespace-pre-line">{c.previewTexto}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(c.status === 'pendente' || c.status === 'enviando') && !somenteLeitura && (
                        <button onClick={() => cancelar(c)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border text-gray-600 hover:bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
                          Cancelar
                        </button>
                      )}
                      {podeExcluir && (
                        <button onClick={() => excluir(c)} title="Excluir registro" className="w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${progresso}%`, backgroundColor: '#059669' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {c.enviados} enviada(s)
                      {c.falhas > 0 && <span style={{ color: '#b91c1c' }}> · {c.falhas} falha(s)</span>}
                      {' '}de {c.totalDestinatarios}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAberto && (
        <WhatsappBroadcastModal
          onClose={() => setModalAberto(false)}
          onSent={async () => {
            setModalAberto(false);
            await loadWhatsappBroadcast().catch(() => undefined);
            showToast('Disparo criado. As mensagens saem em lotes nos próximos minutos.');
          }}
        />
      )}
    </div>
  );
}

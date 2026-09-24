import { useMemo, useState } from 'react';
import { X, Send, Paperclip, Info, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { ApiError } from '../api/client';
import { whatsappBroadcastApi } from '../api/endpoints';
import { PublicoAlvoPicker } from './PublicoAlvoPicker';
import { WhatsappIcon } from './WhatsappIcon';
import {
  corretoresElegiveis, resolveDestinatarios, PUBLICO_ALVO_INICIAL, type PublicoAlvo,
} from '../lib/publicoAlvo';
import type { WhatsappTemplate } from '../types';

interface Props {
  onClose: () => void;
  onSent: () => void;
}

/** Troca {{1}}, {{2}}… pelos valores digitados, para mostrar como a mensagem vai chegar. */
function aplicarVariaveis(corpo: string, valores: string[]): string {
  return corpo.replace(/\{\{(\d+)\}\}/g, (_, n) => valores[Number(n) - 1] || `{{${n}}}`);
}

export function WhatsappBroadcastModal({ onClose, onSent }: Props) {
  const templates = useStore((s) => s.whatsappTemplates);
  const corretores = useStore((s) => s.corretores);

  const [templateNome, setTemplateNome] = useState(templates[0]?.nome ?? '');
  const [variaveis, setVariaveis] = useState<string[]>([]);
  const [midiaUrl, setMidiaUrl] = useState('');
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [publico, setPublico] = useState<PublicoAlvo>(PUBLICO_ALVO_INICIAL);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const template: WhatsappTemplate | undefined = templates.find((t) => t.nome === templateNome);
  const elegiveis = useMemo(() => corretoresElegiveis(corretores, 'whatsapp'), [corretores]);
  const destinatarios = useMemo(() => resolveDestinatarios(elegiveis, publico), [elegiveis, publico]);

  const precisaMidia = template?.midiaCabecalho === 'IMAGE' || template?.midiaCabecalho === 'VIDEO';
  const tipoMidia = template?.midiaCabecalho === 'VIDEO' ? 'video' : 'image';
  const faltaVariavel = template ? variaveis.slice(0, template.totalVariaveis).some((v) => !v?.trim()) || variaveis.length < template.totalVariaveis : true;
  const podeEnviar = Boolean(template) && !faltaVariavel && destinatarios.length > 0 && (!precisaMidia || Boolean(midiaUrl)) && !enviando;

  function trocarTemplate(nome: string) {
    setTemplateNome(nome);
    setVariaveis([]);
    setMidiaUrl('');
  }

  async function subirMidia(file: File) {
    setEnviandoMidia(true);
    setErro('');
    try {
      const { url } = await whatsappBroadcastApi.uploadMidia(file);
      setMidiaUrl(url);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setEnviandoMidia(false);
    }
  }

  async function enviar() {
    if (!template || !podeEnviar) return;
    setEnviando(true);
    setErro('');
    try {
      await whatsappBroadcastApi.criar({
        templateName: template.nome,
        templateLanguage: template.idioma,
        previewTexto: aplicarVariaveis(template.corpo, variaveis),
        variaveis: variaveis.slice(0, template.totalVariaveis),
        midiaUrl,
        midiaTipo: midiaUrl ? tipoMidia : '',
        destinatarioTipo: publico.tipo,
        etapaAlvo: publico.tipo === 'funil' ? publico.etapaAlvo : undefined,
        funilAlvo: publico.tipo === 'grupo_funil' ? publico.funilAlvo : undefined,
        tipoInteresseAlvo: publico.tipo === 'empreendimento' ? publico.tipoInteresseAlvo : undefined,
        corretorIds: publico.tipo === 'individual' ? publico.corretorIds : undefined,
      });
      onSent();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar o disparo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#ecfdf5' }}>
              <WhatsappIcon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-questrial font-bold text-lg text-gray-900 truncate">Novo disparo</h2>
              <p className="text-xs text-gray-400 truncate">Template aprovado + público</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {templates.length === 0 ? (
            <div className="rounded-xl border px-3 py-3 flex items-start gap-2" style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
              <Info size={15} style={{ color: '#b45309' }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: '#92400e' }}>
                Nenhum template aprovado encontrado na conta da Meta. Crie e submeta o template no painel da Meta;
                assim que for aprovado, ele aparece aqui.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Template</label>
                <select className="form-input" value={templateNome} onChange={(e) => trocarTemplate(e.target.value)}>
                  {templates.map((t) => (
                    <option key={`${t.nome}-${t.idioma}`} value={t.nome}>
                      {t.nome} ({t.idioma}) · {t.categoria}
                    </option>
                  ))}
                </select>
              </div>

              {template && (
                <>
                  {template.totalVariaveis > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block">
                        Variáveis da mensagem
                      </label>
                      {Array.from({ length: template.totalVariaveis }, (_, i) => (
                        <div key={i}>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">{`{{${i + 1}}}`}</label>
                          <input
                            className="form-input"
                            placeholder={`Valor da variável ${i + 1}`}
                            value={variaveis[i] ?? ''}
                            onChange={(e) => {
                              const proximo = [...variaveis];
                              proximo[i] = e.target.value;
                              setVariaveis(proximo);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {precisaMidia && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">
                        {tipoMidia === 'video' ? 'Vídeo do cabeçalho' : 'Imagem do cabeçalho'}
                      </label>
                      {midiaUrl ? (
                        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                          <Paperclip size={13} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate flex-1 text-gray-600">{midiaUrl.split('/').pop()}</span>
                          <button type="button" onClick={() => setMidiaUrl('')} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer text-gray-500 hover:bg-gray-100 transition-colors" style={{ borderColor: '#e5e7eb' }}>
                          {enviandoMidia ? <Loader2 size={13} className="animate-spin flex-shrink-0" /> : <Paperclip size={13} className="flex-shrink-0" />}
                          {enviandoMidia ? 'Enviando…' : tipoMidia === 'video' ? 'Escolher vídeo (mp4)' : 'Escolher imagem (jpg ou png)'}
                          <input
                            type="file"
                            className="hidden"
                            accept={tipoMidia === 'video' ? 'video/mp4' : 'image/jpeg,image/png'}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) subirMidia(f); }}
                          />
                        </label>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">
                        Este template tem cabeçalho de {tipoMidia === 'video' ? 'vídeo' : 'imagem'}, então o arquivo é obrigatório.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">Como vai chegar</label>
                    <div className="rounded-xl px-3 py-3 text-sm text-gray-700 whitespace-pre-line" style={{ backgroundColor: '#ecfdf5' }}>
                      {aplicarVariaveis(template.corpo, variaveis) || 'Este template não tem corpo de texto.'}
                    </div>
                  </div>
                </>
              )}

              <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
                <PublicoAlvoPicker canal="whatsapp" elegiveis={elegiveis} valor={publico} onChange={setPublico} />
              </div>
            </>
          )}

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={!podeEnviar}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#059669' }}
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {enviando ? 'Criando…' : `Disparar para ${destinatarios.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

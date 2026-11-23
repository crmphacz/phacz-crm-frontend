import { useEffect, useMemo, useState } from 'react';
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

/**
 * O token que o servidor troca pelo nome de CADA destinatário, no momento do envio.
 *
 * Sem ele, o que se digita aqui vai igual para a base inteira: num template que começa com
 * "Olá, {{1}}!", ou a mensagem sai impessoal, ou sai com o nome de uma pessoa só para todo
 * mundo. Tem de ser idêntico ao TOKEN_NOME do backend (lib/variaveisDisparo.ts).
 */
const TOKEN_NOME = '[nome]';

/**
 * O pedaço do template em volta de uma variável, para a pessoa saber o que escrever ali.
 *
 * É a diferença entre "Valor da variável 1" — que não diz nada — e ver "Olá, {{1}}! Aqui é a
 * PHACZ", que mostra na hora que ali vai um nome.
 */
function trechoDaVariavel(corpo: string, indice: number): string {
  const marca = `{{${indice + 1}}}`;
  const posicao = corpo.indexOf(marca);
  if (posicao === -1) return '';
  const inicio = Math.max(0, posicao - 40);
  const fim = Math.min(corpo.length, posicao + marca.length + 40);
  return `${inicio > 0 ? '…' : ''}${corpo.slice(inicio, fim).trim()}${fim < corpo.length ? '…' : ''}`;
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

  /**
   * Quantos clientes o público escolhido alcança. Vem do servidor: diferente da lista de
   * corretores, a de clientes é paginada e a tela não a tem em memória para contar sozinha.
   * `null` enquanto carrega — zero e "ainda não sei" precisam parecer coisas diferentes.
   */
  const [totalClientes, setTotalClientes] = useState<number | null>(null);
  const [publicoPermitido, setPublicoPermitido] = useState(true);

  const ehPublicoDeCliente = publico.tipo === 'leads' || publico.tipo === 'nossos_clientes';

  useEffect(() => {
    if (!ehPublicoDeCliente) return;
    let cancelado = false;
    setTotalClientes(null);
    whatsappBroadcastApi
      .publicoCliente(publico.tipo === 'leads' ? 'LEADS' : 'NOSSOS_CLIENTES')
      // Uma resposta que chega depois de a pessoa já ter trocado de público mostraria o número
      // do público anterior — por isso a resposta de uma busca cancelada é descartada.
      .then((r) => { if (!cancelado) { setTotalClientes(r.total); setPublicoPermitido(r.permitido); } })
      .catch(() => { if (!cancelado) { setTotalClientes(0); setPublicoPermitido(true); } });
    return () => { cancelado = true; };
  }, [publico.tipo, ehPublicoDeCliente]);

  const template: WhatsappTemplate | undefined = templates.find((t) => t.nome === templateNome);
  const elegiveis = useMemo(() => corretoresElegiveis(corretores, 'whatsapp'), [corretores]);
  const destinatarios = useMemo(() => resolveDestinatarios(elegiveis, publico), [elegiveis, publico]);

  const precisaMidia = template?.midiaCabecalho === 'IMAGE' || template?.midiaCabecalho === 'VIDEO';
  const tipoMidia = template?.midiaCabecalho === 'VIDEO' ? 'video' : 'image';
  const faltaVariavel = template ? variaveis.slice(0, template.totalVariaveis).some((v) => !v?.trim()) || variaveis.length < template.totalVariaveis : true;
  /** Nome fictício só para a prévia — ver o comentário no bloco "Como vai chegar". */
  const exemploDeNome = 'Maria';
  const usaNomeEmAlgumaVariavel = variaveis.some((v) => (v ?? '').toLowerCase().includes(TOKEN_NOME));

  const quantosRecebem = ehPublicoDeCliente ? (totalClientes ?? 0) : destinatarios.length;
  const podeEnviar =
    Boolean(template) && !faltaVariavel && quantosRecebem > 0 && publicoPermitido
    && (!precisaMidia || Boolean(midiaUrl)) && !enviando;

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
        // Os públicos de cliente não levam critério nenhum junto: o recorte é o próprio
        // público, e quem o aplica é o servidor.
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
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block">
                          O que entra na mensagem
                        </label>
                        <p className="text-xs text-gray-400 mt-1">
                          O template tem {template.totalVariaveis === 1 ? 'uma lacuna' : `${template.totalVariaveis} lacunas`} para
                          preencher. O texto abaixo de cada campo mostra onde ela aparece.
                        </p>
                      </div>
                      {Array.from({ length: template.totalVariaveis }, (_, i) => {
                        const trecho = trechoDaVariavel(template.corpo, i);
                        const usaNome = (variaveis[i] ?? '').toLowerCase().includes(TOKEN_NOME);
                        return (
                          <div key={i} className="rounded-xl border p-3" style={{ borderColor: '#e5e7eb' }}>
                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                              <label className="text-xs font-bold text-gray-600">
                                Lacuna {i + 1} de {template.totalVariaveis}
                              </label>
                              {/* O botão existe porque digitar "[nome]" à mão não ocorreria a
                                  ninguém — e é justamente o que faz a mensagem chegar
                                  personalizada em vez de igual para a base inteira. */}
                              <button
                                type="button"
                                onClick={() => {
                                  const proximo = [...variaveis];
                                  proximo[i] = TOKEN_NOME;
                                  setVariaveis(proximo);
                                }}
                                className="text-xs font-semibold flex-shrink-0"
                                style={{ color: '#16a34a' }}
                              >
                                Usar o nome de cada um
                              </button>
                            </div>
                            {trecho && (
                              <p className="text-xs text-gray-500 mb-1.5 italic">
                                Aparece em: “{trecho}”
                              </p>
                            )}
                            <input
                              className="form-input"
                              placeholder="Ex.: Parceiro, ou um texto fixo para todos"
                              value={variaveis[i] ?? ''}
                              onChange={(e) => {
                                const proximo = [...variaveis];
                                proximo[i] = e.target.value;
                                setVariaveis(proximo);
                              }}
                            />
                            <p className="text-xs mt-1.5" style={{ color: usaNome ? '#16a34a' : '#9ca3af' }}>
                              {usaNome
                                ? 'Cada pessoa recebe com o próprio nome.'
                                : 'Este texto vai igual para todos os destinatários.'}
                            </p>
                          </div>
                        );
                      })}
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
                      {/* O token é trocado por um nome de exemplo na prévia. Mostrar "[nome]"
                          cru deixaria a dúvida de se é assim que a mensagem chega. */}
                      {aplicarVariaveis(template.corpo, variaveis.map((v) => v?.replace(/\[nome\]/gi, exemploDeNome) ?? v))
                        || 'Este template não tem corpo de texto.'}
                    </div>
                    {usaNomeEmAlgumaVariavel && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        “{exemploDeNome}” é só um exemplo — cada pessoa recebe com o próprio nome.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
                <PublicoAlvoPicker canal="whatsapp" elegiveis={elegiveis} valor={publico} onChange={setPublico} />

                {ehPublicoDeCliente && (
                  <div className="rounded-xl border px-3 py-3 mt-3" style={{ borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}>
                    {!publicoPermitido ? (
                      <p className="text-xs" style={{ color: '#1e40af' }}>
                        Seu perfil não pode disparar para este público.
                      </p>
                    ) : totalClientes === null ? (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin" /> Contando quantos vão receber…
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: '#1e40af' }}>
                        <strong>{totalClientes}</strong>{' '}
                        {totalClientes === 1 ? 'cliente' : 'clientes'} em{' '}
                        {publico.tipo === 'leads' ? 'Leads' : 'Nossos clientes'}. Quem pediu para não
                        receber já está fora da conta.
                      </p>
                    )}
                  </div>
                )}
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
            {enviando ? 'Criando…' : `Disparar para ${quantosRecebem}`}
          </button>
        </div>
      </div>
    </div>
  );
}

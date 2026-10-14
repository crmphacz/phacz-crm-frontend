import { useEffect, useState } from 'react';
import { X, Building2, User, Mail, Tag, ChevronRight, AlertTriangle, CalendarPlus } from 'lucide-react';
import { EventoPickerModal } from './EventoPickerModal';
import { useStore } from '../store';
import { STAGES } from '../data';
import { ApiError } from '../api/client';
import { corretoresApi, type ImobiliariaMatch } from '../api/endpoints';
import { maskCPF, maskCurrencyBRLInput, parseCurrencyBRL } from '../utils';
import { PAIS_PADRAO, maskTelefone } from '../lib/paises';
import { TelefoneInput } from './TelefoneInput';
import { UF_OPTIONS, useCidadesPorUf } from '../lib/ibge';
import { Combobox } from './Combobox';
import type { TipoInteresse, CanalOrigem } from '../types';

function responsavelLabel(m: ImobiliariaMatch): string {
  const nomes = [m.responsavelGV?.nome, m.responsavelSDR?.nome, m.responsavelGR?.nome].filter(Boolean);
  return nomes.length > 0 ? nomes.join(' / ') : 'sem responsável definido';
}

export function NewCorretorModal() {
  const setShowNewCorretorModal = useStore((s) => s.setShowNewCorretorModal);
  const addCorretor = useStore((s) => s.addCorretor);
  const moveCorretor = useStore((s) => s.moveCorretor);
  const showToast = useStore((s) => s.showToast);
  // Etapa da coluna clicada em "+ Adicionar corretor" no Pipeline (1 quando aberto pelos outros botões).
  const etapaInicial = useStore((s) => s.newCorretorEtapa);
  const etapaInicialNome = STAGES.find((s) => s.id === etapaInicial)?.nome;
  const setSelectedCorretor = useStore((s) => s.setSelectedCorretor);
  const users = useStore((s) => s.users);
  const currentUser = useStore((s) => s.currentUser);
  // SDR que cadastra entra sempre como o responsável SDR do próprio card (o backend força isso).
  const isSdr = currentUser?.cargo === 'SDR';
  const sdrUsers = users.filter((u) => u.cargo === 'SDR' && u.ativo);
  const canaisOrigem = useStore((s) => s.canaisOrigem).filter((c) => c.ativo);
  const tiposInteresseOptions = useStore((s) => s.tiposInteresseOptions).filter((t) => t.ativo);
  const imobiliariasOptions = useStore((s) => s.imobiliariasOptions).filter((i) => i.ativo);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  // Um país para o cadastro inteiro: telefone e WhatsApp da mesma pessoa são do mesmo lugar.
  const [paisTelefone, setPaisTelefone] = useState(PAIS_PADRAO);

  /** Troca o país e reformata o que já foi digitado, em vez de obrigar a redigitar. */
  function trocarPais(iso: string) {
    setPaisTelefone(iso);
    setTelefone((t) => (t ? maskTelefone(t, iso) : t));
    setWhatsapp((w) => (w ? maskTelefone(w, iso) : w));
  }
  const [email, setEmail] = useState('');
  const [imobiliaria, setImobiliaria] = useState('');
  const [ticketMedio, setTicketMedio] = useState('');
  const [cpf, setCpf] = useState('');
  const [creci, setCreci] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [uf, setUf] = useState('');
  const [cidade, setCidade] = useState('');
  const cidadesOptions = useCidadesPorUf(uf);
  const [canal, setCanal] = useState<CanalOrigem>('');
  // Em qual evento da agenda o corretor foi captado. Só vale quando o canal é "Evento" — o
  // mesmo desenho que o cliente final usa para rodadas.
  const [eventoAgendaId, setEventoAgendaId] = useState('');
  const [eventoRotulo, setEventoRotulo] = useState('');
  const [escolhendoEvento, setEscolhendoEvento] = useState(false);
  /**
   * Cadastro pelo caminho curto: só nome, telefone e canal de origem. Muito corretor chega com
   * pouca informação, e exigir tudo na entrada fazia o lead não ser cadastrado. Os campos que
   * ficam para depois voltam a ser obrigatórios ao mover o card para Monitoramento GV.
   */
  const [cadastroSimplificado, setCadastroSimplificado] = useState(false);

  /**
   * A comparação é pelo NOME do canal, sem acento nem caixa — e não por um id fixo, que a
   * Diretoria poderia renomear na tela de Configurações e quebrar isto em silêncio. Mesmo
   * critério que o cadastro de cliente final usa para "Rodada".
   */
  const canalEhEvento = canal
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .includes('evento');

  // Trocar para um canal que não é evento não pode deixar o vínculo velho para trás.
  useEffect(() => {
    if (!canalEhEvento && eventoAgendaId) { setEventoAgendaId(''); setEventoRotulo(''); }
  }, [canalEhEvento, eventoAgendaId]);
  const [responsavelSDRId, setResponsavelSDRId] = useState(isSdr ? currentUser?.id ?? '' : '');
  const [interesses, setInteresses] = useState<TipoInteresse[]>([]);
  const [possuiInvestidores, setPossuiInvestidores] = useState(false);
  const [potencialParceria, setPotencialParceria] = useState(false);
  const [treinamento, setTreinamento] = useState(false);
  const [naoDesejaTreinamento, setNaoDesejaTreinamento] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [imobiliariaMatches, setImobiliariaMatches] = useState<ImobiliariaMatch[]>([]);

  useEffect(() => {
    if (!canal && canaisOrigem.length > 0) setCanal(canaisOrigem[0].nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canaisOrigem]);

  async function handleImobiliariaChange(nome: string) {
    setImobiliaria(nome);
    setImobiliariaMatches([]);
    if (!nome.trim()) return;
    try {
      const { existentes } = await corretoresApi.checkImobiliaria(nome.trim());
      setImobiliariaMatches(existentes);
    } catch {
      // checagem é apenas informativa — falha silenciosa não deve travar o cadastro
    }
  }

  function toggleInteresse(id: TipoInteresse) {
    setInteresses((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (!canal) e.canal = 'Canal de origem é obrigatório';
    // Sem isto o corretor ficaria com o canal "Evento" e nenhum evento — some do retorno de
    // todos eles e ninguém entende por quê.
    if (canalEhEvento && !eventoAgendaId) e.evento = 'Escolha em qual evento o corretor foi captado';
    // No cadastro simplificado estes quatro ficam para depois — o backend aplica a mesma regra.
    if (!cadastroSimplificado) {
      if (!imobiliaria.trim()) e.imobiliaria = 'Imobiliária é obrigatória';
      if (!cpf.trim()) e.cpf = 'CPF é obrigatório';
      if (!creci.trim()) e.creci = 'CRECI é obrigatório';
      if (!dataNascimento) e.dataNascimento = 'Data de nascimento é obrigatória';
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      const id = await addCorretor({
        nomeCorretor: nome.trim(),
        telefoneCorretor: telefone.trim(),
        whatsappCorretor: whatsapp.trim() || telefone.trim(),
        paisTelefone,
        emailCorretor: email.trim(),
        imobiliaria: imobiliaria.trim(),
        ticketMedio: ticketMedio ? parseCurrencyBRL(ticketMedio) : undefined,
        cpf: cpf.trim() || undefined,
        creci: creci.trim() || undefined,
        dataNascimento: dataNascimento || undefined,
        cidade: cidade.trim() || undefined,
        uf: uf || undefined,
        canalOrigem: canal,
        cadastroSimplificado,
        eventoAgendaId: canalEhEvento && eventoAgendaId ? eventoAgendaId : null,
        responsavelSDRId: responsavelSDRId || undefined,
        tiposInteresse: interesses,
        possuiInvestidores,
        potencialParceria,
        treinamento,
        naoDesejaTreinamento,
        observacoes: observacoes.trim(),
      });

      // O backend sempre cria o corretor na etapa 1; a etapa da coluna clicada é aplicada logo
      // depois pelo mesmo endpoint de mover (com as mesmas validações de campos obrigatórios).
      // Se a etapa exigir algo que o cadastro não tem (ex.: GR/GV na etapa 5), o corretor já foi
      // criado — só avisa o que falta, e o painel dele abre em seguida para completar.
      if (etapaInicial !== 1 && etapaInicialNome) {
        try {
          await moveCorretor(id, etapaInicial);
        } catch (err) {
          const campos = err instanceof ApiError && Array.isArray((err.details as { campos?: unknown } | undefined)?.campos)
            ? ((err.details as { campos: string[] }).campos).join(', ')
            : '';
          showToast(
            `Corretor criado em "Novo Corretor". Não foi possível movê-lo para "${etapaInicialNome}"${campos ? ` — falta: ${campos}` : err instanceof ApiError ? ` — ${err.message}` : ''}.`,
            'error'
          );
        }
      }

      setShowNewCorretorModal(false);
      setSelectedCorretor(id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível criar o corretor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowNewCorretorModal(false); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <User size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">Novo Corretor</h2>
              <p className="text-xs text-gray-400">
                {etapaInicial !== 1 && etapaInicialNome
                  ? <>Será adicionado em <strong className="text-gray-600">{etapaInicialNome}</strong></>
                  : cadastroSimplificado
                    ? 'Só o essencial — o resto fica para depois'
                    : 'Preencha os dados do corretor'}
              </p>
            </div>
          </div>
          <button onClick={() => setShowNewCorretorModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
          {/* A flag fica no topo porque muda o que o resto do formulário exige — descobrir isso
              só ao tentar salvar seria trabalho perdido. */}
          <label
            className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
            style={{
              borderColor: cadastroSimplificado ? '#d55006' : '#e5e7eb',
              backgroundColor: cadastroSimplificado ? '#fff7ed' : '#fafafa',
            }}
          >
            <input
              type="checkbox"
              className="mt-0.5 flex-shrink-0"
              checked={cadastroSimplificado}
              onChange={(e) => {
                setCadastroSimplificado(e.target.checked);
                // Limpa os erros dos campos que acabaram de deixar de ser obrigatórios.
                if (e.target.checked) {
                  setErrors((atuais) => ({
                    ...atuais, imobiliaria: '', cpf: '', creci: '', dataNascimento: '',
                  }));
                }
              }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-800">Cadastro simplificado</span>
              <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
                Cadastra com o que você tem agora: nome, telefone e canal de origem.
                Imobiliária, CPF, CRECI e data de nascimento ficam para depois — mas passam a
                ser obrigatórios para mover o card até <strong>Monitoramento GV</strong>.
              </span>
            </span>
          </label>

          {/* Corretor */}
          <FormSection title="Dados do Corretor" icon={<Building2 size={14} style={{ color: '#d55006' }} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormLabel required>Nome completo</FormLabel>
                <input
                  className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
                  placeholder="Nome do corretor"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); setErrors((er) => ({ ...er, nome: '' })); }}
                />
                {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
              </div>
              <div>
                <FormLabel required>Telefone</FormLabel>
                <TelefoneInput
                  valor={telefone}
                  onChange={(v) => { setTelefone(v); setErrors((er) => ({ ...er, telefone: '' })); }}
                  pais={paisTelefone}
                  onPaisChange={trocarPais}
                  erro={Boolean(errors.telefone)}
                />
                {errors.telefone && <p className="text-xs text-red-500 mt-1">{errors.telefone}</p>}
              </div>
              <div>
                <FormLabel>WhatsApp</FormLabel>
                <TelefoneInput valor={whatsapp} onChange={setWhatsapp} pais={paisTelefone} onPaisChange={trocarPais} />
              </div>
              <div>
                <FormLabel>E-mail</FormLabel>
                <input
                  className="form-input"
                  placeholder="email@imobiliaria.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <FormLabel required={!cadastroSimplificado}>Imobiliária</FormLabel>
                <select
                  className={`form-input ${errors.imobiliaria ? 'border-red-400' : ''}`}
                  value={imobiliaria}
                  onChange={(e) => { handleImobiliariaChange(e.target.value); setErrors((er) => ({ ...er, imobiliaria: '' })); }}
                >
                  <option value="">Selecionar...</option>
                  {imobiliariasOptions.map((i) => <option key={i.id} value={i.nome}>{i.nome}</option>)}
                </select>
                {errors.imobiliaria && <p className="text-xs text-red-500 mt-1">{errors.imobiliaria}</p>}
              </div>
              {imobiliariaMatches.length > 0 && (
                <div
                  className="sm:col-span-2 rounded-xl border px-3 py-2.5 flex items-start gap-2"
                  style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
                >
                  <AlertTriangle size={15} style={{ color: '#b45309', flexShrink: 0, marginTop: 1 }} />
                  <div className="text-xs" style={{ color: '#92400e' }}>
                    <p className="font-semibold mb-1">Esta imobiliária já tem corretor(es) cadastrado(s):</p>
                    <ul className="space-y-0.5">
                      {imobiliariaMatches.map((m) => (
                        <li key={m.id}>
                          <strong>{m.nomeCorretor}</strong> — cadastrado na base de {responsavelLabel(m)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div>
                <FormLabel>Ticket médio</FormLabel>
                <input
                  className="form-input"
                  placeholder="R$ 0,00"
                  inputMode="numeric"
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(maskCurrencyBRLInput(e.target.value))}
                />
              </div>
              <div>
                <FormLabel required={!cadastroSimplificado}>CPF</FormLabel>
                <input
                  className={`form-input ${errors.cpf ? 'border-red-400' : ''}`}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                  value={cpf}
                  onChange={(e) => { setCpf(maskCPF(e.target.value)); setErrors((er) => ({ ...er, cpf: '' })); }}
                />
                {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
              </div>
              <div>
                <FormLabel required={!cadastroSimplificado}>CRECI</FormLabel>
                <input
                  className={`form-input ${errors.creci ? 'border-red-400' : ''}`}
                  placeholder="Ex: 123456-F"
                  value={creci}
                  onChange={(e) => { setCreci(e.target.value); setErrors((er) => ({ ...er, creci: '' })); }}
                />
                {errors.creci && <p className="text-xs text-red-500 mt-1">{errors.creci}</p>}
              </div>
              <div>
                <FormLabel required={!cadastroSimplificado}>Data de nascimento</FormLabel>
                <input
                  type="date"
                  className={`form-input ${errors.dataNascimento ? 'border-red-400' : ''}`}
                  value={dataNascimento}
                  onChange={(e) => { setDataNascimento(e.target.value); setErrors((er) => ({ ...er, dataNascimento: '' })); }}
                />
                {errors.dataNascimento && <p className="text-xs text-red-500 mt-1">{errors.dataNascimento}</p>}
              </div>
              <div>
                <FormLabel>Estado</FormLabel>
                <select
                  className="form-input"
                  value={uf}
                  onChange={(e) => { setUf(e.target.value); setCidade(''); }}
                >
                  <option value="">Selecionar...</option>
                  {UF_OPTIONS.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Cidade</FormLabel>
                <Combobox
                  value={cidade}
                  onChange={setCidade}
                  options={cidadesOptions.map((c) => ({ id: c, label: c }))}
                  placeholder={uf ? 'Buscar cidade...' : 'Selecione o estado primeiro'}
                  disabled={!uf}
                />
              </div>
            </div>
          </FormSection>

          {/* Pipeline */}
          <FormSection title="Pipeline & Qualificação" icon={<Tag size={14} style={{ color: '#d55006' }} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel required>Canal de origem</FormLabel>
                <select
                  className={`form-input ${errors.canal ? 'border-red-400' : ''}`}
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as CanalOrigem)}
                >
                  {canaisOrigem.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
                {/* Canal "Evento": qual evento. Aparece só aí, para não poluir os outros casos. */}
                {canalEhEvento && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setEscolhendoEvento(true)}
                      className={`form-input text-left flex items-center gap-2 ${errors.evento ? 'border-red-400' : ''}`}
                      style={{ color: eventoAgendaId ? '#111827' : '#9ca3af' }}
                    >
                      <CalendarPlus size={14} className="flex-shrink-0" style={{ color: '#d55006' }} />
                      <span className="truncate">
                        {eventoAgendaId ? (eventoRotulo || 'Evento selecionado') : 'Escolher o evento...'}
                      </span>
                    </button>
                    {errors.evento && <p className="text-xs text-red-500 mt-1">{errors.evento}</p>}
                  </div>
                )}
              </div>
              <div>
                <FormLabel>SDR Responsável</FormLabel>
                <select className="form-input" value={responsavelSDRId} onChange={(e) => setResponsavelSDRId(e.target.value)} disabled={isSdr}>
                  <option value="">Selecionar...</option>
                  {sdrUsers.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Interesses */}
            <div className="mt-3">
              <FormLabel>Tipos de interesse</FormLabel>
              <div className="flex flex-wrap gap-2 mt-1">
                {tiposInteresseOptions.map(({ id, nome }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleInteresse(nome)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      interesses.includes(nome) ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={interesses.includes(nome) ? { backgroundColor: '#d55006', borderColor: '#d55006' } : {}}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualificação booleans */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {[
                { label: 'Possui investidores', value: possuiInvestidores, set: setPossuiInvestidores },
                { label: 'Potencial +2.5M', value: potencialParceria, set: setPotencialParceria },
                // Respostas opostas à mesma pergunta: marcar uma desmarca a outra.
                {
                  label: 'No treinamento',
                  value: treinamento,
                  set: (v: boolean) => { setTreinamento(v); if (v) setNaoDesejaTreinamento(false); },
                },
                {
                  label: 'Não deseja treinamento',
                  value: naoDesejaTreinamento,
                  set: (v: boolean) => { setNaoDesejaTreinamento(v); if (v) setTreinamento(false); },
                },
              ].map(({ label, value, set }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set(!value)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    value ? 'text-white border-transparent' : 'text-gray-600 border-gray-200'
                  }`}
                  style={value ? { backgroundColor: '#059669', borderColor: '#059669' } : {}}
                >
                  {value ? '✓ ' : ''}{label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Observações */}
          <FormSection title="Observações" icon={<Mail size={14} style={{ color: '#d55006' }} />}>
            <textarea
              className="form-input resize-none"
              style={{ minHeight: 72 }}
              placeholder="Informações adicionais sobre o corretor..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </FormSection>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={() => setShowNewCorretorModal(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#d55006' }}
          >
            {submitting ? 'Criando...' : 'Criar Corretor'}
            {!submitting && <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {escolhendoEvento && (
        <EventoPickerModal
          selecionadoId={eventoAgendaId || null}
          onSelect={({ id, rotulo }) => {
            setEventoAgendaId(id);
            setEventoRotulo(rotulo);
            setEscolhendoEvento(false);
            setErrors((atuais) => ({ ...atuais, evento: '' }));
          }}
          onClose={() => setEscolhendoEvento(false)}
        />
      )}
    </div>
  );
}

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      </div>
      <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }}>
        {children}
      </div>
    </div>
  );
}

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-gray-600 mb-1 block">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { X, User, Search, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import type { ClienteFinalComContexto } from '../store';
import type { CanalOrigem } from '../types';
import { mensagemDeErro } from '../api/client';
import { maskCurrencyBRLInput, parseCurrencyBRL, formatCurrencyBRL, getInitials, maskCPF } from '../utils';
import { PAIS_PADRAO, PAISES, maskTelefone } from '../lib/paises';
import { TelefoneInput } from './TelefoneInput';
import { RodadaPickerModal, rotuloDaRodada } from './RodadaPickerModal';
import { UF_OPTIONS } from '../lib/ibge';
import { useEstados, useCidades, ehBrasil } from '../lib/localidades';
import { Combobox } from './Combobox';

interface NewClienteModalProps {
  onClose: () => void;
  onCreated?: (corretorId: string) => void;
  /** Presente = modo edição (dados + corretor responsável de um cliente já existente). */
  cliente?: ClienteFinalComContexto;
  /**
   * Em modo criação, já deixa esse corretor selecionado — usado ao abrir o modal pelo card
   * do Pipeline / painel do corretor, onde o responsável já está definido pelo contexto.
   */
  corretorId?: string;
}

export function NewClienteModal({ onClose, onCreated, cliente, corretorId: initialCorretorId }: NewClienteModalProps) {
  const isEdit = Boolean(cliente);
  // Ao editar um cliente já existente, o modal abre TRAVADO (só leitura) — clicar em "Editar"
  // libera os campos. Ao criar um novo, já abre liberado.
  const [editing, setEditing] = useState(!isEdit);
  const corretores = useStore((s) => s.corretores);
  const canaisOrigem = useStore((s) => s.canaisOrigem);
  const addClienteFinal = useStore((s) => s.addClienteFinal);
  const updateClienteFinal = useStore((s) => s.updateClienteFinal);

  const corretorOptions = useMemo(
    () =>
      corretores
        .filter((c) => c.status !== 'arquivado' && c.status !== 'perdido')
        .sort((a, b) => a.nomeCorretor.localeCompare(b.nomeCorretor)),
    [corretores]
  );

  const [corretorSearch, setCorretorSearch] = useState('');
  const [corretorId, setCorretorId] = useState(cliente?.corretorId ?? initialCorretorId ?? '');

  const [nome, setNome] = useState(cliente?.nome ?? '');
  // Guardado mascarado enquanto se digita; os dígitos são extraídos só no envio.
  const [cpf, setCpf] = useState(cliente?.cpf ? maskCPF(cliente.cpf) : '');
  const [paisTelefone, setPaisTelefone] = useState(cliente?.paisTelefone ?? PAIS_PADRAO);
  const [dataNascimento, setDataNascimento] = useState(cliente?.dataNascimento ?? '');
  const [telefone, setTelefone] = useState(
    cliente ? maskTelefone(cliente.telefone, cliente.paisTelefone) : ''
  );

  /** Troca o país e reformata o número já digitado, em vez de obrigar a redigitar. */
  function trocarPais(iso: string) {
    setPaisTelefone(iso);
    setTelefone((t) => (t ? maskTelefone(t, iso) : t));
  }
  const [email, setEmail] = useState(cliente?.email ?? '');
  // País de RESIDÊNCIA, separado do país do telefone: um brasileiro que mora em Portugal tem
  // telefone +55 e endereço português.
  const [pais, setPais] = useState(cliente?.pais ?? PAIS_PADRAO);
  const [uf, setUf] = useState(cliente?.uf ?? '');
  const [cidade, setCidade] = useState(cliente?.cidade ?? '');
  const estadosOptions = useEstados(pais);
  const cidadesOptions = useCidades(pais, uf);
  const noBrasil = ehBrasil(pais);

  /** Trocar de país invalida estado e cidade: "SC" não existe em Portugal. */
  function trocarPaisResidencia(iso: string) {
    setPais(iso);
    setUf('');
    setCidade('');
  }
  const [interesse, setInteresse] = useState(cliente?.interesse ?? '');
  const [canalOrigem, setCanalOrigem] = useState<CanalOrigem>(cliente?.canalOrigem ?? '');
  const [rodadaId, setRodadaId] = useState<string>(cliente?.rodadaId ?? '');
  const [rodadaRotulo, setRodadaRotulo] = useState('');
  const [mostrarRodadas, setMostrarRodadas] = useState(false);

  /**
   * O canal "Rodada" é uma linha da tabela de canais, editável em Configurações — então a
   * comparação é pelo nome, sem diferenciar maiúscula/acento, em vez de um id fixo que a
   * Diretoria poderia renomear e quebrar silenciosamente.
   */
  const canalEhRodada = canalOrigem
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .includes('rodada');

  /** Ao abrir um cliente já vinculado, mostra qual é a rodada em vez de só o id. */
  const rodadasCarregadas = useStore((s) => s.rodadas);
  useEffect(() => {
    if (!rodadaId) { setRodadaRotulo(''); return; }
    const r = rodadasCarregadas.find((x) => x.id === rodadaId);
    if (r) setRodadaRotulo(rotuloDaRodada(r));
  }, [rodadaId, rodadasCarregadas]);

  // Trocar para um canal que não é rodada não pode deixar o vínculo velho para trás.
  useEffect(() => {
    if (!canalEhRodada && rodadaId) setRodadaId('');
  }, [canalEhRodada, rodadaId]);
  const [orcamento, setOrcamento] = useState(cliente?.orcamento ? formatCurrencyBRL(cliente.orcamento) : '');
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const filteredCorretores = useMemo(() => {
    if (!corretorSearch) return corretorOptions;
    const q = corretorSearch.toLowerCase();
    return corretorOptions.filter(
      (c) => c.nomeCorretor.toLowerCase().includes(q) || c.imobiliaria.toLowerCase().includes(q)
    );
  }, [corretorOptions, corretorSearch]);

  // Busca na lista completa (não só nas opções filtradas) pra um corretor pré-selecionado
  // pelo contexto — ex.: card arquivado/perdido — ainda aparecer como selecionado.
  const selectedCorretor = corretores.find((c) => c.id === corretorId);

  // Se o canal gravado no cliente já não existe mais na lista (foi renomeado/excluído em
  // Configurações da Empresa), ele entra como opção mesmo assim: sem isso o select abriria
  // vazio e salvar o cliente apagaria o valor antigo sem ninguém perceber.
  const canalOptions = useMemo(() => {
    const nomes = canaisOrigem.map((c) => c.nome);
    return canalOrigem && !nomes.includes(canalOrigem) ? [...nomes, canalOrigem] : nomes;
  }, [canaisOrigem, canalOrigem]);

  function validate() {
    const e: Record<string, string> = {};
    if (!corretorId) e.corretor = 'Selecione o corretor responsável';
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!telefone.trim()) e.telefone = 'Telefone é obrigatório';
    // O CPF é opcional, mas pela metade não serve: não identifica ninguém e ainda entraria na
    // checagem de cliente duplicado como se identificasse. Avisar aqui evita mandar o
    // formulário inteiro para voltar com erro do servidor.
    const cpfDigitos = cpf.replace(/\D/g, '');
    if (cpfDigitos.length > 0 && cpfDigitos.length < 11) e.cpf = 'CPF incompleto — são 11 dígitos';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const data = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      // Só os dígitos, e `null` quando em branco — mesmo motivo da data de nascimento abaixo:
      // na edição, `undefined` sai do JSON e o CPF antigo ficaria lá.
      cpf: cpf.replace(/\D/g, '') || null,
      paisTelefone,
      // `null` e não `undefined` quando em branco: na EDIÇÃO, `undefined` é omitido do JSON e
      // o backend manteria a data antiga — não haveria como apagar uma data digitada errada.
      dataNascimento: dataNascimento || null,
      email: email.trim() || undefined,
      pais,
      cidade: cidade.trim() || undefined,
      uf: uf.trim() || undefined,
      interesse: interesse.trim(),
      orcamento: orcamento ? parseCurrencyBRL(orcamento) : undefined,
      observacoes: observacoes.trim() || undefined,
      canalOrigem: canalOrigem || undefined,
      rodadaId: canalEhRodada && rodadaId ? rodadaId : null,
    };
    try {
      if (cliente) {
        await updateClienteFinal(cliente.corretorId, cliente.id, data, corretorId);
      } else {
        await addClienteFinal(corretorId, data);
      }
      onCreated?.(corretorId);
      onClose();
    } catch (err) {
      // mensagemDeErro acrescenta QUAIS campos o servidor recusou — antes a tela mostrava só
      // "Dados inválidos" e não dava para saber o que corrigir.
      setSubmitError(
        mensagemDeErro(err, `Não foi possível ${isEdit ? 'salvar' : 'cadastrar'} o cliente. Tente novamente.`)
      );
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 sm:mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fff7ed' }}>
              <User size={18} style={{ color: '#d55006' }} />
            </div>
            <div>
              <h2 className="font-questrial font-bold text-lg text-gray-900">
                {!isEdit ? 'Novo Cliente' : editing ? 'Editar Cliente' : 'Cliente'}
              </h2>
              <p className="text-xs text-gray-400">
                {!isEdit
                  ? 'Cadastre o cliente e vincule a um corretor'
                  : editing
                    ? 'Atualize os dados e o corretor responsável'
                    : 'Clique em "Editar" para alterar os dados'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body — o scroll fica no div; o fieldset é só um bloco pra travar os campos (fieldset
            como flex-item com overflow tem bug de render e "vaza" pra fora do modal). */}
        <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
        <fieldset disabled={!editing} className="border-0 m-0 p-0 min-w-0 space-y-5">
          {/* Corretor */}
          <FormSection title="Corretor responsável">
            {selectedCorretor ? (
              <div
                className="flex items-center gap-3 p-2.5 rounded-xl border"
                style={{ borderColor: '#d55006', backgroundColor: '#fff7ed' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                  {getInitials(selectedCorretor.nomeCorretor)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedCorretor.nomeCorretor}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedCorretor.imobiliaria || 'Sem imobiliária'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCorretorId('')}
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: '#d55006' }}
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    className={`form-input ${errors.corretor ? 'border-red-400' : ''}`}
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Buscar corretor ou imobiliária..."
                    value={corretorSearch}
                    onChange={(e) => { setCorretorSearch(e.target.value); setErrors((er) => ({ ...er, corretor: '' })); }}
                  />
                </div>
                <div className="border rounded-xl overflow-y-auto" style={{ borderColor: errors.corretor ? '#f87171' : '#e5e7eb', maxHeight: 180 }}>
                  {filteredCorretores.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">Nenhum corretor encontrado.</p>
                  )}
                  {filteredCorretores.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCorretorId(c.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition-colors text-left"
                      style={{ borderColor: '#f3f4f6' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 font-questrial" style={{ backgroundColor: '#d55006' }}>
                        {getInitials(c.nomeCorretor)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{c.nomeCorretor}</p>
                        <p className="text-xs text-gray-400 truncate">{c.imobiliaria || 'Sem imobiliária'}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.corretor && <p className="text-xs text-red-500 mt-1">{errors.corretor}</p>}
              </div>
            )}
          </FormSection>

          {/* Cliente */}
          <FormSection title="Dados do Cliente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormLabel required>Nome completo</FormLabel>
                <input
                  className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
                  placeholder="Nome do cliente"
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
                <FormLabel>E-mail</FormLabel>
                <input
                  className="form-input"
                  placeholder="email@exemplo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {/* CPF e data de nascimento lado a lado: são os dois dados de documento do
                  comprador, e pareá-los deixa Estado e Cidade juntos na linha seguinte. */}
              <div>
                <FormLabel>CPF</FormLabel>
                <input
                  className={`form-input ${errors.cpf ? 'border-red-400' : ''}`}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpf}
                  onChange={(e) => { setCpf(maskCPF(e.target.value)); setErrors((er) => ({ ...er, cpf: '' })); }}
                />
                {errors.cpf
                  ? <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>
                  : <p className="text-xs text-gray-400 mt-1">Ajuda a identificar o mesmo cliente trazido por dois corretores.</p>}
              </div>
              <div>
                <FormLabel>Data de nascimento</FormLabel>
                <input
                  className="form-input"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Preenchida, o aniversário aparece na Agenda.
                </p>
              </div>
              <div>
                <FormLabel>País</FormLabel>
                <select
                  className="form-input"
                  value={pais}
                  onChange={(e) => trocarPaisResidencia(e.target.value)}
                >
                  {PAISES.map((p) => (
                    <option key={p.iso} value={p.iso}>{p.bandeira} {p.nome}</option>
                  ))}
                </select>
              </div>
              {/* No Brasil, as 27 UFs numa lista fechada, como sempre foi. Fora dele, os estados
                  vêm de uma API pública e o campo aceita texto livre: a lista é sugestão, e um
                  serviço de terceiro fora do ar não pode impedir o cadastro. */}
              <div>
                <FormLabel>{noBrasil ? 'Estado' : 'Estado / Província'}</FormLabel>
                {noBrasil ? (
                  <select
                    className="form-input"
                    value={uf}
                    onChange={(e) => { setUf(e.target.value); setCidade(''); }}
                  >
                    <option value="">Selecionar...</option>
                    {UF_OPTIONS.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome}</option>)}
                  </select>
                ) : (
                  <Combobox
                    value={uf}
                    onChange={(v) => { setUf(v); setCidade(''); }}
                    options={estadosOptions.map((e) => ({ id: e.valor, label: e.label }))}
                    placeholder="Buscar ou digitar..."
                  />
                )}
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
                {!noBrasil && (
                  <p className="text-xs text-gray-400 mt-1">
                    Fora do Brasil os nomes vêm em inglês. Não achou? Pode digitar.
                  </p>
                )}
              </div>
              <div>
                <FormLabel>Orçamento</FormLabel>
                <input
                  className="form-input"
                  placeholder="R$ 0,00"
                  inputMode="numeric"
                  value={orcamento}
                  onChange={(e) => setOrcamento(maskCurrencyBRLInput(e.target.value))}
                />
              </div>
              <div>
                <FormLabel>Interesse / Tipo de imóvel</FormLabel>
                <input
                  className="form-input"
                  placeholder="Ex: Apartamento 3 quartos"
                  value={interesse}
                  onChange={(e) => setInteresse(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FormLabel>Canal de origem</FormLabel>
                <select
                  className="form-input"
                  value={canalOrigem}
                  onChange={(e) => setCanalOrigem(e.target.value as CanalOrigem)}
                >
                  <option value="">Selecionar...</option>
                  {canalOptions.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                </select>
              </div>

              {/* Canal "Rodada" pede a rodada: é o que liga o cliente captado à ação que o gerou. */}
              {canalEhRodada && (
                <div className="sm:col-span-2">
                  <FormLabel>Rodada de origem</FormLabel>
                  <button
                    type="button"
                    onClick={() => setMostrarRodadas(true)}
                    className="form-input text-left flex items-center justify-between gap-2"
                    style={{ color: rodadaId ? '#111827' : '#9ca3af' }}
                  >
                    <span className="truncate">
                      {rodadaId ? (rodadaRotulo || 'Rodada selecionada') : 'Escolher a rodada...'}
                    </span>
                    <ChevronRight size={14} className="flex-shrink-0 text-gray-400" />
                  </button>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Só rodadas aprovadas aparecem na lista.
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <FormLabel>Observações</FormLabel>
                <textarea
                  className="form-input resize-none"
                  style={{ minHeight: 72 }}
                  placeholder="Contexto adicional..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>
            </div>
          </FormSection>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
        </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl" style={{ borderColor: '#e5e7eb' }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {editing ? 'Cancelar' : 'Fechar'}
          </button>
          {editing ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#d55006' }}
            >
              {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              {!submitting && <ChevronRight size={16} />}
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#d55006' }}
            >
              Editar
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {mostrarRodadas && (
        <RodadaPickerModal
          selecionadaId={rodadaId || null}
          onSelect={({ id, rotulo }) => { setRodadaId(id); setRodadaRotulo(rotulo); setMostrarRodadas(false); }}
          onClose={() => setMostrarRodadas(false)}
        />
      )}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{title}</h3>
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

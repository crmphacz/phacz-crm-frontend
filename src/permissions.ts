import type { UserCargo, UserProfile, Corretor } from './types';
import type { ViewMode } from './store';

/**
 * Camada central de RBAC do frontend — espelha exatamente as regras aplicadas no backend
 * (ver src/lib/permissions.ts na API). Toda checagem de "esse perfil pode fazer X" deve vir
 * daqui, em vez de `cargo === 'Marketing'` espalhado pelos componentes.
 *
 * IMPORTANTE: isso só controla o que a interface mostra/permite clicar. A segurança de
 * verdade está sempre no backend — essas funções nunca substituem o bloqueio da API.
 */

/** Perfis com leitura irrestrita em todo o sistema — nunca escrevem em nada. */
export const READ_ONLY_GLOBAL_CARGOS: UserCargo[] = ['Administrativo', 'Recepcao'];

export function isGlobalReadOnly(user: UserProfile | null): boolean {
  return !!user && READ_ONLY_GLOBAL_CARGOS.includes(user.cargo);
}

/**
 * "Kanban próprio": SDR só edita corretores em que é o responsável SDR, GV (perfil "GRV")
 * só os em que é o responsável GV, GR (perfil "Gerente de Relacionamento") só os em que é
 * o responsável GR. Diretoria sempre pode. Os demais perfis nunca escrevem em corretores.
 */
export function canWriteCorretor(user: UserProfile | null, corretor: Corretor): boolean {
  if (!user) return false;
  switch (user.cargo) {
    case 'Diretora':
      return true;
    case 'SDR':
      return corretor.responsavelSDRId === user.id;
    case 'GV':
      return corretor.responsavelGVId === user.id;
    case 'GR':
      return corretor.responsavelGRId === user.id;
    default:
      return false;
  }
}

/** Criar leads: Diretoria, GR e GV. SDR só altera dentro do próprio kanban, não cria. */
export function canCreateCorretor(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.cargo === 'Diretora' || user.cargo === 'GR' || user.cargo === 'GV';
}

/** Regra global sem exceções: só a Diretoria exclui leads, clientes ou cards de kanban. */
export function canDeleteLeadClienteOuCard(user: UserProfile | null): boolean {
  return user?.cargo === 'Diretora';
}

/** Agenda de aniversários: todos os perfis visualizam; só a Diretoria envia a mensagem de parabéns. */
export function canSendAniversario(user: UserProfile | null): boolean {
  return user?.cargo === 'Diretora';
}

/** Calendário de Rodadas: Diretoria e GR criam/editam. Exclusão continua só com a Diretoria. */
export function canWriteRodadas(user: UserProfile | null): boolean {
  return user?.cargo === 'Diretora' || user?.cargo === 'GR';
}

/** Quem enxerga o calendário (mesmo que só em modo leitura). Marketing não tem esse módulo. */
export function canViewRodadas(user: UserProfile | null): boolean {
  return !!user && user.cargo !== 'Marketing';
}

/**
 * Diretoria e GR veem o formulário completo da rodada (as 11 seções) — GR também cria/edita
 * rodadas (ver `canWriteRodadas`), então precisa do formulário inteiro. Os demais perfis com
 * acesso ao calendário (Administrativo, Recepção, SDR, GV) só veem o resumo — dia, corretor
 * parceiro, imobiliária e cidade/UF. Espelha `canViewFullRodada` no backend; a API já retorna
 * só os campos permitidos (ver `RodadaResumo`), isto só decide qual modal abrir.
 */
export function canViewFullRodada(user: UserProfile | null): boolean {
  return user?.cargo === 'Diretora' || user?.cargo === 'GR';
}

/** E-mail marketing: só Diretoria e Marketing usam a ferramenta (Administrativo/Recepção só leem). */
export function canWriteEmailMarketing(user: UserProfile | null): boolean {
  return user?.cargo === 'Diretora' || user?.cargo === 'Marketing';
}

/**
 * Disparo de WhatsApp para um CORRETOR (parceiro do funil). Espelha `canWhatsappCorretor` no
 * backend: Diretoria e Marketing mandam para qualquer corretor; SDR/GV/GR só para os do
 * próprio kanban; Administrativo/Recepção nunca. O envio sai pelo número da Meta do próprio
 * usuário (ver `whatsappNumeroExibicao`).
 */
export function canWhatsappCorretor(user: UserProfile | null, corretor: Corretor): boolean {
  if (!user) return false;
  if (user.cargo === 'Diretora' || user.cargo === 'Marketing') return true;
  return canWriteCorretor(user, corretor);
}

/**
 * Disparo de WhatsApp para um CLIENTE FINAL. Espelha `canWhatsappCliente` no backend:
 * Diretoria manda para qualquer cliente; Marketing e Recepção só para clientes que JÁ
 * COMPRARAM; os demais perfis não mandam para cliente.
 */
export function canWhatsappCliente(user: UserProfile | null, comprou: boolean): boolean {
  if (!user) return false;
  if (user.cargo === 'Diretora') return true;
  if (user.cargo === 'Marketing' || user.cargo === 'Recepcao') return comprou;
  return false;
}

/**
 * Visibilidade de cada aba do menu, por perfil. Só os módulos explicitamente listados no
 * RBAC (clientes, corretores, kanban, calendário de rodadas, e-mail marketing) são
 * restringidos aqui; os demais (dashboard, empreendimentos, indicadores, config, IA) ficam
 * fora do escopo desse RBAC e continuam abertos como já eram.
 */
export function canAccessView(user: UserProfile | null, view: ViewMode): boolean {
  if (!user) return false;
  if (user.cargo === 'Diretora' || READ_ONLY_GLOBAL_CARGOS.includes(user.cargo)) return true;

  switch (view) {
    case 'pipeline':
      // Marketing não tem acesso a kanban; SDR/GV/GR têm (com posse por card).
      return user.cargo !== 'Marketing';
    case 'corretores':
    case 'clientes':
      return user.cargo === 'Marketing';
    case 'rodadas':
      return user.cargo === 'SDR' || user.cargo === 'GV' || user.cargo === 'GR';
    case 'email-marketing':
      return user.cargo === 'Marketing';
    default:
      return true;
  }
}

/** Primeira tela segura para o perfil logado, usada no login/bootstrap. */
export function getDefaultView(user: UserProfile | null): ViewMode {
  if (canAccessView(user, 'pipeline')) return 'pipeline';
  if (user?.cargo === 'Marketing') return 'corretores';
  return 'pipeline';
}

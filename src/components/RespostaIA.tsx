import { useMemo } from 'react';
import { parseMarkdown, type Bloco, type Inline } from '../lib/markdown';

/**
 * Renderiza a resposta da PHACZ IA a partir da árvore de `parseMarkdown`.
 *
 * Tudo vira elemento React — nada de `dangerouslySetInnerHTML`. A resposta do modelo carrega
 * dados do CRM (nome de corretor, observação de card), então injetar HTML aqui seria executar
 * na sessão de quem está logado o que alguém digitou num formulário.
 *
 * O espaçamento é apertado de propósito: isto vive dentro de um balão de chat, não numa página
 * de artigo. Títulos e listas precisam se distinguir do corpo sem empurrar a conversa para
 * baixo a cada resposta.
 */
export function RespostaIA({ content }: { content: string }) {
  const blocos = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="space-y-2">
      {blocos.map((bloco, i) => (
        <BlocoRenderizado key={i} bloco={bloco} />
      ))}
    </div>
  );
}

function BlocoRenderizado({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'titulo': {
      // Um só tamanho para h1–h3: dentro de um balão, três escalas de título viram ruído.
      // O nível muda o peso, não o tamanho.
      const peso = bloco.nivel === 1 ? 800 : 700;
      return (
        <p
          className="text-[13px] mt-1 first:mt-0"
          style={{ fontWeight: peso, color: '#1e1e1e', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          <Inlines partes={bloco.conteudo} />
        </p>
      );
    }

    case 'lista': {
      const Tag = bloco.ordenada ? 'ol' : 'ul';
      return (
        <Tag className={`space-y-0.5 ${bloco.ordenada ? 'list-decimal' : 'list-disc'} pl-4 marker:text-gray-400`}>
          {bloco.itens.map((item, i) => (
            <li key={i} className="pl-0.5">
              <Inlines partes={item} />
            </li>
          ))}
        </Tag>
      );
    }

    case 'tabela': {
      // Coluna sem alinhamento declarado cai em 'esquerda' — tabela mal formada não pode
      // deixar células sem estilo.
      const alinhaDe = (i: number) =>
        ({ esquerda: 'left', centro: 'center', direita: 'right' } as const)[bloco.alinhamento[i] ?? 'esquerda'];
      return (
        // `overflow-x-auto` porque o balão tem largura limitada e uma tabela de muitas colunas
        // estouraria a conversa inteira em vez de rolar sozinha.
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {bloco.cabecalho.map((celula, i) => (
                  <th
                    key={i}
                    className="font-bold px-2 py-1.5 border-b-2 whitespace-nowrap"
                    style={{ borderColor: '#d55006', color: '#9a3412', textAlign: alinhaDe(i) }}
                  >
                    <Inlines partes={celula} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloco.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((celula, j) => (
                    <td
                      key={j}
                      className="px-2 py-1.5 border-b align-top"
                      style={{ borderColor: '#f3f4f6', textAlign: alinhaDe(j) }}
                    >
                      <Inlines partes={celula} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'codigo':
      return (
        <pre
          className="text-xs rounded-lg px-3 py-2 overflow-x-auto"
          style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', color: '#334155' }}
        >
          <code>{bloco.valor}</code>
        </pre>
      );

    default:
      return (
        <p>
          {bloco.linhas.map((linha, i) => (
            <span key={i}>
              {i > 0 && <br />}
              <Inlines partes={linha} />
            </span>
          ))}
        </p>
      );
  }
}

function Inlines({ partes }: { partes: Inline[] }) {
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.tipo === 'forte') {
          return (
            <strong key={i} style={{ fontWeight: 700, color: '#1e1e1e' }}>
              {parte.valor}
            </strong>
          );
        }
        if (parte.tipo === 'enfase') return <em key={i}>{parte.valor}</em>;
        if (parte.tipo === 'codigo') {
          return (
            <code
              key={i}
              className="text-[12px] rounded px-1 py-0.5"
              style={{ backgroundColor: '#f1f5f9', color: '#be185d', fontFamily: 'ui-monospace, monospace' }}
            >
              {parte.valor}
            </code>
          );
        }
        return <span key={i}>{parte.valor}</span>;
      })}
    </>
  );
}

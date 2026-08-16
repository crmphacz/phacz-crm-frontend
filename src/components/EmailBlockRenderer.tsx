import { Image as ImageIcon, PlayCircle } from 'lucide-react';
import type { EmailBlock } from '../types';

export function EmailBlockRenderer({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2
          style={{
            fontSize: block.tamanho,
            color: block.cor,
            textAlign: block.alinhamento,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            margin: 0,
            fontWeight: 700,
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {block.texto || 'Título do e-mail'}
        </h2>
      );

    case 'text':
      return (
        <p
          style={{
            fontSize: block.tamanho,
            color: block.cor,
            textAlign: block.alinhamento,
            margin: 0,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {block.texto || 'Escreva o texto do seu e-mail aqui...'}
        </p>
      );

    case 'image':
      return (
        <div style={{ textAlign: block.alinhamento }}>
          {block.url ? (
            <img
              src={block.url}
              alt={block.alt}
              style={{ width: `${block.largura}%`, maxWidth: '100%', borderRadius: 10, display: 'inline-block' }}
            />
          ) : (
            <div
              className="inline-flex flex-col items-center justify-center gap-2 text-gray-400"
              style={{
                width: `${block.largura}%`,
                aspectRatio: '16 / 8',
                backgroundColor: '#f1f5f9',
                borderRadius: 10,
                border: '1px dashed #d1d5db',
              }}
            >
              <ImageIcon size={22} />
              <span className="text-xs">Nenhuma imagem selecionada</span>
            </div>
          )}
        </div>
      );

    case 'video':
      return (
        <div style={{ textAlign: block.alinhamento }}>
          {block.url ? (
            <a href={block.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', width: `${block.largura}%`, maxWidth: '100%', textDecoration: 'none' }}>
              {block.posterUrl ? (
                <>
                  <img
                    src={block.posterUrl}
                    alt={block.legenda}
                    style={{ width: '100%', display: 'block', borderRadius: 10 }}
                  />
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#d55006' }}>▶ {block.legenda || 'Assistir vídeo'}</div>
                </>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2"
                  style={{ aspectRatio: '16 / 9', backgroundColor: '#1f2937', color: '#fff', borderRadius: 10 }}
                >
                  <PlayCircle size={36} />
                  <span className="text-sm font-semibold">{block.legenda || 'Assistir vídeo'}</span>
                </div>
              )}
            </a>
          ) : (
            <div
              className="inline-flex flex-col items-center justify-center gap-2 text-gray-400"
              style={{
                width: `${block.largura}%`,
                aspectRatio: '16 / 9',
                backgroundColor: '#f1f5f9',
                borderRadius: 10,
                border: '1px dashed #d1d5db',
              }}
            >
              <PlayCircle size={22} />
              <span className="text-xs">Nenhum vídeo selecionado</span>
            </div>
          )}
        </div>
      );

    case 'button':
      return (
        <div style={{ textAlign: block.alinhamento }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: block.corFundo,
              color: block.corTexto,
              padding: '11px 26px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {block.texto || 'Clique aqui'}
          </span>
        </div>
      );

    case 'divider':
      return <hr style={{ border: 'none', borderTop: `1px solid ${block.cor}`, margin: 0 }} />;

    case 'spacer':
      return <div style={{ height: block.altura }} />;

    default:
      return null;
  }
}

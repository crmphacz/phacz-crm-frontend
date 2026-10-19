import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PhaczTour.css';
import logo from '../../images/logo-dark@2x.png';
import {
  FIM,
  MOVE,
  PASSO,
  PHACZ_TOUR_DADOS as D,
  TELA_ALTURA,
  TELA_LARGURA,
  type PhaczTourParada,
} from './phacz-tour.data';

/**
 * Tutorial animado do CRM PHACZ: percorre as telas do sistema com câmera (zoom/pan), cursor,
 * caixa de destaque + dica, barra segmentada clicável, play/pause, avançar/voltar etapa, tela
 * cheia e atalhos de teclado (Espaço, ← →).
 *
 * A animação escreve direto no DOM via refs a cada frame, sem re-render do React: são ~60
 * atualizações por segundo de transform/opacity, e passar isso por estado faria o React
 * reconciliar a árvore inteira 60 vezes por segundo à toa.
 */

type Key = number[]; // [tempo, ...valores]
interface Cena {
  ini: number;
  len: number;
  cam: Key[];
  cur: Key[];
  ps: (PhaczTourParada & { T: number })[];
}

// Linha do tempo montada uma vez, no carregamento do módulo: cada cena vira uma lista de
// keyframes de câmera e de cursor, e `ini` marca onde ela começa no tempo total.
let acc = 0;
const CENAS: Cena[] = D.paradas.map((paradas) => {
  const len = 400 + paradas.length * PASSO + 300;
  const cam: Key[] = [[0, 1, 0.5, 0.5]];
  const cur: Key[] = [[0, 0.55, 0.97]];
  const ps = paradas.map((p, k) => {
    const m = 400 + k * PASSO;
    const T = m + MOVE;
    cam.push([m, ...cam[cam.length - 1].slice(1)], [T, ...p.cam]);
    cur.push([m, ...cur[cur.length - 1].slice(1)], [T, ...p.c]);
    return { ...p, T };
  });
  const c = { ini: acc, len, cam, cur, ps };
  acc += len;
  return c;
});
const TOTAL = acc;
const INI = CENAS.map((c) => c.ini).concat([TOTAL]);
const DUR = TOTAL + FIM;
const N = CENAS.length;

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Valor interpolado dos keyframes no instante `t`, com suavização. */
function interp(k: Key[], t: number): number[] {
  if (t <= k[0][0]) return k[0].slice(1);
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const a = k[i - 1], b = k[i], d = b[0] - a[0], p = d > 0 ? ease((t - a[0]) / d) : 1;
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * p);
    }
  }
  return k[k.length - 1].slice(1);
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const cl = (x: number) => Math.max(0, Math.min(1, x));

const IconePause = () => (
  <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" fill="#fff" /><rect x="8.5" y="1" width="3.5" height="12" fill="#fff" /></svg>
);
const IconePlay = () => (
  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1 L13 7 L3 13Z" fill="#fff" /></svg>
);
const IconeAnterior = () => (
  <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="2.5" height="12" fill="#fff" /><path d="M12 1 L5 7 L12 13Z" fill="#fff" /></svg>
);
const IconeProxima = () => (
  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1 L9 7 L2 13Z" fill="#fff" /><rect x="9.5" y="1" width="2.5" height="12" fill="#fff" /></svg>
);
const IconeTelaCheia = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" />
  </svg>
);
const IconeSairTelaCheia = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 1v4H1M13 5H9V1M9 13V9h4M1 9h4v4" />
  </svg>
);

// Fullscreen API com fallback webkit (Safari). No iPhone não há fullscreen de elemento —
// nesse caso o botão nem aparece (ver telaCheiaDisponivel).
type DocFs = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenEnabled?: boolean };
type ElFs = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const elementoEmTelaCheia = () => document.fullscreenElement ?? (document as DocFs).webkitFullscreenElement ?? null;
const telaCheiaDisponivel = () =>
  typeof document !== 'undefined' && !!(document.fullscreenEnabled || (document as DocFs).webkitFullscreenEnabled);

/** Largura mínima do player — abaixo disso fica ilegível; o container rola. */
const LARGURA_MINIMA = 280;
const LARGURA_MAXIMA = 1280;

interface PhaczTourProps {
  /**
   * Faz o player caber inteiro na altura do elemento pai (sem rolagem): a largura vira o menor
   * entre a largura do pai, LARGURA_MAXIMA e o que cabe na altura dele, mantendo a proporção
   * das telas. O pai precisa ter altura definida (ex.: h-full num flex-1).
   */
  caberNaAltura?: boolean;
}

export function PhaczTour({ caberNaAltura = false }: PhaczTourProps) {
  // Quem pediu ao sistema para reduzir animações não recebe o tutorial tocando sozinho.
  const reduzMovimento = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const tempo = useRef(0);
  const tocando = useRef(!reduzMovimento);
  const [tocandoUi, setTocandoUi] = useState(tocando.current);
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  const [podeTelaCheia] = useState(telaCheiaDisponivel);
  // Prints que ainda não foram colocados em `public/phacz-tour/`. Sem isto o navegador mostra
  // o ícone de imagem quebrada e o tutorial parece defeituoso; com isto ele roda inteiro
  // (animação, controles, etapas) e cada tela diz qual print falta.
  const [telasFaltando, setTelasFaltando] = useState<Record<number, boolean>>({});

  const palcoRef = useRef<HTMLDivElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<SVGSVGElement>(null);
  const dicaRef = useRef<HTMLDivElement>(null);
  const nRef = useRef<HTMLSpanElement>(null);
  const seloNRef = useRef<HTMLSpanElement>(null);
  const seloTRef = useRef<HTMLElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const tmRef = useRef<HTMLSpanElement>(null);
  const imgsRef = useRef<(HTMLImageElement | null)[]>([]);
  const faltasRef = useRef<(HTMLDivElement | null)[]>([]);
  const segsRef = useRef<(HTMLElement | null)[]>([]);
  const cenaAtual = useRef(-1);

  const icone = () => setTocandoUi(tocando.current);
  const tocar = (v: boolean) => {
    if (v && tempo.current >= TOTAL) tempo.current = 0;
    tocando.current = v;
    icone();
  };

  /** Salta para o começo de uma cena — é o que os botões de avançar/voltar e a barra fazem. */
  const irParaCena = (i: number) => {
    tempo.current = INI[Math.max(0, Math.min(N - 1, i))];
    tocar(true);
  };

  useEffect(() => {
    const palco = palcoRef.current!, caixa = caixaRef.current!, cursor = cursorRef.current!, dica = dicaRef.current!;
    const imgs = imgsRef.current, segs = segsRef.current, faltas = faltasRef.current;

    function quadro() {
      const t = tempo.current;
      let cena = N;
      for (let i = 0; i < N; i++) if (t < INI[i + 1]) { cena = i; break; }

      // Troca de cena: só mexe no DOM "caro" (texto, classes) quando a cena realmente muda.
      if (cena !== cenaAtual.current) {
        cenaAtual.current = cena;
        const s = Math.min(cena, N - 1);
        imgs.forEach((im, i) => im?.classList.toggle('on', i === s));
        faltas.forEach((el, i) => el?.classList.toggle('on', i === s));
        nRef.current!.textContent = 'tela ' + (s + 1) + ' / ' + N;
        seloNRef.current!.textContent = String(s + 1);
        seloTRef.current!.textContent = D.leg[s];
        capRef.current!.textContent = D.paradas[s].map((p) => p.r).join('  ·  ');
        fimRef.current!.classList.toggle('on', cena === N);
      }

      segs.forEach((b, i) => { if (b) b.style.width = cl((t - INI[i]) / CENAS[i].len) * 100 + '%'; });
      tmRef.current!.textContent = fmt(Math.min(t, TOTAL)) + ' / ' + fmt(TOTAL);

      const W = palco.offsetWidth, H = palco.offsetHeight;
      let op = 0;
      if (cena < N) {
        const r = CENAS[cena], lt = t - r.ini;
        const [s, fx, fy] = interp(r.cam, lt);
        // Mantém a imagem cobrindo o palco: o deslocamento é limitado para não aparecer borda.
        const tx = Math.min(0, Math.max(1 - s, 0.5 - fx * s)), ty = Math.min(0, Math.max(1 - s, 0.5 - fy * s));
        const im = imgs[cena];
        if (im) im.style.transform = 'translate(' + tx * 100 + '%,' + ty * 100 + '%) scale(' + s + ')';

        const [cx, cy] = interp(r.cur, lt);
        cursor.style.transform = 'translate3d(' + (cx * s + tx) * W + 'px,' + (cy * s + ty) * H + 'px,0)';
        cursor.style.opacity = String(Math.min(cl(lt / 300), cl((r.len - lt) / 250)));

        // A caixa e a dica só existem durante a "demora" da parada (depois do movimento).
        const dw = PASSO - MOVE, k = r.ps.findIndex((p) => lt >= p.T && lt < p.T + dw);
        if (k >= 0) {
          const p = r.ps[k];
          op = Math.min(cl((lt - p.T) / 160), cl((p.T + dw - lt) / 160));
          const bx = (p.b[0] * s + tx) * W, by = (p.b[1] * s + ty) * H, bw = p.b[2] * s * W, bh = p.b[3] * s * H;
          caixa.style.transform = 'translate3d(' + (bx - 4) + 'px,' + (by - 4) + 'px,0)';
          caixa.style.width = bw + 8 + 'px';
          caixa.style.height = bh + 8 + 'px';
          if (dica.textContent !== p.r) dica.textContent = p.r;
          // A dica fica abaixo da caixa; se não couber, vai para cima — e nunca sai do palco.
          const dwid = dica.offsetWidth, dh = dica.offsetHeight;
          const dx = Math.max(8, Math.min(W - dwid - 8, bx));
          let dy = by + bh + 12;
          if (dy + dh > H - 8) dy = by - dh - 12;
          if (dy < 8) dy = Math.min(H - dh - 8, by + 12);
          dica.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
        }
      } else cursor.style.opacity = '0';
      caixa.style.opacity = String(op);
      dica.style.opacity = String(op);
    }

    let ult: number | null = null, raf = 0;
    function loop(ts: number) {
      if (tocando.current) {
        if (ult !== null) tempo.current += ts - ult;
        if (tempo.current >= DUR) { tempo.current = DUR; tocando.current = false; icone(); }
      }
      ult = ts;
      quadro();
      raf = requestAnimationFrame(loop);
    }

    function onKey(e: KeyboardEvent) {
      // Não sequestra o teclado de quem está digitando num campo.
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const c = Math.min(cenaAtual.current, N - 1);
      if (e.key === ' ') { e.preventDefault(); tocar(!tocando.current); }
      else if (e.key === 'ArrowRight') { tempo.current = INI[Math.min(N - 1, c + 1)]; tocar(true); }
      else if (e.key === 'ArrowLeft') { tempo.current = INI[Math.max(0, c - 1)]; tocar(true); }
    }

    document.addEventListener('keydown', onKey);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dimensionamento responsivo: recalcula sempre que o espaço do pai muda (resize da janela,
  // menu recolhido, zoom). O palco mantém aspect-ratio no CSS, então só a largura é definida
  // aqui — a altura acompanha sem distorcer as telas.
  useLayoutEffect(() => {
    const raiz = raizRef.current, palco = palcoRef.current, pai = raiz?.parentElement;
    if (!caberNaAltura || !raiz || !palco || !pai) return;
    const ajustar = () => {
      const cs = getComputedStyle(pai);
      const livreW = pai.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const livreH = pai.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      // 2 passadas: a legenda pode quebrar linha conforme a largura, mudando a altura da
      // "moldura" (barra superior + controles + legenda) em volta do palco.
      for (let i = 0; i < 2; i++) {
        const moldura = raiz.offsetHeight - palco.offsetHeight;
        const cabeNaAltura = ((livreH - moldura) * TELA_LARGURA) / TELA_ALTURA;
        const largura = Math.max(LARGURA_MINIMA, Math.min(livreW, LARGURA_MAXIMA, cabeNaAltura));
        raiz.style.width = `${Math.floor(largura)}px`;
      }
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(pai);
    // Ao sair da tela cheia o pai não muda de tamanho (o ResizeObserver não dispara), mas a
    // largura precisa ser recalculada para o espaço da aba de novo.
    document.addEventListener('fullscreenchange', ajustar);
    document.addEventListener('webkitfullscreenchange', ajustar);
    return () => {
      ro.disconnect();
      document.removeEventListener('fullscreenchange', ajustar);
      document.removeEventListener('webkitfullscreenchange', ajustar);
      raiz.style.width = '';
    };
  }, [caberNaAltura]);

  // Tela cheia: o player inteiro vai para fullscreen. A altura da "moldura" vira variável CSS,
  // para o palco ocupar o resto da tela mantendo a proporção (ver PhaczTour.css).
  useEffect(() => {
    const raiz = raizRef.current, palco = palcoRef.current;
    if (!raiz || !palco) return;
    const medirMoldura = () => {
      const moldura = Array.from(raiz.children).reduce((t, el) => (el === palco ? t : t + (el as HTMLElement).offsetHeight), 0);
      raiz.style.setProperty('--pt-moldura', `${moldura}px`);
    };
    const aoMudar = () => {
      const ativa = elementoEmTelaCheia() === raiz;
      setEmTelaCheia(ativa);
      if (ativa) medirMoldura();
    };
    document.addEventListener('fullscreenchange', aoMudar);
    document.addEventListener('webkitfullscreenchange', aoMudar);
    window.addEventListener('resize', medirMoldura);
    return () => {
      document.removeEventListener('fullscreenchange', aoMudar);
      document.removeEventListener('webkitfullscreenchange', aoMudar);
      window.removeEventListener('resize', medirMoldura);
    };
  }, []);

  const alternarTelaCheia = () => {
    const raiz = raizRef.current as ElFs | null;
    if (!raiz) return;
    if (elementoEmTelaCheia()) {
      const d = document as DocFs;
      Promise.resolve(document.exitFullscreen ? document.exitFullscreen() : d.webkitExitFullscreen?.()).catch(() => {});
    } else {
      Promise.resolve(raiz.requestFullscreen ? raiz.requestFullscreen() : raiz.webkitRequestFullscreen?.()).catch(() => {});
    }
  };

  return (
    <div className="phacz-tour" ref={raizRef}>
      <div className="phacz-tour-top">
        <img src={logo} alt="PHACZ" />
        <b>TUTORIAL DO SISTEMA</b>
        <span className="phacz-tour-n" ref={nRef} />
      </div>

      <div className="phacz-tour-palco" ref={palcoRef} onClick={() => tocar(!tocando.current)}>
        {D.telas.map((src, i) => (
          <img
            key={src}
            ref={(el) => { imgsRef.current[i] = el; }}
            className={`phacz-tour-cena${telasFaltando[i] ? ' sem-print' : ''}`}
            src={src}
            alt={D.leg[i]}
            width={TELA_LARGURA}
            height={TELA_ALTURA}
            loading={i === 0 ? 'eager' : 'lazy'}
            onError={() => setTelasFaltando((f) => {
              if (f[i]) return f;
              // O aviso só monta no render seguinte, e a classe `on` é aplicada na TROCA de
              // cena — que já aconteceu. Zerar a cena atual faz o próximo quadro reaplicá-la.
              cenaAtual.current = -1;
              return { ...f, [i]: true };
            })}
          />
        ))}

        {/* Fica por cima da cena atual quando o print dela ainda não existe. Não é erro: o
            motor está pronto e o tutorial roda — falta só a imagem daquela tela. */}
        {D.telas.map((src, i) =>
          telasFaltando[i] ? (
            <div key={`falta-${src}`} className="phacz-tour-falta" ref={(el) => { faltasRef.current[i] = el; }}>
              <strong>{i + 1}. {D.leg[i]}</strong>
              <code>{src.replace('/phacz-tour/', '')}</code>
              <span>Print desta tela ainda não adicionado</span>
            </div>
          ) : null
        )}
        <div className="phacz-tour-caixa" ref={caixaRef} />
        <svg className="phacz-tour-cursor" ref={cursorRef} viewBox="0 0 22 30">
          <path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12 17 L20 17 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <div className="phacz-tour-dica" ref={dicaRef} />
        <div className="phacz-tour-selo"><span ref={seloNRef} /><em ref={seloTRef} /></div>
        <div className="phacz-tour-fim" ref={fimRef}>
          <h2>Fim do tutorial</h2>
          <p>Use a barra abaixo para rever qualquer tela.</p>
          <button onClick={(e) => { e.stopPropagation(); tempo.current = 0; tocar(true); }}>↺ Assistir novamente</button>
        </div>
      </div>

      <div className="phacz-tour-ctl">
        <button
          className="phacz-tour-play"
          aria-label="Etapa anterior"
          title="Etapa anterior (←)"
          onClick={() => irParaCena(Math.min(cenaAtual.current, N - 1) - 1)}
        >
          <IconeAnterior />
        </button>
        <button className="phacz-tour-play" aria-label="Play/Pause" title="Play/Pause (Espaço)" onClick={() => tocar(!tocando.current)}>
          {tocandoUi ? <IconePause /> : <IconePlay />}
        </button>
        <button
          className="phacz-tour-play"
          aria-label="Próxima etapa"
          title="Próxima etapa (→)"
          onClick={() => irParaCena(Math.min(cenaAtual.current, N - 1) + 1)}
        >
          <IconeProxima />
        </button>

        {/* Um segmento por tela: clicar salta direto para ela. */}
        <div className="phacz-tour-segs">
          {CENAS.map((c, i) => (
            <div
              key={i}
              className="phacz-tour-seg"
              style={{ flex: c.len }}
              title={i + 1 + '. ' + D.leg[i]}
              onClick={(e) => { e.stopPropagation(); irParaCena(i); }}
            >
              <i ref={(el) => { segsRef.current[i] = el; }} />
            </div>
          ))}
        </div>

        <span className="phacz-tour-tm" ref={tmRef} />
        {podeTelaCheia && (
          <button
            className="phacz-tour-play"
            aria-label={emTelaCheia ? 'Sair da tela cheia' : 'Tela cheia'}
            title={emTelaCheia ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            onClick={alternarTelaCheia}
          >
            {emTelaCheia ? <IconeSairTelaCheia /> : <IconeTelaCheia />}
          </button>
        )}
      </div>

      <div className="phacz-tour-cap" ref={capRef} />
    </div>
  );
}

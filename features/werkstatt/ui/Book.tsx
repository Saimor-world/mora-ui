'use client';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNodeDetails } from '@/lib/api/orgClient';
import { useUpdateNode } from '@/lib/queries/useNodes';
import { JADE_MORA_SRC } from '@/components/world/JadeMora';
import { useOsShellStore } from '@/lib/os-prototype/shellStore';
import { parseBlocks, serializeBlocks, inlineToHtml, htmlToInline, type Block } from '../model/docBlocks';
import { layoutBook, joinParts, type Piece, type BookLayout } from '../model/layout';
import { findHints } from '../model/hints';
import type { Stage } from '../model/stage';
import { WorkDock } from './WorkDock';
import { PaperSlip } from './PaperSlip';

/** Buchmaße in Bühnen-Einheiten (Pult-Bild 1920×1080). Textkörper 23 Einheiten → ≥16 px ab 1024×768. */
export const BOOK = { x: 400, y: 150, w: 1120, h: 700, page: 550, spine: 20 };
export const TEXT = { top: 70, bottom: 74, outer: 58, inner: 50 };
export const TEXT_W = BOOK.page - TEXT.outer - TEXT.inner;
export const TEXT_H = BOOK.h - TEXT.top - TEXT.bottom;

const tagOf = (k: Block['kind']) => (k === 'h1' ? 'h1' : k === 'h2' ? 'h2' : k === 'h3' ? 'h3' : 'p') as 'p';
const pieceClass = (kind: Block['kind'], cont: boolean, open: boolean) => `wk-piece wk-piece--${kind}${cont ? ' is-cont' : ''}${open ? ' is-open' : ''}`;
/** Mindesthöhe für einen geteilten Absatz am Seitenende bzw. nach einer Überschrift: zwei Zeilen Text (23 × 1,5). */
const MIN_H = 2 * 34.5 + 1;

type Turn = { dir: 1 | -1; from: number; to: number } | null;

export function Book({ id, fallbackTitle, folderId, stage, back }: {
  id: string; fallbackTitle: string; folderId: string | null; stage: Stage; back: { label: string; run: () => void } | null;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['node', id], queryFn: () => fetchNodeDetails(id), staleTime: 30_000 });
  const upd = useUpdateNode(folderId ?? '');
  const node = q.data as { title?: string; name?: string; content?: string } | undefined;
  const title = node?.title || fallbackTitle;
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  useEffect(() => { if (node && blocks === null) setBlocks(parseBlocks(node.content ?? '')); }, [node, blocks]);

  // Satz: eine unsichtbare Seite gleicher Breite misst; Absätze werden zeilengenau auf Seiten verteilt.
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<BookLayout>({ pieces: [], pages: [[]] });
  const { pieces, pages } = layout;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    const f = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!f) return;
    let live = true;
    f.ready.then(() => { if (live) setFontsTick((n) => n + 1); });
    const on = () => setFontsTick((n) => n + 1);
    f.addEventListener?.('loadingdone', on);
    return () => { live = false; f.removeEventListener?.('loadingdone', on); };
  }, []);
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || !blocks) return;
    const probes = new Map<string, HTMLElement>();
    const probe = (tag: string) => {
      let el = probes.get(tag);
      if (!el) { el = document.createElement(tag); root.appendChild(el); probes.set(tag, el); }
      return el;
    };
    const measure = (kind: Block['kind'], text: string, cont: boolean, open: boolean) => {
      const el = probe(tagOf(kind));
      el.className = pieceClass(kind, cont, open);
      el.innerHTML = inlineToHtml(text);
      return el.offsetHeight;
    };
    setLayout(layoutBook(blocks, measure, TEXT_H, MIN_H));
    probes.forEach((el) => el.remove());
  }, [blocks, fontsTick]);
  // Stabile HTML-Objekte je Stück: das React 19 des App Routers vergleicht dangerouslySetInnerHTML nach Identität – ein neues Objekt
  // bei jedem Rendern würde Markierung und Schreibmarke im Text bei jeder Kleinigkeit (z. B. Formatleiste) löschen.
  const htmlOf = useMemo(() => new Map(pieces.map((p) => [p.key, { __html: inlineToHtml(p.text) }])), [pieces]);
  /** Die Stücke eines Blocks im aktuellen Satz (mit Entwürfen). */
  const partsOf = (blockId: string) => layoutRef.current.pieces.filter((p) => p.blockId === blockId);

  const [spread, setSpread] = useState(0);
  const spreads = Math.max(1, Math.ceil(pages.length / 2));
  useEffect(() => { if (spread > spreads - 1) setSpread(spreads - 1); }, [spread, spreads]);
  const [turn, setTurn] = useState<Turn>(null);
  const go = useCallback((to: number) => {
    const t = Math.max(0, Math.min(spreads - 1, to));
    if (t === spread || turn) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setSpread(t); return; }
    setTurn({ dir: t > spread ? 1 : -1, from: spread, to: t });
    window.setTimeout(() => { setSpread(t); setTurn(null); }, 640);
  }, [spread, spreads, turn]);

  // Bearbeiten direkt auf dem Papier.
  const [editing, setEditing] = useState(false);
  const drafts = useRef(new Map<string, string>());
  const idle = useRef<number | null>(null);
  const caret = useRef<{ blockId: string; offset: number } | null>(null);
  const dirty = useRef(false);

  const lastSaved = useRef<string | null>(null);
  const save = useCallback((next: Block[]) => {
    dirty.current = false;
    const content = serializeBlocks(next);
    if (content === (lastSaved.current ?? serializeBlocks(parseBlocks(node?.content ?? '')))) return;
    lastSaved.current = content;
    upd.mutate({ id, payload: { content } }, {
      onSuccess: () => qc.setQueryData(['node', id], (old: object | undefined) => ({ ...(old ?? {}), content })),
    });
  }, [id, upd, qc, node]);
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback((next: Block[]) => {
    dirty.current = true;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(next), 900);
  }, [save]);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (dirty.current && blocksRef.current) save(blocksRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const pieceEl = (key: string) => rootRef.current?.querySelector<HTMLElement>(`[data-piece="${CSS.escape(key)}"]`) ?? null;
  const readCaret = (): { blockId: string; offset: number } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const host = (sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest<HTMLElement>('[data-piece]');
    if (!host) return null;
    const [blockId, partS] = (host.dataset.piece ?? '').split(':');
    const r = document.createRange();
    r.selectNodeContents(host);
    r.setEnd(sel.anchorNode as Node, sel.anchorOffset);
    let offset = r.toString().length;
    const part = Number(partS);
    for (let k = 0; k < part; k++) offset += ((pieceEl(`${blockId}:${k}`)?.textContent ?? '').length + 1);
    return { blockId, offset };
  };
  const commit = useCallback((mutate?: (b: Block[]) => Block[]) => {
    if (!blocksRef.current) return;
    caret.current = readCaret() ?? caret.current;
    let next = blocksRef.current.map((b) => {
      const own = partsOf(b.id);
      return own.some((p) => drafts.current.has(p.key)) ? { ...b, text: joinParts(own.map((p) => drafts.current.get(p.key) ?? p.text)) } : b;
    });
    drafts.current.clear();
    if (mutate) next = mutate(next);
    setBlocks(next);
    scheduleSave(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSave]);
  const onInput = (p: Piece, el: HTMLElement) => {
    drafts.current.set(p.key, htmlToInline(el.innerHTML));
    if (idle.current) window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => commit(), 900);
  };
  // Nach jedem Umbruch: Schreibmarke wiederfinden und, falls sie auf die nächste Seite gewandert ist, mitblättern.
  useLayoutEffect(() => {
    const c = caret.current;
    if (!editing || !c) return;
    const own = pieces.filter((p) => p.blockId === c.blockId);
    let left = c.offset;
    for (const p of own) {
      const el = pieceEl(p.key);
      const len = (el?.textContent ?? p.text).length;
      if (left <= len || p.last) {
        const pageIdx = pages.findIndex((pg) => pg.includes(pieces.indexOf(p)));
        if (pageIdx >= 0 && Math.floor(pageIdx / 2) !== spread) { setSpread(Math.floor(pageIdx / 2)); return; }
        if (!el) return;
        el.focus({ preventScroll: true });
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n = walker.nextNode() as Text | null, rest = Math.min(left, len);
        while (n && rest > n.length) { rest -= n.length; n = walker.nextNode() as Text | null; }
        const sel = window.getSelection();
        const r = document.createRange();
        if (n) r.setStart(n, rest); else { r.selectNodeContents(el); r.collapse(false); }
        r.collapse(true);
        sel?.removeAllRanges(); sel?.addRange(r);
        caret.current = null;
        return;
      }
      left -= len + 1;
    }
  }, [pages, spread, editing, pieces]);

  const onKey = (p: Piece, e: React.KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const range = sel.getRangeAt(0);
      const before = document.createRange(); before.selectNodeContents(el); before.setEnd(range.startContainer, range.startOffset);
      const after = document.createRange(); after.selectNodeContents(el); after.setStart(range.endContainer, range.endOffset);
      const wrap = (r: Range) => { const d = document.createElement('div'); d.appendChild(r.cloneContents()); return htmlToInline(d.innerHTML); };
      const head = wrap(before), tail = wrap(after);
      drafts.current.delete(p.key);
      const newId = `${p.blockId}-${Date.now().toString(36)}`;
      commit((bs) => {
        const i = bs.findIndex((b) => b.id === p.blockId);
        if (i < 0) return bs;
        const parts = partsOf(p.blockId).map((x) => x.text);
        const a = [...parts.slice(0, p.part), head].join(' ').trim();
        const b = [tail, ...parts.slice(p.part + 1)].join(' ').trim();
        const kind = bs[i].kind === 'li' || bs[i].kind === 'oli' ? bs[i].kind : 'p';
        return [...bs.slice(0, i), { ...bs[i], text: a }, { id: newId, kind, text: b }, ...bs.slice(i + 1)];
      });
      caret.current = { blockId: newId, offset: 0 };
      return;
    }
    if (e.key === 'Backspace' && p.part === 0 && sel.isCollapsed) {
      const r = document.createRange(); r.selectNodeContents(el); r.setEnd(sel.anchorNode as Node, sel.anchorOffset);
      if (r.toString().length > 0) return;
      e.preventDefault();
      drafts.current.set(p.key, htmlToInline(el.innerHTML));
      commit((bs) => {
        const i = bs.findIndex((b) => b.id === p.blockId);
        if (i <= 0) return bs;
        const prev = bs[i - 1];
        caret.current = { blockId: prev.id, offset: prev.text.replace(/\*\*|_/g, '').length };
        return [...bs.slice(0, i - 1), { ...prev, text: `${prev.text}${prev.text && bs[i].text ? ' ' : ''}${bs[i].text}` }, ...bs.slice(i + 1)];
      });
    }
  };

  // Formatleiste nur an einer Markierung.
  const [fmt, setFmt] = useState<{ x: number; y: number; blockId: string } | null>(null);
  useEffect(() => {
    if (!editing) { setFmt(null); return; }
    const on = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setFmt(null); return; }
      const host = (sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement)?.closest<HTMLElement>('[data-piece]');
      if (!host || !rootRef.current?.contains(host)) { setFmt(null); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setFmt({ x: ((r.left + r.right) / 2 - stage.x) / stage.k, y: (r.top - stage.y) / stage.k, blockId: (host.dataset.piece ?? '').split(':')[0] });
    };
    document.addEventListener('selectionchange', on);
    return () => document.removeEventListener('selectionchange', on);
  }, [editing, stage]);
  const exec = (cmd: 'bold' | 'italic') => { document.execCommand(cmd); };
  const setKind = (kind: Block['kind']) => {
    if (!fmt) return;
    const id0 = fmt.blockId;
    commit((bs) => bs.map((b) => (b.id === id0 ? { ...b, kind: b.kind === kind ? 'p' : kind } : b)));
  };

  const finish = () => { if (idle.current) window.clearTimeout(idle.current); commit(); setEditing(false); window.getSelection()?.removeAllRanges(); };

  // Tastatur: Pfeile blättern (nicht beim Schreiben).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (editing || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(spread + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(spread - 1); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, spread, editing]);

  const hints = useMemo(() => findHints(blocks ?? []), [blocks]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [openHint, setOpenHint] = useState<string | null>(null);
  const [toc, setToc] = useState(false);
  const headings = useMemo(() => pieces.map((p, i) => ({ p, i })).filter(({ p }) => (p.kind === 'h1' || p.kind === 'h2') && p.part === 0)
    .map(({ p, i }) => ({ text: p.text.replace(/\*\*|_/g, ''), page: pages.findIndex((pg) => pg.includes(i)) })), [pieces, pages]);

  const pageAt = (n: number) => pages[n] ?? null;
  const sectionOf = (n: number) => {
    let s = '';
    for (let k = 0; k <= n; k++) for (const i of pages[k] ?? []) if (pieces[i]?.kind === 'h2') s = pieces[i].text.replace(/\*\*|_/g, '');
    return s;
  };
  const renderPage = (n: number, side: 'l' | 'r', live: boolean) => {
    const idx = pageAt(n);
    return (
      <div className={`wk-page wk-page--${side}`} data-page={n + 1} aria-label={idx ? `Seite ${n + 1}` : undefined}>
        {idx ? (
          <>
            <p className="wk-page__head" aria-hidden>{side === 'l' ? title : sectionOf(n)}</p>
            <div className="wk-page__flow">
              {idx.map((i) => {
                const p = pieces[i];
                if (!p) return null;
                const Tag = tagOf(p.kind);
                return (
                  <Tag key={p.key} className={pieceClass(p.kind, p.part > 0, !p.last)}
                    data-piece={live ? p.key : undefined} data-block={p.blockId}
                    contentEditable={live && editing ? true : undefined} suppressContentEditableWarning spellCheck={live && editing}
                    onInput={live && editing ? (e) => onInput(p, e.currentTarget) : undefined}
                    onKeyDown={live && editing ? (e) => onKey(p, e) : undefined}
                    onDoubleClick={live && !editing ? () => setEditing(true) : undefined}
                    dangerouslySetInnerHTML={htmlOf.get(p.key)} />
                );
              })}
            </div>
            <p className="wk-page__no" aria-hidden>{n + 1}</p>
          </>
        ) : null}
      </div>
    );
  };

  const L = spread * 2, R = L + 1;
  const visibleHints = hints.filter((h) => !dismissed.includes(h.blockId)).map((h) => {
    const pi = pieces.findIndex((p) => p.blockId === h.blockId);
    const page = pages.findIndex((pg) => pg.includes(pi));
    return { ...h, page };
  }).filter((h) => h.page === L || h.page === R);
  const readLeft = Math.min(14, Math.round((spread / Math.max(1, spreads - 1)) * 14));

  return (
    <div className="wk-book" ref={rootRef} data-testid="wk-book" data-pages={pages.length} data-spread={spread} data-editing={editing ? '1' : undefined}
      style={{ left: BOOK.x, top: BOOK.y, width: BOOK.w, height: BOOK.h, ['--stack-l' as string]: `${2 + readLeft}px`, ['--stack-r' as string]: `${16 - readLeft}px` }}
      lang="de" aria-busy={!blocks}>
      <div className="wk-book__cover" aria-hidden />
      {visibleHints.map((h, k) => (
        <div key={h.blockId} className="wk-hint" data-open={openHint === h.blockId ? '1' : undefined} data-testid="wk-hint"
          style={{ left: (h.page === L ? 0 : BOOK.page + BOOK.spine) + 70 + k * 40, ['--tilt' as string]: `${k % 2 ? 1.2 : -1.4}deg` }}>
          <button type="button" className="wk-hint__tab" onClick={() => setOpenHint((v) => (v === h.blockId ? null : h.blockId))} aria-expanded={openHint === h.blockId}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={JADE_MORA_SRC} alt="" width={20} height={26} draggable={false} />
            <span>„{h.quote}“</span>
          </button>
          {openHint === h.blockId ? (
            <div className="wk-hint__body">
              <p>{h.text}</p>
              <span>
                <button type="button" onClick={() => useOsShellStore.getState().setMoraOpen(true)}>Nachsehen</button>
                <button type="button" onClick={() => { setDismissed((d) => [...d, h.blockId]); setOpenHint(null); }}>Weglegen</button>
              </span>
            </div>
          ) : null}
        </div>
      ))}
      <div className="wk-book__pages">
        {turn ? (
          <>
            {renderPage(turn.dir > 0 ? turn.from * 2 : turn.to * 2, 'l', false)}
            {renderPage(turn.dir > 0 ? turn.to * 2 + 1 : turn.from * 2 + 1, 'r', false)}
            <div className={`wk-leaf wk-leaf--${turn.dir > 0 ? 'fwd' : 'back'}`} aria-hidden>
              <div className="wk-leaf__face">{renderPage(turn.dir > 0 ? turn.from * 2 + 1 : turn.from * 2, turn.dir > 0 ? 'r' : 'l', false)}</div>
              <div className="wk-leaf__face wk-leaf__face--back">{renderPage(turn.dir > 0 ? turn.to * 2 : turn.to * 2 + 1, turn.dir > 0 ? 'l' : 'r', false)}</div>
            </div>
          </>
        ) : (
          <>
            {renderPage(L, 'l', true)}
            {renderPage(R, 'r', true)}
          </>
        )}
        <i className="wk-book__gutter" aria-hidden />
        {spread > 0 && !editing ? <button type="button" className="wk-corner wk-corner--prev" onClick={() => go(spread - 1)} aria-label="Zurückblättern" data-testid="wk-book-prev" /> : null}
        {spread < spreads - 1 && !editing ? <button type="button" className="wk-corner wk-corner--next" onClick={() => go(spread + 1)} aria-label="Weiterblättern" data-testid="wk-book-next" /> : null}
      </div>
      <i className="wk-book__ribbon" aria-hidden />
      {fmt && editing ? (
        <div className="wk-fmt" role="toolbar" aria-label="Format" data-testid="wk-fmt" style={{ left: fmt.x - BOOK.x, top: fmt.y - BOOK.y - 74 }}
          onMouseDown={(e) => e.preventDefault()}>
          <button type="button" onClick={() => exec('bold')} aria-label="Fett"><b>F</b></button>
          <button type="button" onClick={() => exec('italic')} aria-label="Kursiv"><i>K</i></button>
          <button type="button" onClick={() => setKind('h2')}>Überschrift</button>
          <button type="button" onClick={() => setKind('li')}>Liste</button>
        </div>
      ) : null}
      {toc ? (
        <PaperSlip x={-330} y={40} w={300} label="Inhalt" onClose={() => setToc(false)} testId="wk-toc">
          <ol className="wk-slip__list">
            {headings.map((h, k) => (
              <li key={k}><button type="button" onClick={() => { setToc(false); go(Math.floor(h.page / 2)); }}><span>{h.text}</span><em>{h.page + 1}</em></button></li>
            ))}
          </ol>
        </PaperSlip>
      ) : null}
      <div className="wk-page__measure" ref={measureRef} aria-hidden style={{ width: TEXT_W }} />
      <WorkDock back={back} actions={[
        { id: 'inhalt', label: 'Inhalt', run: () => setToc((v) => !v), pressed: toc, disabled: headings.length < 2 },
        editing ? { id: 'fertig', label: 'Fertig', run: finish, pressed: true } : { id: 'bearbeiten', label: 'Bearbeiten', run: () => setEditing(true) },
        { id: 'zurueckblaettern', label: '‹', run: () => go(spread - 1), disabled: spread === 0 || editing },
        { id: 'weiterblaettern', label: '›', run: () => go(spread + 1), disabled: spread >= spreads - 1 || editing },
      ]} />
    </div>
  );
}

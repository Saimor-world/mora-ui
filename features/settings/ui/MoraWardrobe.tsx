'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Surface, Text } from '@/components/os-kit';
import { PixelMoraMark, PixelMoraStage } from '@/components/world/PixelMora';
import { DEFAULT_WARDROBE, joinChoice, randomWardrobe, resolve, sameWardrobe, TRAITS, type TraitSlot, type Wardrobe } from '@/lib/mora/traits';
import { useOutfits, useWardrobe } from '@/lib/mora/useWardrobe';

const TAB_ORDER = ['head', 'face', 'neck', 'clip', 'held', 'aura', 'seasonal'];
const HISTORY = 60;

/** Schlanke Linien-Icons pro Kategorie (20×20, currentColor). */
const ICONS: Record<string, React.ReactNode> = {
  head: <path d="M3 14.5h14M5 14.5c0-4 2-7 5-7s5 3 5 7M10 7.5V4.5M8.5 5.5 10 4.5l1.5 1" />,
  face: <><circle cx="6.2" cy="10.5" r="3" /><circle cx="13.8" cy="10.5" r="3" /><path d="M9.2 10h1.6M3.2 10 2 8.8M16.8 10 18 8.8" /></>,
  neck: <path d="M3.5 7.5c2.2 1.6 10.8 1.6 13 0M3.5 7.5v2.3c2.2 1.6 10.8 1.6 13 0V7.5M12.5 11l1 5.5 2-.7-.8-4.6" />,
  clip: <path d="M13.5 3.8A6.4 6.4 0 1 0 16.2 13 5.2 5.2 0 0 1 13.5 3.8Z" />,
  held: <path d="M5 4.5h8.5a1.5 1.5 0 0 1 1.5 1.5v9.5H6.5A1.5 1.5 0 0 1 5 14V4.5ZM5 14a1.5 1.5 0 0 1 1.5-1.5H15M8 7.5h4" />,
  aura: <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M5 5l2 2M13 13l2 2M15 5l-2 2M7 13l-2 2" />,
  seasonal: <path d="M10 2.5v15M3.5 6.2l13 7.6M3.5 13.8l13-7.6M8.3 3.7 10 5.3l1.7-1.6M8.3 16.3 10 14.7l1.7 1.6" />,
};
const Icon = ({ id, size = 18 }: { id: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[id]}</svg>
);
const sv = (d: string) => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const ICO = {
  undo: sv('M7.5 5 3.5 9l4 4M4 9h8a4 4 0 0 1 0 8h-2'),
  redo: sv('M12.5 5l4 4-4 4M16 9H8a4 4 0 0 0 0 8h2'),
  turn: sv('M16 10a6 6 0 1 1-2-4.4M16 3.5v3h-3'),
  dice: sv('M4.5 4.5h11v11h-11ZM8 8h.01M12 8h.01M8 12h.01M12 12h.01M10 10h.01'),
  reset: sv('M4 10a6 6 0 1 0 2-4.5M4 3.5v3h3'),
  save: sv('M4.5 4.5h9l2 2v9h-11ZM7 4.5v4h5v-4M7 15.5v-4h6v4'),
  none: sv('M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM5.4 14.6l9.2-9.2'),
  close: sv('M5.5 5.5l9 9M14.5 5.5l-9 9'),
};

type Hover = { slot: string; choice: string | null } | null;

/** Garderobe: Create-a-MÔRA-Editor. Große Bühne, Kategorien, Raster, Farbvarianten, Zufall, Outfit-Plätze, Rückgängig. Lokal pro Nutzer gespeichert. */
export function MoraWardrobe() {
  const [w, save] = useWardrobe();
  const [outfits, setOutfit] = useOutfits();
  const [tab, setTab] = useState('head');
  const [hover, setHover] = useState<Hover>(null);
  const [hop, setHop] = useState(0);
  const [turn, setTurn] = useState(0);
  const [past, setPast] = useState<Wardrobe[]>([]);
  const [future, setFuture] = useState<Wardrobe[]>([]);
  const lastVariant = useRef<Record<string, string>>({});

  const slots = useMemo(() => TAB_ORDER.map((id) => TRAITS.slots.find((s) => s.id === id)).filter(Boolean) as TraitSlot[], []);
  const slot = slots.find((s) => s.id === tab) ?? slots[0];

  const commit = useCallback((next: Wardrobe) => {
    if (sameWardrobe(next, w)) return;
    setPast((p) => [...p.slice(-(HISTORY - 1)), w]); setFuture([]);
    save(next); setHop((h) => h + 1);
  }, [w, save]);
  const undo = () => { const p = past[past.length - 1]; if (!p) return; setPast(past.slice(0, -1)); setFuture((f) => [w, ...f]); save(p); setHop((h) => h + 1); };
  const redo = () => { const f = future[0]; if (!f) return; setFuture(future.slice(1)); setPast((p) => [...p, w]); save(f); setHop((h) => h + 1); };

  const cur = resolve(slot, w[slot.id]);
  const pickItem = (itemId: string) => {
    const it = slot.items.find((i) => i.id === itemId)!;
    const keep = cur?.item.id === itemId ? cur.variant.id : (lastVariant.current[`${slot.id}/${itemId}`] ?? it.variants[0].id);
    commit({ ...w, [slot.id]: joinChoice(itemId, keep) });
  };
  const pickVariant = (variantId: string) => {
    if (!cur) return; lastVariant.current[`${slot.id}/${cur.item.id}`] = variantId;
    commit({ ...w, [slot.id]: joinChoice(cur.item.id, variantId) });
  };
  const hoverItem = (itemId: string | null) => {
    if (itemId === null) return setHover({ slot: slot.id, choice: null });
    const it = slot.items.find((i) => i.id === itemId)!;
    setHover({ slot: slot.id, choice: joinChoice(itemId, cur?.item.id === itemId ? cur.variant.id : (lastVariant.current[`${slot.id}/${itemId}`] ?? it.variants[0].id)) });
  };

  const preview: Wardrobe = hover ? { ...w, [hover.slot]: hover.choice } : w;
  const previewing = !!hover && !sameWardrobe(preview, w);
  const pv = hover ? resolve(TRAITS.slots.find((s) => s.id === hover.slot)!, hover.choice) : null;
  const worn = TRAITS.slots.filter((s) => w[s.id]).length;
  const dirty = !sameWardrobe(w, DEFAULT_WARDROBE);

  return (
    <Surface padding={5} data-testid="mora-wardrobe" className="os-wd">
      <div className="os-wd__head">
        <Text variant="eyebrow">Garderobe · MÔRA</Text>
        <span className="os-wd__count">{worn} von {TRAITS.slots.length} Plätzen getragen</span>
      </div>
      <div className="os-wd__body">
        <section className="os-wd__left" aria-label="Vorschau">
          <div className="os-wd__stage" onPointerLeave={() => setHover(null)}>
            <span className="os-wd__glow" aria-hidden />
            <span className="os-wd__ring" aria-hidden /><span className="os-wd__ring os-wd__ring--b" aria-hidden />
            <span className="os-wd__spark os-wd__spark--1" aria-hidden /><span className="os-wd__spark os-wd__spark--2" aria-hidden /><span className="os-wd__spark os-wd__spark--3" aria-hidden />
            <span className="os-wd__shadow" aria-hidden />
            <PixelMoraStage wardrobe={preview} scale={7} hop={hop} turn={turn} />
            <div className="os-wd__chip" data-on={previewing ? 'true' : undefined} role="status" aria-live="polite">
              {previewing ? <>Vorschau · {pv ? `${pv.item.name} · ${pv.variant.name}` : 'Ohne'}</> : 'Aktuelles Outfit'}
            </div>
          </div>
          <div className="os-wd__bar" role="toolbar" aria-label="Aktionen">
            <button type="button" onClick={() => commit(randomWardrobe())} data-testid="wd-random" className="is-primary">{ICO.dice}Zufall</button>
            <button type="button" onClick={undo} disabled={!past.length} data-testid="wd-undo" aria-label="Rückgängig" title="Rückgängig">{ICO.undo}</button>
            <button type="button" onClick={redo} disabled={!future.length} data-testid="wd-redo" aria-label="Wiederholen" title="Wiederholen">{ICO.redo}</button>
            <button type="button" onClick={() => setTurn((t) => t + 1)} data-testid="wd-turn" title="Drehen">{ICO.turn}Drehen</button>
            <button type="button" onClick={() => commit(DEFAULT_WARDROBE)} disabled={!dirty} data-testid="wd-reset" title="Zurücksetzen">{ICO.reset}Zurücksetzen</button>
          </div>
          <div className="os-wd__outfits">
            <span className="os-wd__label">Meine Outfits</span>
            <div className="os-wd__slots">
              {outfits.map((o, i) => (
                <div key={i} className="os-wd__outfit" data-filled={o ? 'true' : undefined}>
                  <button type="button" className="os-wd__outfit-main" data-testid={`wd-outfit-${i + 1}`}
                    onClick={() => (o ? commit(o) : setOutfit(i, w))} aria-label={o ? `Outfit ${i + 1} anziehen` : `Aktuelles Outfit auf Platz ${i + 1} speichern`}
                    title={o ? `Outfit ${i + 1} anziehen` : 'Aktuelles Outfit hier speichern'}>
                    {o ? <PixelMoraMark size={44} wardrobe={o} /> : <span className="os-wd__plus">+</span>}
                    <span className="os-wd__num">{i + 1}</span>
                  </button>
                  {o ? (
                    <span className="os-wd__outfit-act">
                      <button type="button" onClick={() => setOutfit(i, w)} aria-label={`Platz ${i + 1} überschreiben`} title="Mit aktuellem überschreiben">{ICO.save}</button>
                      <button type="button" onClick={() => setOutfit(i, null)} aria-label={`Platz ${i + 1} leeren`} title="Leeren" data-testid={`wd-outfit-${i + 1}-clear`}>{ICO.close}</button>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="os-wd__right" aria-label="Accessoires">
          <div className="os-wd__tabs" role="tablist" aria-label="Kategorien">
            {slots.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={tab === s.id} onClick={() => { setTab(s.id); setHover(null); }} data-testid={`wd-tab-${s.id}`} className="os-wd__tab">
                <Icon id={s.id} /><span>{s.name}</span>{w[s.id] ? <i className="os-wd__dot" aria-hidden /> : null}
              </button>
            ))}
          </div>
          <div className="os-wd__grid" role="group" aria-label={slot.name} onPointerLeave={() => setHover(null)}>
            <button type="button" className="os-wd__card" aria-pressed={!w[slot.id]} onClick={() => commit({ ...w, [slot.id]: null })} onPointerEnter={() => hoverItem(null)} onFocus={() => hoverItem(null)} onBlur={() => setHover(null)} data-testid={`wd-${slot.id}-none`}>
              <span className="os-wd__thumb os-wd__thumb--none">{ICO.none}</span><span className="os-wd__name">Keins</span>
            </button>
            {slot.items.map((i) => {
              const on = cur?.item.id === i.id;
              const shown = on ? cur!.variant : (i.variants.find((v) => v.id === lastVariant.current[`${slot.id}/${i.id}`]) ?? i.variants[0]);
              return (
                <button key={i.id} type="button" className="os-wd__card" aria-pressed={on} onClick={() => pickItem(i.id)} onPointerEnter={() => hoverItem(i.id)} onFocus={() => hoverItem(i.id)} onBlur={() => setHover(null)} title={i.name} data-testid={`wd-${slot.id}-${i.id}`}>
                  <span className="os-wd__thumb"><img src={TRAITS.thumbBase + shown.file} alt="" draggable={false} /></span>
                  <span className="os-wd__name">{i.name}</span>
                  {i.signature ? <span className="os-wd__badge" title="Signatur-Stück">★</span> : null}
                  {i.season ? <span className="os-wd__badge os-wd__badge--season" title="Saisonal">Saison</span> : null}
                  {i.variants.length > 1 ? <span className="os-wd__vcount">{i.variants.length} Farben</span> : null}
                </button>
              );
            })}
          </div>
          <div className="os-wd__variants">
            {cur ? (
              <>
                <span className="os-wd__label">Farbe · {cur.item.name}</span>
                <div className="os-wd__sw" role="group" aria-label="Farbvarianten">
                  {cur.item.variants.map((v) => (
                    <button key={v.id} type="button" className="os-wd__swatch" aria-pressed={cur.variant.id === v.id} aria-label={v.name} title={v.name} style={{ ['--sw' as string]: v.swatch }}
                      onClick={() => pickVariant(v.id)} onPointerEnter={() => setHover({ slot: slot.id, choice: joinChoice(cur.item.id, v.id) })} onPointerLeave={() => setHover(null)} data-testid={`wd-var-${v.id}`} />
                  ))}
                  <span className="os-wd__vname">{cur.variant.name}</span>
                </div>
              </>
            ) : <span className="os-wd__hint">Wähle ein Teil, dann erscheinen hier seine Farben. Fahre über ein Teil für eine Vorschau.</span>}
          </div>
        </section>
      </div>
    </Surface>
  );
}

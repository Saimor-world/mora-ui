'use client';
import React from 'react';
import { Surface, Text } from '@/components/os-kit';
import { PixelMoraMark } from '@/components/world/PixelMora';
import { DEFAULT_WARDROBE, TRAITS } from '@/lib/mora/traits';
import { useWardrobe } from '@/lib/mora/useWardrobe';

/** Garderobe: MÔRAs Accessoires pro Slot, Live-Vorschau. Gespeichert lokal pro Nutzer. */
export function MoraWardrobe() {
  const [w, save] = useWardrobe();
  return (
    <Surface padding={5} data-testid="mora-wardrobe">
      <Text variant="eyebrow">Garderobe · MÔRA</Text>
      <div className="os-wardrobe mt-3">
        <div className="os-wardrobe__stage" aria-hidden><PixelMoraMark size={150} wardrobe={w} /></div>
        <div className="os-wardrobe__slots">
          {TRAITS.slots.map((s) => (
            <div key={s.id} className="os-wardrobe__slot">
              <span className="os-wardrobe__label">{s.name}</span>
              <div className="os-wardrobe__items" role="group" aria-label={s.name}>
                <button type="button" aria-pressed={!w[s.id]} onClick={() => save({ ...w, [s.id]: null })} data-testid={`wd-${s.id}-none`}>Keins</button>
                {s.items.map((i) => (
                  <button key={i.id} type="button" aria-pressed={w[s.id] === i.id} onClick={() => save({ ...w, [s.id]: i.id })} title={i.name} data-testid={`wd-${s.id}-${i.id}`}>
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="os-wardrobe__reset" onClick={() => save(DEFAULT_WARDROBE)}>Zurücksetzen</button>
        </div>
      </div>
    </Surface>
  );
}

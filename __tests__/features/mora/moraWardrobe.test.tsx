import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MoraWardrobe } from '@/features/settings/ui/MoraWardrobe';

const head = () => JSON.parse(window.localStorage.getItem('mora.wardrobe.v1:me') || '{}').head;

describe('MoraWardrobe (Editor)', () => {
  beforeEach(() => window.localStorage.clear());

  it('wählt Teil und Farbe, Rückgängig und Wiederholen', () => {
    render(<MoraWardrobe />);
    fireEvent.click(screen.getByTestId('wd-tab-head'));
    fireEvent.click(screen.getByTestId('wd-head-beret'));
    expect(head()).toBe('beret:rot');
    fireEvent.click(screen.getByTestId('wd-var-marine'));
    expect(head()).toBe('beret:marine');
    fireEvent.click(screen.getByTestId('wd-undo'));
    expect(head()).toBe('beret:rot');
    fireEvent.click(screen.getByTestId('wd-redo'));
    expect(head()).toBe('beret:marine');
  });

  it('zeigt beim Überfahren nur eine Vorschau und speichert nichts', () => {
    render(<MoraWardrobe />);
    fireEvent.click(screen.getByTestId('wd-tab-head'));
    fireEvent.pointerEnter(screen.getByTestId('wd-head-halo'));
    expect(screen.getByRole('status').textContent).toMatch(/Vorschau · Aureole/);
    expect(window.localStorage.getItem('mora.wardrobe.v1:me')).toBeNull();
    fireEvent.pointerLeave(screen.getByTestId('wd-head-halo').parentElement!);
    expect(screen.getByRole('status').textContent).toBe('Aktuelles Outfit');
  });

  it('wechselt Kategorie und leert einen Platz', () => {
    render(<MoraWardrobe />);
    fireEvent.click(screen.getByTestId('wd-tab-face'));
    fireEvent.click(screen.getByTestId('wd-face-glasses'));
    expect(JSON.parse(window.localStorage.getItem('mora.wardrobe.v1:me')!).face).toBe('glasses:gold');
    fireEvent.click(screen.getByTestId('wd-face-none'));
    expect(JSON.parse(window.localStorage.getItem('mora.wardrobe.v1:me')!).face).toBeNull();
  });

  it('speichert und lädt Outfit-Plätze, Zurücksetzen holt den Standard', () => {
    render(<MoraWardrobe />);
    fireEvent.click(screen.getByTestId('wd-tab-head'));
    fireEvent.click(screen.getByTestId('wd-head-wizard'));
    fireEvent.click(screen.getByTestId('wd-outfit-1'));
    expect(JSON.parse(window.localStorage.getItem('mora.outfits.v1:me')!)[0].head).toBe('wizard:violett');
    fireEvent.click(screen.getByTestId('wd-reset'));
    expect(head()).toBeNull();
    fireEvent.click(screen.getByTestId('wd-outfit-1'));
    expect(head()).toBe('wizard:violett');
    fireEvent.click(screen.getByTestId('wd-outfit-1-clear'));
    expect(JSON.parse(window.localStorage.getItem('mora.outfits.v1:me')!)[0]).toBeNull();
  });

  it('Zufall ändert das Outfit und lässt sich zurücknehmen', () => {
    const before = JSON.stringify({ head: null, clip: null, neck: 'scarf' });
    render(<MoraWardrobe />);
    let n = 0; const spy = jest.spyOn(Math, 'random').mockImplementation(() => [0.05, 0.4, 0.9, 0.2, 0.7, 0.1, 0.6, 0.3][n++ % 8]);
    fireEvent.click(screen.getByTestId('wd-random')); spy.mockRestore();
    expect(window.localStorage.getItem('mora.wardrobe.v1:me')).not.toBeNull();
    fireEvent.click(screen.getByTestId('wd-undo'));
    const w = JSON.parse(window.localStorage.getItem('mora.wardrobe.v1:me')!);
    expect(w.head).toBeNull(); expect(JSON.stringify({ head: w.head, clip: w.clip, neck: w.neck })).toBe(before);
  });
});

import { APP_IDS } from '@/lib/apps/AppLoader';
import { APP_REGISTRY } from '@/lib/apps/appRegistry';
import { isPaneEnabled } from '@/lib/surface/surfaceRegistry';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Eine App im OS zu registrieren brauchte Eintraege an fuenf Orten:
 * Manifest, AppLoader-Karte, Flaechentyp, PaneManager und App-Uebersicht.
 * Vergass man einen, fiel nichts auf — der `default`-Zweig im PaneManager
 * gab `null` zurueck, das Fenster oeffnete, und es erschien schlicht nichts.
 *
 * Genau das ist beim Bau der Ortsansicht passiert: vier Stellen gepflegt,
 * die fuenfte uebersehen, alle 1132 Tests gruen. Der PaneManager reicht
 * inzwischen generisch durch — diese Datei haelt fest, dass es so bleibt.
 */

const quelle = readFileSync(join(process.cwd(), 'components/mora/PaneManager.tsx'), 'utf-8');

/** Apps ohne eigenen Flaechentyp — nur ueber andere Wege erreichbar. */
const OHNE_FLAECHE = new Set(['action-center']);

describe('Jede registrierte App ist auch erreichbar', () => {
  const gefuehrt = APP_REGISTRY.map(a => a.id).filter(id => !OHNE_FLAECHE.has(id));

  it.each(gefuehrt)('%s steht in der AppLoader-Karte', id => {
    expect(APP_IDS).toContain(id);
  });

  it.each(gefuehrt)('%s ist als Flaechentyp freigegeben', id => {
    expect(isPaneEnabled(id)).toBe(true);
  });
});

describe('Der PaneManager reicht generisch durch', () => {
  it('entscheidet anhand der AppLoader-Karte, nicht anhand einer Zweigliste', () => {
    // Der eigentliche Schutz: Solange diese Zeile so aussieht, genuegt ein
    // Eintrag in APP_MAP, damit eine App im Fenster erscheint.
    expect(quelle).toMatch(/APP_IDS\.includes\(appId\)/);
    expect(quelle).toMatch(/<AppLoader appId=\{appId\}/);
  });

  it('haelt die abweichenden Namen in einer sichtbaren Tabelle', () => {
    // `space` oeffnet den Finder, `actions` das Action-Center — Namen aus
    // frueheren Ausbaustufen. Ohne diese Tabelle waere der generische Weg
    // eine stille Verhaltensaenderung.
    expect(quelle).toMatch(/PANE_ALIAS[\s\S]{0,200}space:\s*'finder'/);
    expect(quelle).toMatch(/PANE_ALIAS[\s\S]{0,200}actions:\s*'action-center'/);
  });

  it('nennt keine App, die es nicht gibt', () => {
    const zugeordnet = [...quelle.matchAll(/appId="([^"]+)"/g)].map(m => m[1]);
    for (const id of new Set(zugeordnet)) {
      expect(APP_IDS).toContain(id);
    }
  });

  it('haelt keine Zweige mehr vor, die der generische Weg schon abdeckt', () => {
    // Ein zurueckgelassener `case 'finder'` waere toter Code, der beim
    // naechsten Umbau als Vorbild dient.
    const zweige = [...quelle.matchAll(/case '([a-z-]+)':/g)].map(m => m[1]);
    const doppelt = zweige.filter(id => APP_IDS.includes(id));
    expect(doppelt).toEqual([]);
  });
});

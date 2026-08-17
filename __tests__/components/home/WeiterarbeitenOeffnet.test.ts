import { readFileSync } from 'fs';
import { join } from 'path';
import { APP_IDS } from '@/lib/apps/AppLoader';

/**
 * „Weiterarbeiten" merkt sich zuletzt geoeffnete Fenster und bietet sie
 * wieder an. Der Verlauf speichert den echten Fenstertyp — aber auf dem
 * Weg zur Anzeige wurde er auf eine grobe Kategorie (`kind`) eingedampft,
 * die nur fuenf Werte kennt. Alles andere fiel in einen Fallback, der
 * kommentarlos den Finder oeffnete.
 *
 * Der Nutzer klickte also „Ortsansicht" und bekam den Finder — mit dem
 * richtigen Namen im Verlauf, weil das Eintragen ja funktioniert hatte.
 * Betroffen waren 22 der 27 Apps.
 */

const quelle = readFileSync(join(process.cwd(), 'components/home/HomeSurface.tsx'), 'utf-8');

describe('Weiterarbeiten oeffnet, was draufsteht', () => {
  it('reicht den Fenstertyp bis zum Oeffnen durch', () => {
    // Ohne paneType kann die Funktion gar nicht wissen, was gemeint war.
    expect(quelle).toMatch(/paneType:\s*item\.paneType/);
  });

  it('oeffnet jede bekannte App ueber ihren Typ', () => {
    expect(quelle).toMatch(/APP_IDS\.includes\(/);
  });

  it('faellt nicht mehr stillschweigend auf den Finder zurueck', () => {
    // Der Fallback darf bleiben — aber erst, nachdem der Typ geprueft wurde.
    const stelle = quelle.indexOf('const openRecentActivity');
    const block = quelle.slice(stelle, stelle + 2200);
    const typPruefung = block.indexOf('APP_IDS.includes(');
    const rueckfall = block.lastIndexOf('openFinder();');
    expect(typPruefung).toBeGreaterThan(-1);
    expect(rueckfall).toBeGreaterThan(typPruefung);
  });
});

describe('Die Kategorien bleiben fuer die Anzeige', () => {
  it('kind wird weiterhin gesetzt — es steuert Symbol und Beschriftung', () => {
    expect(quelle).toMatch(/kindLabel|kindIcon/);
  });
});

describe('Gegenprobe', () => {
  it('die Sonderfaelle mit Zusatzdaten bleiben erhalten', () => {
    // Ein Dokument braucht seine nodeId, ein Ordner seine folderId —
    // ein generischer Aufruf ohne diese Daten oeffnete das falsche Fenster.
    expect(quelle).toMatch(/item\.paneData\?\.nodeId/);
    expect(quelle).toMatch(/item\.paneData\?\.folderId/);
  });

  it('earth ist eine bekannte App und damit abgedeckt', () => {
    expect(APP_IDS).toContain('earth');
  });
});

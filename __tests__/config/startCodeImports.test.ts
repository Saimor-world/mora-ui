/**
 * @jest-environment node
 *
 * Start-Code schlank halten (Audit S3–S6): Was eine Route statisch importiert,
 * landet in ihrem Start-Bundle. Dynamische Importe (next/dynamic, React.lazy)
 * zählen nicht, die laden erst bei Bedarf.
 */
import fs from 'fs';
import path from 'path';
import { ROOT, rel, staticClosure } from '../helpers/staticImportGraph';

const ROOT_LAYOUT = 'app/layout.tsx';
const OS_ROUTE = [ROOT_LAYOUT, 'app/os/layout.tsx', 'app/os/page.tsx'];
const LOGIN_ROUTE = [ROOT_LAYOUT, 'app/login/page.tsx'];
const WELCOME_ROUTE = [ROOT_LAYOUT, 'app/page.tsx'];

/** Die Oberflächen-Stile in der Reihenfolge, in der sie früher im Root-Layout standen. */
const SHELL_CSS = [
  'app/universe-v2.css',
  'app/live-polish.css',
  'pkg:react-grid-layout/css/styles.css',
  'pkg:react-resizable/css/styles.css',
  'app/os-brightness.css',
  'app/universe-materials.css',
  'app/world.css',
];

/** Alter Fenster-Stapel: darf nicht im Start-JS jeder Route stecken. */
const LEGACY_PANES = [
  'components/mora/PaneManager.tsx',
  'lib/apps/AppLoader.tsx',
  'components/panes/BrowserPane.tsx',
  'components/panes/WallPane.tsx',
  'components/panes/MoraHubPane.tsx',
];

/** Teile des alten Docks, die /os über CapsuleDockIcon mitgeschleppt hat. */
const LEGACY_DOCK = [
  'components/mora/LegacyDock.tsx',
  'components/os/NotificationCenter.tsx',
  'components/mora/SearchPopup.tsx',
  'components/mora/DockCommandDeck.tsx',
  'components/os/FocusMode.tsx',
];

const closure = (entries: string[]) => rel(staticClosure(entries));
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

describe('Start-Code: Root-Layout', () => {
  it('importiert den alten PaneManager nicht statisch', () => {
    const files = closure([ROOT_LAYOUT]);
    expect(files.filter((f) => LEGACY_PANES.includes(f))).toEqual([]);
  });

  it('lädt den PaneManager weiterhin, nur nachgeladen', () => {
    expect(read(ROOT_LAYOUT)).toMatch(/import\(\s*["']@\/components\/mora\/PaneManager["']\s*\)/);
  });

  it('bindet keine Oberflächen-Stile global ein', () => {
    const files = closure([ROOT_LAYOUT]);
    expect(files.filter((f) => SHELL_CSS.includes(f))).toEqual([]);
  });
});

describe('Start-Code: Einstiegsseiten', () => {
  it.each([
    ['/login', LOGIN_ROUTE],
    ['/', WELCOME_ROUTE],
  ])('%s lädt weder world.css noch universe-v2.css noch die übrigen OS-Stile', (_route, entries) => {
    const files = closure(entries as string[]);
    expect(files.filter((f) => SHELL_CSS.includes(f))).toEqual([]);
  });
});

describe('Start-Code: /os', () => {
  it('lädt alle Oberflächen-Stile weiterhin, in der alten Reihenfolge', () => {
    const files = closure(OS_ROUTE);
    expect(SHELL_CSS.filter((f) => !files.includes(f))).toEqual([]);
    const imports = [...read('app/shell-styles.ts').matchAll(/^import ['"]([^'"]+)['"];/gm)].map((m) =>
      m[1].startsWith('./') ? `app/${m[1].slice(2)}` : `pkg:${m[1]}`,
    );
    expect(imports).toEqual(SHELL_CSS);
  });

  it('Oberflächen-Stile kommen vor os-kit.css (Kaskade wie vorher)', () => {
    const src = read('app/os/layout.tsx');
    expect(src.indexOf("'../shell-styles'")).toBeGreaterThanOrEqual(0);
    expect(src.indexOf("'../shell-styles'")).toBeLessThan(src.indexOf('os-kit.css'));
  });

  it('lädt Control Center, Kürzel-Übersicht und MÔRA-Bühne erst bei Bedarf', () => {
    const files = closure(OS_ROUTE);
    const lazy = ['components/os-shell/ControlCenter.tsx', 'components/os-shell/ShortcutsOverlay.tsx', 'features/mora/ui/MoraStage.tsx'];
    expect(files.filter((f) => lazy.includes(f))).toEqual([]);
    const shell = read('components/os-shell/OsShell.tsx');
    for (const mod of ['./ControlCenter', './ShortcutsOverlay', '@/features/mora/ui/MoraStage']) {
      expect(shell).toContain(`import('${mod}')`);
    }
  });

  it('zieht den alten Dock nicht mehr über CapsuleDockIcon mit', () => {
    const files = closure(OS_ROUTE);
    expect(files).toContain('components/mora/Dock.tsx');
    expect(files.filter((f) => LEGACY_DOCK.includes(f))).toEqual([]);
  });
});

describe('Start-Code: klassische Oberfläche behält ihre Stile', () => {
  it.each([['app/home/page.tsx'], ['app/tunnel/layout.tsx']])('%s importiert die Oberflächen-Stile', (entry) => {
    const files = closure([entry]);
    expect(SHELL_CSS.filter((f) => !files.includes(f))).toEqual([]);
  });

  it('MoraShell nutzt den alten Dock aus LegacyDock', () => {
    expect(closure(['components/os/shell/MoraShell.tsx'])).toContain('components/mora/LegacyDock.tsx');
  });
});

describe('Dock.tsx enthält nur noch CapsuleDockIcon', () => {
  it('exportiert CapsuleDockIcon (und seine Props), sonst nichts', () => {
    const src = read('components/mora/Dock.tsx');
    const exported = [...src.matchAll(/^export (?:const|interface|function|type) (\w+)/gm)].map((m) => m[1]).sort();
    expect(exported).toEqual(['CapsuleDockIcon', 'CapsuleDockIconProps']);
  });

  it('importiert nur React', () => {
    const files = closure(['components/mora/Dock.tsx']);
    expect(files).toEqual(['components/mora/Dock.tsx', 'pkg:react']);
  });
});

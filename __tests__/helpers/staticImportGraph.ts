import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Statischer Import-Graph ab einer Startdatei, so wie er im Start-Bundle landet.
 * Gezählt werden `import … from` und `export … from` (ohne `import type`).
 * Dynamische Importe (`import()`, `next/dynamic`, `React.lazy`) werden bewusst
 * NICHT verfolgt: genau die laden erst bei Bedarf.
 */
export const ROOT = path.resolve(__dirname, '..', '..');
const EXT = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];

function resolveFile(base: string): string | null {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXT) if (fs.existsSync(base + e)) return base + e;
  for (const e of EXT) {
    const idx = path.join(base, 'index' + e);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

export function resolveSpecifier(spec: string, fromFile: string): string | null {
  if (spec.startsWith('@/')) return resolveFile(path.join(ROOT, spec.slice(2)));
  if (spec.startsWith('.')) return resolveFile(path.resolve(path.dirname(fromFile), spec));
  // Pakete: nicht hineinlaufen, aber als Knoten merken (z. B. "react-grid-layout/css/styles.css").
  return `pkg:${spec}`;
}

function staticSpecifiers(file: string): string[] {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      if (st.importClause?.isTypeOnly) continue;
      const named = st.importClause?.namedBindings;
      if (st.importClause && !st.importClause.name && named && ts.isNamedImports(named) &&
          named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)) continue;
      out.push((st.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.isTypeOnly) {
      out.push((st.moduleSpecifier as ts.StringLiteral).text);
    }
  }
  return out;
}

/** Alle statisch erreichbaren Dateien (absolute Pfade bzw. "pkg:…"). */
export function staticClosure(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const stack = entries.map((e) => (path.isAbsolute(e) ? e : path.join(ROOT, e)));
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (f.startsWith('pkg:') || !/\.(tsx?|jsx?|mjs)$/.test(f)) continue;
    for (const spec of staticSpecifiers(f)) {
      const r = resolveSpecifier(spec, f);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

/** Relative, POSIX-artige Pfade für lesbare Testausgaben. */
export function rel(set: Set<string>): string[] {
  return [...set].map((f) => (f.startsWith('pkg:') ? f : path.relative(ROOT, f).split(path.sep).join('/'))).sort();
}

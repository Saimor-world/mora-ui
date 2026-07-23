/**
 * Guards the source tree against mojibake.
 *
 * This estate has repaired mangled umlauts more than once (see
 * `fix(frnt): repair mangled umlaut/interpunct encoding`,
 * `fix(desk): restore UTF-8 safe layout metadata`). The failure is quiet and
 * expensive: an editor reads a file that is not valid UTF-8, cannot decode a
 * byte, substitutes U+FFFD (the replacement character) and saves. The original
 * character is then gone for good.
 *
 * It bit us in HomeSurface.test.tsx, where `Saimôr Desk` decayed into
 * `Saim\uFFFDr Desk` (spelled with an escape here on purpose — writing the
 * character itself would trip this very guard). Because that string sat
 * inside a *negative* assertion
 * (`queryByText(...)).not.toBeInTheDocument()`), the corrupted needle could
 * never match anything and the test stayed green while no longer guarding the
 * owner-only gate it was written for.
 *
 * Two distinct defects are caught here:
 *   - U+FFFD in the text        → a character was already destroyed
 *   - bytes that are not UTF-8  → a character is about to be destroyed
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
// jsdom does not expose a global TextDecoder; take Node's.
import { TextDecoder } from 'util';

const REPO_ROOT = join(__dirname, '..');
const SOURCE_DIRS = ['app', 'components', 'lib', 'hooks', '__tests__'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.md'];
const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', '_archive', 'coverage']);

const REPLACEMENT_CHARACTER = Buffer.from([0xef, 0xbf, 0xbd]);

function collectSourceFiles(dir: string): string[] {
    let entries: string[];
    try {
        entries = readdirSync(dir);
    } catch {
        return []; // optional directory
    }

    return entries.flatMap((entry) => {
        if (IGNORED_DIRS.has(entry)) return [];
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);
        return SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext)) ? [fullPath] : [];
    });
}

const sourceFiles = SOURCE_DIRS.flatMap((dir) => collectSourceFiles(join(REPO_ROOT, dir)));

describe('source encoding', () => {
    it('scans a meaningful number of files', () => {
        // A silently empty scan would make every assertion below vacuous —
        // exactly the failure mode this suite exists to catch.
        expect(sourceFiles.length).toBeGreaterThan(50);
    });

    it('contains no U+FFFD replacement characters', () => {
        const damaged = sourceFiles
            .filter((file) => readFileSync(file).includes(REPLACEMENT_CHARACTER))
            .map((file) => relative(REPO_ROOT, file).split(sep).join('/'));

        expect(damaged).toEqual([]);
    });

    it('is valid UTF-8 throughout', () => {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        const undecodable = sourceFiles
            .filter((file) => {
                try {
                    decoder.decode(readFileSync(file));
                    return false;
                } catch {
                    return true;
                }
            })
            .map((file) => relative(REPO_ROOT, file).split(sep).join('/'));

        expect(undecodable).toEqual([]);
    });
});

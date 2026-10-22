import fs from 'node:fs';
import path from 'node:path';

describe('Saimôr Finance launcher entry', () => {
    const loader = fs.readFileSync(path.join(process.cwd(), 'lib/apps/AppLoader.tsx'), 'utf8');

    it('loads the owner-gated Finance v2 app, not the removed legacy app', () => {
        expect(loader).toMatch(/finance:\s+dynamic\(\(\) => import\('@\/apps\/finance-v2'\)/);
        expect(loader).not.toMatch(/import\('@\/apps\/finance'\)/);
        expect(fs.existsSync(path.join(process.cwd(), 'apps/finance'))).toBe(false);
    });
});

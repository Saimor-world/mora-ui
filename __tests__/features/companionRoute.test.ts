import fs from 'fs';
import path from 'path';

describe('phone companion wiring', () => {
  const shell = fs.readFileSync(path.join(__dirname, '../../components/os-shell/OsShell.tsx'), 'utf8');
  it('renders the companion on phones with session boot', () => {
    expect(shell).toMatch(/if \(phone && !phoneUniverse[\s\S]*?<PhoneCompanion onOpenUniverse=/);
  });
  it('companion has no dock or planets', () => {
    const c = fs.readFileSync(path.join(__dirname, '../../features/companion/PhoneCompanion.tsx'), 'utf8');
    expect(c).not.toMatch(/^import .*(Dock|Universe|Planet|World)/m);
  });
});

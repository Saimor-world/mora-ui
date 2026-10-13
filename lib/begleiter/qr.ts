// QR als SVG-Pfad (ohne neue npm-Abhängigkeit; vendored qrcode-generator, MIT).
const qrcode = require('@/lib/vendor/qrcode-generator') as (t: number, l: 'L' | 'M' | 'Q' | 'H') => {
  addData: (s: string) => void; make: () => void; getModuleCount: () => number; isDark: (r: number, c: number) => boolean;
};

export function qrPath(text: string): { size: number; d: string } {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { size: n, d };
}

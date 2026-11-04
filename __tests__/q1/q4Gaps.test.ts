import fs from 'fs';
import path from 'path';
import { headerDate } from '@/features/home/cockpit/LiveCockpit';
const css = () => fs.readFileSync(path.join(process.cwd(), 'components/os-shell/bridge-concept.css'), 'utf8');

it('top bar shows only the date – no invented 07:00 that contradicts the dock clock', () => {
  const s = headerDate('2026-11-04', new Date('2026-11-04T14:55:00+01:00'));
  expect(s).toMatch(/4\. Nov/);
  expect(s).not.toMatch(/\d\d:\d\d/);
  expect(headerDate(null, new Date('2026-11-05T09:00:00+01:00'))).toMatch(/^Do\.?, 5\. Nov/);
});
it('no rim line runs across the lake', () => {
  expect(css()).toMatch(/\.bridge__hull path:not\(:first-of-type\) \{ display:none; \}/);
});
it('phone panel text sits on calm glass, not on the reflection', () => {
  expect(css()).toMatch(/max-width:699px\) \{ \.bridge__heart \.bridge__field \{ background:linear-gradient/);
});

// Saimôr Universe – Designsprache (abgeleitet von saimor.world). Eine Quelle für alle v2-Flächen.
export const UV = {
  ink: '#050706',
  cream: '#F7F4E9',
  gold: '#D6A848',
  goldGrad: 'linear-gradient(180deg,#E3BC63,#C9973A)',
  c: (a: number) => `rgba(247,244,233,${a})`,
  hair: 'rgba(247,244,233,.09)',
  border: 'rgba(164,190,182,.22)',
  serif: '"Cormorant Garamond", "Cormorant", Georgia, serif',
  sans: 'Inter, -apple-system, "SF Pro Text", system-ui, sans-serif',
  mono: 'Inter, -apple-system, system-ui, sans-serif',
  easeOut: 'cubic-bezier(0,0,0.2,1)',
  easeInOut: 'cubic-bezier(0.4,0,0.2,1)',
} as const;

/** Drei Größen pro Screen: Display/Aussage, Text, Meta. */
export const TYPE = {
  display: { fontFamily: UV.serif, fontSize: 64, lineHeight: 1.02, fontWeight: 400, letterSpacing: '-0.025em', fontVariantNumeric: 'lining-nums' as const },
  statement: { fontFamily: UV.serif, fontSize: 30, lineHeight: 1.22, fontWeight: 400, letterSpacing: '-0.01em', fontVariantNumeric: 'lining-nums' as const },
  text: { fontFamily: UV.sans, fontSize: 15, lineHeight: 1.6, fontWeight: 300 },
  meta: { fontFamily: UV.mono, fontSize: 13, lineHeight: 1.4, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
};

export function dateEyebrow(d = new Date()): string {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ' ·');
}

export const UV2_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&family=Space+Mono&display=swap';

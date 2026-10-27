/** Welche MÔRA-Figur das OS zeigt. Standard: Pixel-MÔRA aus dem Final-Set. Jade-Stein bleibt erhalten und ist per
 *  NEXT_PUBLIC_MORA_FIGURE=jade wieder einschaltbar. */
export type MoraFigure = 'pixel' | 'jade';
export const MORA_FIGURE: MoraFigure = process.env.NEXT_PUBLIC_MORA_FIGURE === 'jade' ? 'jade' : 'pixel';

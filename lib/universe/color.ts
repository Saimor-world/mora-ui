/** Gemeinsame Farbkonvertierung fuer alles, was Canvas im Universe-Feld zeichnet. */
export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean.padEnd(6, '0').slice(0, 6);
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

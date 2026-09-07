export const SAIMOR_OS_PRODUCT = 'saimor-os' as const;

export const SAIMOR_SURFACES = {
  home: 'home',
  work: 'work',
  communication: 'communication',
  knowledge: 'knowledge',
  systems: 'systems',
  moraPresence: 'mora-presence',
} as const;

export type SaimorSurface = (typeof SAIMOR_SURFACES)[keyof typeof SAIMOR_SURFACES];

export const SAIMOR_PRODUCT_LABEL = 'Saimôr OS';

/**
 * Product contract for the convergence from the historical OS + Desk split.
 *
 * There is one user-facing product: Saimôr OS.
 * The old Desk is migration inventory only. Its useful capabilities become
 * native OS surfaces and apps on the same Engine, identity and CORE truth.
 */
export const SAIMOR_PRODUCT_CONTRACT = {
  product: SAIMOR_OS_PRODUCT,
  label: SAIMOR_PRODUCT_LABEL,
  primarySurface: SAIMOR_SURFACES.home,
  rules: {
    oneProduct: true,
    sharedTruth: 'core',
    intelligenceLayer: 'mora',
    runtimeLayer: 'engine',
    conversationIsCapability: true,
    historicalDeskIsProduct: false,
  },
} as const;

export function surfaceMarker(surface: SaimorSurface) {
  return {
    'data-saimor-product': SAIMOR_OS_PRODUCT,
    'data-saimor-surface': surface,
    'data-saimor-runtime': 'canonical-os',
  } as const;
}

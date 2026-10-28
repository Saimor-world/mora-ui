/** Rahmen der Brückenscheibe: dunkler Rand, zwei Kanzelstreben, ein leiser Glasreflex. Rein dekorativ. */
export function CockpitWindow() {
  return (
    <div className="ck-window" aria-hidden>
      <div className="ck-window__pane" />
      <svg className="ck-window__ribs" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M17 0 L0 28 M83 0 L100 28" />
        <path className="ck-window__metal" d="M17 0 L0 28 M83 0 L100 28" />
        <path className="ck-window__hi" d="M17.3 0 L.3 28 M82.7 0 L99.7 28" />
      </svg>
      <div className="ck-window__glare" />
    </div>
  );
}

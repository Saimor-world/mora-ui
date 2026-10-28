/** Rahmen der Brückenscheibe: dunkler Rand, zwei Kanzelstreben, ein leiser Glasreflex. Rein dekorativ. */
export function CockpitWindow() {
  return (
    <div className="ck-window" aria-hidden>
      <div className="ck-window__pane" />
      <svg className="ck-window__ribs" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M27 0 Q 6 5 0 34" />
        <path d="M73 0 Q 94 5 100 34" />
        <path className="ck-window__hi" d="M27.4 0 Q 6.6 5.2 0.4 34" />
        <path className="ck-window__hi" d="M72.6 0 Q 93.4 5.2 99.6 34" />
      </svg>
      <div className="ck-window__glare" />
    </div>
  );
}

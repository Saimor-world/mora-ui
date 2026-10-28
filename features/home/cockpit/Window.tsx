/** Rahmen der Brückenscheibe: dunkler Rand, zwei Kanzelstreben, ein leiser Glasreflex. Rein dekorativ. */
export function CockpitWindow() {
  return (
    <div className="ck-window" aria-hidden>
      <div className="ck-window__pane" />
      <div className="ck-window__glare" />
    </div>
  );
}

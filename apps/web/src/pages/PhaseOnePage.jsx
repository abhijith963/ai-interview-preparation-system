export function PhaseOnePage({ description, phase, title }) {
  return (
    <section aria-labelledby="page-title" className="max-w-3xl">
      <p className="eyebrow">{phase}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl" id="page-title">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
      <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        This route is intentionally a placeholder. Its feature phase has not started.
      </div>
    </section>
  );
}

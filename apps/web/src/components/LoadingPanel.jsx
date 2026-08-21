export function LoadingPanel({ label = 'Loading…' }) {
  return (
    <div aria-live="polite" className="card flex items-center gap-3 text-sm text-slate-600">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
      />
      {label}
    </div>
  );
}

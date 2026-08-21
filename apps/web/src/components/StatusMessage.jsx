export function StatusMessage({ children, tone = 'info' }) {
  const toneClasses = {
    error: 'border-red-200 bg-red-50 text-red-800',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };

  return (
    <div
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm ${toneClasses[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

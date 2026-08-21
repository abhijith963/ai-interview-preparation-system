import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/use-auth.js';
import { StatusMessage } from '../components/StatusMessage.jsx';

export function AccountPage() {
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteAccount, user } = useAuth();
  const navigate = useNavigate();

  const handleDelete = async (event) => {
    event.preventDefault();
    if (!window.confirm('Permanently delete your account and all stored application data?')) return;
    setError('');
    setIsDeleting(true);
    const form = new FormData(event.currentTarget);
    try {
      await deleteAccount({ confirmation: form.get('confirmation'), password: form.get('password') });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Account and privacy</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Your account</h1>
      </section>

      <section className="card">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 font-medium text-slate-950">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Consent version</dt>
            <dd className="mt-1 font-medium text-slate-950">{user.consent.version}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6" aria-labelledby="delete-title">
        <h2 className="font-semibold text-red-950" id="delete-title">Delete account</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">
          This removes your account, active resume, interview sessions, role preference,
          competency records, and readiness snapshots.
        </p>
        <form className="mt-5 max-w-lg space-y-4" onSubmit={handleDelete}>
          <label className="field-label text-red-950">
            Password
            <input className="field-input" name="password" required type="password" />
          </label>
          <label className="field-label text-red-950">
            Type DELETE to confirm
            <input className="field-input" name="confirmation" pattern="DELETE" required />
          </label>
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <button className="button-danger" disabled={isDeleting} type="submit">
            {isDeleting ? 'Deleting…' : 'Delete account'}
          </button>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

const statusLabels = {
  AWAITING_ANSWER: 'In progress',
  COMPLETED: 'Completed',
  CREATED: 'Starting',
  ENDED_EARLY: 'Ended early',
  ERROR: 'Needs retry',
  EVALUATING_ANSWER: 'Evaluating answer',
  GENERATING_QUESTION: 'Generating question',
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function InterviewHistoryPage() {
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest(`/interviews?page=${page}&pageSize=20`)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  const changePage = (nextPage) => {
    setError('');
    setIsLoading(true);
    setPage(nextPage);
  };

  const handleDelete = async (interview) => {
    const date = formatDate(
      interview.completedAt ?? interview.startedAt ?? interview.createdAt,
    );
    const recalculationWarning =
      interview.status === 'COMPLETED'
        ? ` Deleting it will recalculate ${interview.role.label} competency and readiness from the remaining completed interviews.`
        : '';
    if (
      !window.confirm(
        `Permanently delete the ${interview.role.label} interview from ${date}?${recalculationWarning}`,
      )
    ) {
      return;
    }

    setError('');
    setSuccess('');
    setPendingDeleteId(interview.id);
    try {
      const data = await apiRequest(`/interviews/${interview.id}`, {
        body: { confirmation: 'DELETE' },
        method: 'DELETE',
      });
      setHistory((current) => ({
        ...current,
        items: current.items.filter(({ id }) => id !== interview.id),
        pagination: {
          ...current.pagination,
          totalItems: Math.max(0, current.pagination.totalItems - 1),
        },
      }));
      setSuccess(
        data.recalculated
          ? `Interview deleted. ${data.role.label} competency and readiness were recalculated.`
          : 'Interview deleted.',
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Interview history</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Continue or review your practice.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Completed and incomplete sessions stay private to your account and remain separated by target role.
          </p>
        </div>
        <Link className="button-primary" to="/interviews/new">Start interview</Link>
      </section>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}
      {isLoading ? <LoadingPanel label="Loading interview history…" /> : null}

      {!isLoading && history?.items.length === 0 ? (
        <section className="card border-dashed text-center">
          <h2 className="text-xl font-semibold text-slate-950">No interviews yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Start a ten-question interview to create your first record.
          </p>
          <Link className="button-primary mt-5" to="/interviews/new">Start interview</Link>
        </section>
      ) : null}

      {!isLoading && history?.items.length ? (
        <section aria-label="Saved interviews" className="space-y-4">
          {history.items.map((interview) => (
            <article className="card" key={interview.id}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-950">{interview.role.label}</h2>
                    <span className="status-pill bg-slate-100 text-slate-700">
                      {statusLabels[interview.status] ?? interview.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {formatDate(interview.completedAt ?? interview.startedAt ?? interview.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    {interview.score === null
                      ? `${interview.answeredCount} of ${interview.questionCount} answers evaluated`
                      : `Session score ${interview.score}/100`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="button-secondary"
                    to={
                      interview.canOpenResult
                        ? `/interviews/${interview.id}/results`
                        : `/interviews/${interview.id}`
                    }
                  >
                    {interview.canOpenResult ? 'View result' : 'Resume interview'}
                  </Link>
                  <button
                    className="button-danger"
                    disabled={pendingDeleteId === interview.id}
                    onClick={() => handleDelete(interview)}
                    type="button"
                  >
                    {pendingDeleteId === interview.id
                      ? 'Deleting and recalculating…'
                      : 'Delete'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {history && history.pagination.totalPages > 1 ? (
        <nav aria-label="Interview history pages" className="flex items-center justify-between gap-4">
          <button
            className="button-secondary"
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
            type="button"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {history.pagination.totalPages}
          </span>
          <button
            className="button-secondary"
            disabled={page >= history.pagination.totalPages}
            onClick={() => changePage(page + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

const consistencyLabels = {
  INCONSISTENT: 'Inconsistent',
  NEEDS_CLARIFICATION: 'Needs clarification',
  SUPPORTED: 'Supported / explained',
};

export function InterviewResultsPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState(null);
  const { interviewId } = useParams();

  useEffect(() => {
    apiRequest(`/interviews/${interviewId}/report`)
      .then((data) => setReport(data.report))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [interviewId]);

  if (isLoading) return <LoadingPanel label="Building your session result…" />;
  if (!report) {
    return (
      <div className="space-y-4">
        <StatusMessage tone="error">{error || 'The result could not be loaded.'}</StatusMessage>
        <Link className="button-secondary" to={`/interviews/${interviewId}`}>
          Return to interview
        </Link>
      </div>
    );
  }

  const resumeObservations = report.items
    .map(({ evaluation }) => evaluation?.resumeConsistency)
    .filter((observation) => observation && observation.status !== 'NOT_APPLICABLE');

  const voiceMetrics = report.items
    .map(({ evaluation }) => evaluation?.voiceMetrics)
    .filter(Boolean);

  const averageVoiceMetrics = voiceMetrics.length
    ? (() => {
        const paces = voiceMetrics
          .map((metric) => metric.speakingPaceWpm)
          .filter((value) => Number.isFinite(value));
        return {
          speakingPaceWpm: paces.length
            ? Math.round(paces.reduce((total, value) => total + value, 0) / paces.length)
            : null,
          wordCount: Math.round(
            voiceMetrics.reduce((total, metric) => total + metric.wordCount, 0) / voiceMetrics.length,
          ),
          fillerCount: voiceMetrics.reduce((total, metric) => total + metric.fillerCount, 0),
          fillerRatePerMinute: Number(
            (
              voiceMetrics.reduce((total, metric) => total + (metric.fillerRatePerMinute ?? 0), 0) /
              voiceMetrics.length
            ).toFixed(2),
          ),
        };
      })()
    : null;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-8 text-white sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-100">
          {report.result.isComplete ? 'Interview complete' : 'Interview ended early'} · {report.role.label}
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Session result</h1>
            <p className="mt-3 max-w-2xl text-indigo-100">
              Based on {report.result.completedQuestionCount} evaluated written answer{report.result.completedQuestionCount === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 px-6 py-4 text-center">
            <span className="block text-4xl font-bold">{report.result.overallSessionScore}</span>
            <span className="text-sm text-indigo-100">Overall score / 100</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="dimensions-title">
        <p className="eyebrow">Five-dimension breakdown</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="dimensions-title">
          Written-answer performance
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {report.scoringDimensions.map(({ id, label }) => (
            <article className="card" key={id}>
              <p className="text-sm font-medium leading-5 text-slate-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {report.result.dimensionBreakdown[id].normalizedScore}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Average {report.result.dimensionBreakdown[id].averageRaw}/5
              </p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Professional Certainty describes written presentation only, never psychology,
          emotion, personality, honesty, or voice confidence.
        </p>
      </section>

      {averageVoiceMetrics ? (
        <section aria-labelledby="voice-title">
          <p className="eyebrow">Communication (voice)</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="voice-title">
            Voice practice signals
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Averages across {voiceMetrics.length} recorded answer{voiceMetrics.length === 1 ? '' : 's'}.
            These are practice signals from the recordings and transcripts, not personality,
            confidence, or honesty. They never change the technical score above.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="card">
              <p className="text-sm font-medium leading-5 text-slate-600">Speaking pace</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {averageVoiceMetrics.speakingPaceWpm ?? '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">words per minute</p>
            </article>
            <article className="card">
              <p className="text-sm font-medium leading-5 text-slate-600">Words spoken</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{averageVoiceMetrics.wordCount}</p>
              <p className="mt-1 text-xs text-slate-500">average per answer</p>
            </article>
            <article className="card">
              <p className="text-sm font-medium leading-5 text-slate-600">Filler words</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{averageVoiceMetrics.fillerCount}</p>
              <p className="mt-1 text-xs text-slate-500">total across answers</p>
            </article>
            <article className="card">
              <p className="text-sm font-medium leading-5 text-slate-600">Filler rate</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {averageVoiceMetrics.fillerRatePerMinute ?? '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">per minute</p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2">
        <article className="card">
          <h2 className="text-xl font-semibold text-slate-950">Strengths observed</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {report.result.strengths.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article className="card">
          <h2 className="text-xl font-semibold text-slate-950">Areas to improve</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {report.result.areasToImprove.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      {resumeObservations.length ? (
        <section className="card" aria-labelledby="consistency-title">
          <h2 className="text-xl font-semibold text-slate-950" id="consistency-title">
            Resume consistency observations
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These observations compare only your confirmed claim with the related written answer.
          </p>
          <div className="mt-5 space-y-4">
            {resumeObservations.map((observation, index) => (
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={`${observation.claim.claimId}-${index}`}>
                <p className="text-sm font-semibold text-slate-950">
                  {consistencyLabels[observation.status]}
                </p>
                <p className="mt-2 text-sm text-slate-600">Claim: {observation.claim.text}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{observation.explanation}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="questions-title">
        <p className="eyebrow">Question review</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="questions-title">
          Per-question results
        </h2>
        <div className="mt-5 space-y-4">
          {report.items.map(({ answerText, evaluation, question, voiceMetrics: itemVoiceMetrics }) => (
            <details className="card group" key={question.id}>
              <summary className="cursor-pointer list-none font-semibold text-slate-950">
                <span className="flex flex-wrap items-center justify-between gap-3">
                  <span>Question {question.position}: {question.questionText}</span>
                  <span className="status-pill bg-slate-100 text-slate-700">
                    {evaluation ? `${evaluation.answerScore}/100` : 'Not answered'}
                  </span>
                </span>
              </summary>
              <div className="mt-5 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
                <p><strong className="text-slate-950">Difficulty:</strong> {question.difficulty}</p>
                {itemVoiceMetrics ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Voice: {itemVoiceMetrics.speakingPaceWpm ?? '—'} wpm · {itemVoiceMetrics.wordCount} words · {itemVoiceMetrics.fillerCount} fillers
                  </p>
                ) : null}
                <p className="mt-3 whitespace-pre-line"><strong className="text-slate-950">Your answer:</strong> {answerText ?? 'Not answered.'}</p>
                {evaluation ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <strong className="text-slate-950">Strengths</strong>
                      <ul className="mt-1 list-disc pl-5">{evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div>
                      <strong className="text-slate-950">Improve</strong>
                      <ul className="mt-1 list-disc pl-5">{[...evaluation.missingOrIncorrectPoints, ...evaluation.improvementAdvice].map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link className="button-primary" to="/interviews/new">Start another interview</Link>
        <Link className="button-secondary" to="/dashboard">Return to dashboard</Link>
      </div>

      <StatusMessage>
        This session score is not a probability of getting a job. Role competency and the
        Interview Preparation Readiness Score are calculated separately on your dashboard.
      </StatusMessage>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

const dimensionLabels = {
  communicationClarity: 'Communication Clarity',
  logicalStructure: 'Logical Structure',
  professionalCertainty: 'Professional Certainty',
  responseRelevance: 'Response Relevance',
  technicalAccuracy: 'Technical / Content Accuracy',
};

const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `answer-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function LiveInterviewPage() {
  const [answerText, setAnswerText] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState(null);
  const submission = useRef({ key: null, questionId: null });
  const { interviewId } = useParams();
  const navigate = useNavigate();

  const loadSession = useCallback(async () => {
    try {
      const data = await apiRequest(`/interviews/${interviewId}`);
      if (['COMPLETED', 'ENDED_EARLY'].includes(data.session.status)) {
        navigate(`/interviews/${interviewId}/results`, { replace: true });
        return;
      }
      setView(data);
      if (data.error && data.lastEvaluation) setFeedback(data.lastEvaluation);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [interviewId, navigate]);

  useEffect(() => {
    let active = true;
    apiRequest(`/interviews/${interviewId}`)
      .then((data) => {
        if (!active) return;
        if (['COMPLETED', 'ENDED_EARLY'].includes(data.session.status)) {
          navigate(`/interviews/${interviewId}/results`, { replace: true });
          return;
        }
        setView(data);
        if (data.error && data.lastEvaluation) setFeedback(data.lastEvaluation);
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
  }, [interviewId, navigate]);

  const applyOperationResult = (data) => {
    setView({
      currentQuestion: data.nextQuestion,
      error: null,
      lastEvaluation: data.evaluation,
      session: data.session,
    });
    setFeedback(data.evaluation);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedAnswer = answerText.trim();
    if (!trimmedAnswer) {
      setError('Write an answer before submitting.');
      return;
    }

    const question = view.currentQuestion;
    if (submission.current.questionId !== question.id) {
      submission.current = { key: newIdempotencyKey(), questionId: question.id };
    }
    setError('');
    setIsProcessing(true);
    try {
      const data = await apiRequest(`/interviews/${interviewId}/answers`, {
        body: { answerText: trimmedAnswer, questionId: question.id },
        headers: { 'Idempotency-Key': submission.current.key },
        method: 'POST',
      });
      applyOperationResult(data);
    } catch (requestError) {
      setError(requestError.message);
      try {
        const latest = await apiRequest(`/interviews/${interviewId}`);
        setView(latest);
        if (latest.lastEvaluation) setFeedback(latest.lastEvaluation);
      } catch {
        // Keep the original actionable request error when status refresh also fails.
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    setError('');
    setIsProcessing(true);
    try {
      const data = await apiRequest(`/interviews/${interviewId}/retry`, {
        method: 'POST',
      });
      applyOperationResult(data);
    } catch (requestError) {
      setError(requestError.message);
      await loadSession();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    if (view.session.status === 'COMPLETED') {
      navigate(`/interviews/${interviewId}/results`);
      return;
    }
    setAnswerText('');
    setFeedback(null);
    submission.current = { key: null, questionId: null };
  };

  const handleEndEarly = async () => {
    if (!window.confirm('End this interview before all 10 questions are complete?')) return;
    setError('');
    setIsProcessing(true);
    try {
      await apiRequest(`/interviews/${interviewId}/complete`, {
        body: { endEarly: true },
        method: 'POST',
      });
      navigate(`/interviews/${interviewId}/results`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <LoadingPanel label="Restoring your interview…" />;
  if (!view) {
    return <StatusMessage tone="error">{error || 'The interview could not be loaded.'}</StatusMessage>;
  }

  const { currentQuestion, session } = view;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Live interview · {session.role.label}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Question {currentQuestion?.position ?? session.answeredCount} of {session.questionCount}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="status-pill bg-indigo-100 text-indigo-800">
            {currentQuestion?.difficulty ?? session.currentDifficulty}
          </span>
          <span className="text-sm text-slate-500">{session.answeredCount} evaluated</span>
        </div>
      </section>

      <div
        aria-label={`${session.answeredCount} of ${session.questionCount} questions evaluated`}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemax={session.questionCount}
        aria-valuemin="0"
        aria-valuenow={session.answeredCount}
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${(session.answeredCount / session.questionCount) * 100}%` }}
        />
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      {view.error ? (
        <section className="card border-amber-200 bg-amber-50" aria-labelledby="retry-title">
          <p className="eyebrow">Recoverable interruption</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950" id="retry-title">
            This interview step needs to be retried.
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{view.error.message}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="button-primary" disabled={isProcessing} onClick={handleRetry} type="button">
              {isProcessing ? 'Retrying…' : 'Retry AI step'}
            </button>
            <button className="button-secondary" disabled={isProcessing} onClick={handleEndEarly} type="button">
              End interview
            </button>
          </div>
        </section>
      ) : null}

      {feedback ? (
        <section className="card" aria-labelledby="feedback-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Answer feedback</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="feedback-title">
                Score: {feedback.answerScore}/100
              </h2>
            </div>
            <span className="status-pill status-ready">
              {feedback.difficultyTransition.decision === 'HOLD'
                ? 'Difficulty held'
                : `Difficulty ${feedback.difficultyTransition.decision.toLowerCase()}d`}
            </span>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(feedback.dimensionScores).map(([dimension, score]) => (
              <div className="rounded-xl bg-slate-50 p-3" key={dimension}>
                <dt className="text-xs font-medium text-slate-500">{dimensionLabels[dimension]}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-950">{score}/5</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-950">What worked</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                {feedback.strengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-950">Improve next</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                {[...feedback.missingOrIncorrectPoints, ...feedback.improvementAdvice].map(
                  (item) => <li key={item}>{item}</li>,
                )}
              </ul>
            </div>
          </div>

          {feedback.resumeConsistency.status !== 'NOT_APPLICABLE' ? (
            <StatusMessage>
              <strong>Resume consistency — {feedback.resumeConsistency.status.replaceAll('_', ' ')}:</strong>{' '}
              {feedback.resumeConsistency.explanation}
            </StatusMessage>
          ) : null}

          {!view.error ? (
            <button className="button-primary mt-6" onClick={handleContinue} type="button">
              {session.status === 'COMPLETED' ? 'View final result' : 'Continue to next question'}
            </button>
          ) : null}
        </section>
      ) : currentQuestion && !view.error ? (
        <section className="card">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>{currentQuestion.primarySkillId.replaceAll('-', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>{currentQuestion.questionType === 'RESUME_PROJECT' ? 'Resume based' : 'Role based'}</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold leading-8 text-slate-950">
            {currentQuestion.questionText}
          </h2>
          <form className="mt-7" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="interview-answer">
              Your written answer
            </label>
            <textarea
              className="field-input min-h-56 resize-y"
              disabled={isProcessing}
              id="interview-answer"
              maxLength={10_000}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Explain your reasoning, relevant concepts, and trade-offs…"
              value={answerText}
            />
            <div className="mt-2 flex justify-between gap-4 text-xs text-slate-500">
              <span>Evaluation considers only this written response.</span>
              <span>{answerText.length}/10,000</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="button-primary" disabled={isProcessing} type="submit">
                {isProcessing ? 'Evaluating and preparing next question…' : 'Submit answer'}
              </button>
              <button className="button-secondary" disabled={isProcessing} onClick={handleEndEarly} type="button">
                End interview
              </button>
            </div>
          </form>
        </section>
      ) : !view.error ? (
        <section className="card text-center">
          <h2 className="font-semibold text-slate-950">Interview operation in progress</h2>
          <p className="mt-2 text-sm text-slate-600">
            Refresh the saved session state if this page was opened during processing.
          </p>
          <button className="button-secondary mt-5" onClick={loadSession} type="button">
            Refresh status
          </button>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-slate-500">
        Professional Certainty evaluates written-answer presentation only. It does not measure
        psychological confidence, emotion, personality, honesty, or voice confidence.
      </p>
    </div>
  );
}

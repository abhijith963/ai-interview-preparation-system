import { ROLE_PROFILES } from '@ai-interview/shared';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '../auth/use-auth.js';
import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

const componentLabels = {
  improvementTrend: 'Improvement trend',
  recentPerformance: 'Recent interview performance',
  resumeConsistency: 'Resume consistency',
  roleSkillCompetency: 'Required-skill competency',
};

const evidenceConfidenceLabels = {
  DEVELOPING: 'Developing Evidence',
  ESTABLISHED: 'Established Evidence',
  INSUFFICIENT: 'Insufficient Evidence',
};

const topicStatusLabels = {
  NEEDS_MORE_EVIDENCE: 'Needs More Evidence',
  ON_TRACK: 'On Track',
  WEAK_TOPIC: 'Weak Topic',
};

const trendLabels = {
  DECLINING: 'Declining',
  IMPROVING: 'Improving',
  INSUFFICIENT_EVIDENCE: 'Trend Needs More Evidence',
  STABLE: 'Stable',
};

const statusLabels = {
  AWAITING_ANSWER: 'In progress',
  COMPLETED: 'Completed',
  CREATED: 'Starting',
  ENDED_EARLY: 'Ended early',
  ERROR: 'Needs retry',
  EVALUATING_ANSWER: 'Evaluating',
  GENERATING_QUESTION: 'Generating',
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
    : 'Not completed';

export function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(user.selectedRoleId));
  const [viewRoleId, setViewRoleId] = useState(user.selectedRoleId ?? '');
  const selectedRole = ROLE_PROFILES.find(({ id }) => id === viewRoleId);

  useEffect(() => {
    if (!viewRoleId) return;
    let active = true;
    apiRequest(`/dashboard?roleId=${encodeURIComponent(viewRoleId)}`)
      .then((data) => {
        if (active) setAnalytics(data);
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
  }, [viewRoleId]);

  const handleRoleViewChange = (event) => {
    const nextRoleId = event.target.value;
    setAnalytics(null);
    setError('');
    setIsLoading(Boolean(nextRoleId));
    setViewRoleId(nextRoleId);
  };

  const chartSkills = useMemo(
    () =>
      analytics?.competency.skills
        .filter(({ evidenceCount }) => evidenceCount > 0)
        .sort((left, right) => right.evidenceCount - left.evidenceCount)
        .slice(0, 10) ?? [],
    [analytics],
  );
  const needsEvidenceSkills =
    analytics?.competency.skills.filter(
      ({ topicStatus }) => topicStatus === 'NEEDS_MORE_EVIDENCE',
    ) ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Your preparation workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Welcome{user.displayName ? `, ${user.displayName}` : ''}.
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Review role-specific evidence, choose the next practice focus, and continue building
            interview preparation readiness.
          </p>
        </div>
        <Link className="button-primary" to="/interviews/new">Start interview</Link>
      </section>

      <section className="card flex flex-wrap items-end justify-between gap-5">
        <label className="field-label max-w-sm flex-1" htmlFor="dashboard-role">
          Viewing analytics for
          <select
            className="field-input"
            id="dashboard-role"
            onChange={handleRoleViewChange}
            value={viewRoleId}
          >
            <option value="">Select a role</option>
            {ROLE_PROFILES.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
        </label>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          This view is role-specific. Changing it does not change your saved interview target;
          use Interview Setup when you want to change that target.
        </p>
      </section>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {isLoading ? <LoadingPanel label="Calculating preparation analytics…" /> : null}

      {!viewRoleId && !isLoading ? (
        <section className="card border-dashed text-center">
          <h2 className="text-xl font-semibold text-slate-950">Select a target role first</h2>
          <p className="mt-2 text-sm text-slate-600">
            Competency and readiness remain separate for each approved software role.
          </p>
          <Link className="button-primary mt-5" to="/interviews/new">Choose target role</Link>
        </section>
      ) : null}

      {analytics && !isLoading ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <article className="min-w-0 rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-100">
                Interview Preparation Readiness Score
              </p>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="text-6xl font-bold">{analytics.readiness.score}%</p>
                  <p className="mt-2 text-indigo-100">{analytics.targetRole.label}</p>
                </div>
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                  {analytics.readiness.evidenceLevelLabel}
                </span>
              </div>
              <p className="mt-6 text-sm leading-6 text-indigo-100">
                {analytics.readiness.explanation}
              </p>
              <p className="mt-4 text-xs leading-5 text-indigo-100">
                {analytics.readiness.disclaimer}
              </p>
            </article>

            <article className="card min-w-0">
              <h2 className="text-xl font-semibold text-slate-950">What affects this score</h2>
              <dl className="mt-5 space-y-4">
                {Object.entries(analytics.readiness.components).map(([id, component]) => (
                  <div
                    className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    key={id}
                  >
                    <dt className="text-sm text-slate-600">
                      {componentLabels[id]}
                      <span className="block text-xs text-slate-600">
                        {component.available
                          ? `${Math.round(component.effectiveWeight * 100)}% effective weight`
                          : 'Not currently included'}
                      </span>
                    </dt>
                    <dd className="text-lg font-semibold text-slate-950">
                      {component.available ? `${component.score}%` : '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </section>

          {analytics.readiness.missingEvidence.length ? (
            <section className="card border-amber-200 bg-amber-50" aria-labelledby="missing-evidence-title">
              <h2 className="font-semibold text-slate-950" id="missing-evidence-title">Missing evidence</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                {analytics.readiness.missingEvidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="card" aria-labelledby="performance-title">
              <h2 className="text-xl font-semibold text-slate-950" id="performance-title">
                Recent performance trend
              </h2>
              {analytics.performanceTrend.length ? (
                <>
                  <div aria-hidden="true" className="mt-5 h-64">
                    <ResponsiveContainer height="100%" width="100%">
                      <LineChart
                        accessibilityLayer={false}
                        data={analytics.performanceTrend}
                        margin={{ left: -20, right: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="completedAt" tickFormatter={formatDate} />
                        <YAxis domain={[0, 100]} />
                        <Line dataKey="score" dot stroke="#4f46e5" strokeWidth={3} type="monotone" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ol aria-label="Recent performance scores" className="mt-4 space-y-2 text-sm text-slate-600">
                    {analytics.performanceTrend.map((item, index) => (
                      <li className="flex justify-between gap-4" key={item.sessionId}>
                        <span>Session {index + 1} · {formatDate(item.completedAt)}</span>
                        <strong className="text-slate-950">{item.score}/100</strong>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Complete an interview to begin this trend.</p>
              )}
            </article>

            <article className="card" aria-labelledby="competency-chart-title">
              <h2 className="text-xl font-semibold text-slate-950" id="competency-chart-title">
                Skill competency overview
              </h2>
              {chartSkills.length ? (
                <div aria-hidden="true" className="mt-5 h-64">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      accessibilityLayer={false}
                      data={chartSkills}
                      layout="vertical"
                      margin={{ left: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis domain={[0, 100]} type="number" />
                      <YAxis dataKey="skillLabel" hide type="category" />
                      <Bar dataKey="score" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">No evaluated skill evidence yet.</p>
              )}
            </article>
          </section>

          <section aria-labelledby="skill-list-title">
            <p className="eyebrow">Readable chart alternative</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="skill-list-title">
              All required skills
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {analytics.competency.skills.map((skill) => (
                <article
                  className="card flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:gap-5"
                  key={skill.skillId}
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-950">{skill.skillLabel}</h3>
                    <p className="mt-1 text-sm text-slate-500">{skill.categoryLabel}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {skill.evidenceCount} evidence · {evidenceConfidenceLabels[skill.evidenceConfidence]}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Easy {skill.difficultyCoverage.EASY} · Medium {skill.difficultyCoverage.MEDIUM} · Hard {skill.difficultyCoverage.HARD}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {topicStatusLabels[skill.topicStatus]} · {trendLabels[skill.trend.direction]}
                      {skill.trend.delta === null ? '' : ` (${skill.trend.delta >= 0 ? '+' : ''}${skill.trend.delta})`}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-2xl font-semibold text-slate-950">{skill.score}</p>
                    <p className="text-xs text-slate-500">out of 100</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <article className="card">
              <h2 className="text-lg font-semibold text-slate-950">Strongest skills</h2>
              {analytics.strongestSkills.length ? (
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {analytics.strongestSkills.map((skill) => (
                    <li className="flex justify-between gap-4" key={skill.skillId}>
                      <span>{skill.skillLabel}</span><strong>{skill.score}/100</strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-600">More evidence is needed.</p>}
            </article>
            <article className="card">
              <h2 className="text-lg font-semibold text-slate-950">Weak topics</h2>
              {analytics.weakTopics.length ? (
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {analytics.weakTopics.map((skill) => (
                    <li key={skill.skillId}>{skill.skillLabel} · {skill.score}/100</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  No skill has both enough evidence and a score below 60.
                </p>
              )}
              {needsEvidenceSkills.length ? (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-950">Needs More Evidence</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {needsEvidenceSkills.slice(0, 4).map(({ skillLabel }) => skillLabel).join(', ')}
                    {needsEvidenceSkills.length > 4 ? ` and ${needsEvidenceSkills.length - 4} more` : ''}.
                  </p>
                </div>
              ) : null}
            </article>
            <article className="card">
              <h2 className="text-lg font-semibold text-slate-950">Targeted practice</h2>
              <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                {analytics.recommendations.map((recommendation) => (
                  <li key={`${recommendation.type}-${recommendation.text}`}>
                    <strong className="block text-slate-950">{recommendation.text}</strong>
                    {recommendation.reason}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">Recent interviews</h2>
              <Link className="button-secondary" to="/history">View all history</Link>
            </div>
            {analytics.recentInterviews.length ? (
              <ul className="mt-5 divide-y divide-slate-200">
                {analytics.recentInterviews.map((interview) => {
                  const resultAvailable = ['COMPLETED', 'ENDED_EARLY'].includes(interview.status);
                  return (
                    <li className="flex flex-wrap items-center justify-between gap-4 py-4" key={interview.id}>
                      <div>
                        <p className="font-semibold text-slate-950">{interview.role.label}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(interview.completedAt ?? interview.startedAt ?? interview.createdAt)} ·{' '}
                          {statusLabels[interview.status] ?? interview.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-950">
                          {interview.score === null ? `${interview.answeredCount}/${interview.questionCount}` : `${interview.score}/100`}
                        </span>
                        <Link
                          className="button-quiet"
                          to={resultAvailable ? `/interviews/${interview.id}/results` : `/interviews/${interview.id}`}
                        >
                          {resultAvailable ? 'View result' : 'Resume interview'}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-4 text-sm text-slate-600">No interviews yet.</p>}
          </section>
        </>
      ) : null}

      {selectedRole && selectedRole.id !== user.selectedRoleId ? (
        <StatusMessage>
          You are viewing {selectedRole.label}; your saved interview target is unchanged.
        </StatusMessage>
      ) : null}
    </div>
  );
}

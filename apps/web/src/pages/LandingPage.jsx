import { PAGE_ROUTES } from '@ai-interview/shared';
import { Link } from 'react-router-dom';

const features = [
  ['Resume-aware practice', 'Upload a PDF or DOCX resume and prepare from your own background.'],
  ['Adaptive interviews', 'Practice across Easy, Medium, and Hard questions in a structured 10-question session.'],
  ['Useful progress signals', 'Review skill evidence and an explainable interview preparation readiness score.'],
];

export function LandingPage() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-12 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:py-16">
        <div>
          <p className="eyebrow">Structured practice for software interviews</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Turn interview preparation into measurable progress.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Build a focused preparation profile from your resume, select a software role,
            complete adaptive text interviews, and review evidence-based progress.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="button-primary" to={PAGE_ROUTES.auth}>
              Create an account
            </Link>
            <Link className="button-secondary" to={PAGE_ROUTES.auth}>
              Sign in
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-700 p-7 text-white shadow-xl shadow-indigo-200/60">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-100">
            Your preparation path
          </p>
          <ol className="mt-7 space-y-5">
            {['Add your resume', 'Choose a target role', 'Practice 10 questions', 'Review your progress'].map(
              (step, index) => (
                <li className="flex items-center gap-4" key={step}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 font-semibold">
                    {index + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </li>
              ),
            )}
          </ol>
        </div>
      </section>

      <section aria-labelledby="feature-title">
        <p className="eyebrow">Built for focused preparation</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950" id="feature-title">
          A clear path from resume to practice
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map(([title, description]) => (
            <article className="card" key={title}>
              <h3 className="font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

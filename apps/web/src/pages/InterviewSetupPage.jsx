import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/use-auth.js';
import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

export function InterviewSetupPage() {
  const { updateProfile, user } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [microphoneConsent, setMicrophoneConsent] = useState(false);
  const [mode, setMode] = useState('TEXT');
  const [resume, setResume] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(user.selectedRoleId ?? '');
  const [success, setSuccess] = useState('');
  const [useResume, setUseResume] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([apiRequest('/roles'), apiRequest('/resume')])
      .then(([roleData, resumeData]) => {
        setRoles(roleData.roles);
        setResume(resumeData.resume);
        setUseResume(resumeData.resume?.status === 'CONFIRMED');
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, []);

  const saveSelectedRole = async () => {
    if (!selectedRoleId) {
      throw new Error('Select a target role before continuing.');
    }
    if (selectedRoleId !== user.selectedRoleId) {
      await updateProfile({ selectedRoleId });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedRoleId) {
      setError('Select a target role before continuing.');
      return;
    }

    setIsSaving(true);
    try {
      await saveSelectedRole();
      setSuccess('Your target role was saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async () => {
    setError('');
    setSuccess('');
    setIsStarting(true);
    try {
      await saveSelectedRole();
      const data = await apiRequest('/interviews', {
        body: {
          mediaConsent: {
            camera: mode === 'VIDEO' && cameraConsent,
            microphone: (mode === 'VOICE' || mode === 'VIDEO') && microphoneConsent,
          },
          mode,
          roleId: selectedRoleId,
          useResume,
        },
        method: 'POST',
      });
      navigate(`/interviews/${data.session.id}`);
    } catch (requestError) {
      if (requestError.details?.interviewId) {
        navigate(`/interviews/${requestError.details.interviewId}`);
        return;
      }
      setError(requestError.message);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) return <LoadingPanel label="Loading approved roles…" />;

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Interview setup</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Choose your target software role.
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Your selection sets the skill categories used by the 10-question adaptive interview.
          Choose text, voice, or video. Recorded answers are transcribed for review before
          submission, and communication metrics remain separate from the technical score.
        </p>
      </section>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend className="sr-only">Target role</legend>
          <div className="grid gap-5 lg:grid-cols-2">
            {roles.map((role) => {
              const selected = selectedRoleId === role.id;
              return (
                <label
                  className={`block cursor-pointer rounded-2xl border p-6 transition ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                  key={role.id}
                >
                  <span className="flex items-start gap-4">
                    <input
                      checked={selected}
                      className="mt-1 size-4 accent-indigo-600"
                      name="roleId"
                      onChange={() => setSelectedRoleId(role.id)}
                      type="radio"
                      value={role.id}
                    />
                    <span>
                      <span className="block font-semibold text-slate-950">{role.label}</span>
                      <span className="mt-1 block text-sm font-medium text-indigo-700">{role.domain}</span>
                      <span className="mt-3 block text-sm leading-6 text-slate-600">{role.summary}</span>
                      <span className="mt-4 flex flex-wrap gap-2">
                        {role.categories.map((category) => (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600" key={category.id}>
                            {category.label}
                          </span>
                        ))}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="button-primary" disabled={isSaving} type="submit">
            {isSaving ? 'Saving…' : 'Save target role'}
          </button>
          <span className="text-sm text-slate-500">The saved role becomes the interview target.</span>
        </div>
      </form>

      <section className="card bg-slate-50">
        <p className="eyebrow">Ready to practice</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">10-question adaptive interview</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Start at Medium difficulty, answer one question at a time, and receive structured
          feedback as difficulty adjusts from your last two valid performance signals.
        </p>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-slate-950">Interview mode</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              ['TEXT', 'Text interview', 'Type answers. This is the completed, verified path.'],
              ['VOICE', 'Voice interview', 'Record answers, edit the transcript, and hear the question.'],
              ['VIDEO', 'Video interview', 'Practice on camera, record answers, and edit the transcript.'],
            ].map(([value, label, description]) => (
              <label
                className={`cursor-pointer rounded-xl border bg-white p-4 ${
                  mode === value ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'
                }`}
                key={value}
              >
                <span className="flex items-start gap-3">
                  <input
                    checked={mode === value}
                    className="mt-1 size-4 accent-indigo-600"
                    name="interview-mode"
                    onChange={() => setMode(value)}
                    type="radio"
                    value={value}
                  />
                  <span>
                    <span className="block font-semibold text-slate-950">{label}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {mode === 'VOICE' ? (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-slate-700">
            <input
              checked={microphoneConsent}
              className="mt-0.5 size-4 accent-indigo-600"
              onChange={(event) => setMicrophoneConsent(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block font-semibold text-slate-950">Allow microphone for this session</span>
              <span className="mt-1 block leading-6">
                Required for voice mode. The interviewer uses the transcript for technical scoring.
                Pace and filler-word counts are stored as separate communication metrics.
              </span>
            </span>
          </label>
        ) : mode === 'VIDEO' ? (
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-slate-700">
              <input
                checked={microphoneConsent}
                className="mt-0.5 size-4 accent-indigo-600"
                onChange={(event) => setMicrophoneConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block font-semibold text-slate-950">Allow microphone for this session</span>
                <span className="mt-1 block leading-6">
                  Required for video mode. The interviewer uses the transcript for technical scoring.
                  Pace and filler-word counts are stored as separate communication metrics.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-slate-700">
              <input
                checked={cameraConsent}
                className="mt-0.5 size-4 accent-indigo-600"
                onChange={(event) => setCameraConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                <span className="block font-semibold text-slate-950">Allow camera for this session</span>
                <span className="mt-1 block leading-6">
                  Required for video mode. The camera preview will appear during the interview.
                </span>
              </span>
            </label>
          </div>
        ) : null}
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <input
            checked={useResume}
            className="mt-0.5 size-4 accent-indigo-600"
            disabled={resume?.status !== 'CONFIRMED'}
            onChange={(event) => setUseResume(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold text-slate-950">Use my confirmed resume</span>
            <span className="mt-1 block leading-6">
              {resume?.status === 'CONFIRMED'
                ? `${resume.originalName} can ground selected resume questions.`
                : 'Confirm an extracted resume to enable resume-grounded questions. You can still start role-only practice.'}
            </span>
          </span>
        </label>
        <button
          className="button-primary mt-5"
          disabled={
            isStarting ||
            !selectedRoleId ||
            (mode === 'VOICE' && !microphoneConsent) ||
            (mode === 'VIDEO' && (!cameraConsent || !microphoneConsent))
          }
          onClick={handleStart}
          type="button"
        >
          {isStarting ? 'Generating first question…' : 'Start 10-question interview'}
        </button>
      </section>
    </div>
  );
}

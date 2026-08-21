import { useCallback, useEffect, useRef, useState } from 'react';

import { LoadingPanel } from '../components/LoadingPanel.jsx';
import { StatusMessage } from '../components/StatusMessage.jsx';
import { apiRequest } from '../lib/api.js';

const MAX_FILE_SIZE = 5_242_880;
const acceptedTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const sectionLabels = {
  certifications: 'Certifications',
  education: 'Education',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills section',
  summary: 'Summary and other details',
};
const emptySections = Object.fromEntries(
  Object.keys(sectionLabels).map((section) => [section, '']),
);

export function ResumePage() {
  const [draftSections, setDraftSections] = useState(emptySections);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [resume, setResume] = useState(null);
  const [success, setSuccess] = useState('');
  const fileInput = useRef(null);

  const applyResume = useCallback((nextResume) => {
    setResume(nextResume);
    setDraftSections(nextResume?.profile.sections ?? emptySections);
  }, []);

  useEffect(() => {
    apiRequest('/resume')
      .then((data) => applyResume(data.resume))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false));
  }, [applyResume]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const file = fileInput.current?.files?.[0];

    if (!file) {
      setError('Choose a PDF or DOCX resume.');
      return;
    }
    if (!acceptedTypes.has(file.type)) {
      setError('Only PDF and DOCX resume files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Resume files must be 5 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    setIsWorking(true);
    try {
      const data = await apiRequest('/resume', { body: formData, method: 'POST' });
      applyResume(data.resume);
      setSuccess(data.replaced ? 'Your active resume was replaced.' : 'Your resume was uploaded.');
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsWorking(true);
    try {
      const data = await apiRequest('/resume', {
        body: { confirmation: true, sections: draftSections },
        method: 'PATCH',
      });
      applyResume(data.resume);
      setSuccess('Your extracted resume information was confirmed.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your active resume and its extracted information?')) return;
    setError('');
    setSuccess('');
    setIsWorking(true);
    try {
      await apiRequest('/resume', {
        body: { confirmation: 'DELETE' },
        method: 'DELETE',
      });
      applyResume(null);
      setSuccess('Your resume was deleted.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) return <LoadingPanel label="Loading your resume…" />;

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Resume profile</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Add the experience behind your answers.
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Upload one text-based PDF or DOCX file up to 5 MB. The application extracts readable
          text and simple sections for you to review before resume-grounded practice.
        </p>
      </section>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage tone="success">{success}</StatusMessage> : null}

      <section className="card" aria-labelledby="upload-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950" id="upload-title">
              {resume ? 'Replace active resume' : 'Upload resume'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">PDF or DOCX · maximum 5 MB</p>
          </div>
          {resume ? (
            <button className="button-danger" disabled={isWorking} onClick={handleDelete} type="button">
              Delete resume
            </button>
          ) : null}
        </div>

        <form className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleUpload}>
          <label className="field-label flex-1">
            Resume file
            <input
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="file-input"
              name="resume"
              ref={fileInput}
              type="file"
            />
          </label>
          <button className="button-primary sm:mb-px" disabled={isWorking} type="submit">
            {isWorking ? 'Processing…' : resume ? 'Replace resume' : 'Upload resume'}
          </button>
        </form>
      </section>

      {resume ? (
        <section className="space-y-5" aria-labelledby="extracted-title">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Active resume</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950" id="extracted-title">
                  {resume.originalName}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {(resume.sizeBytes / 1024).toFixed(1)} KB ·{' '}
                  {resume.status === 'CONFIRMED' ? 'confirmed' : 'review needed'}
                </p>
              </div>
              <span
                className={`status-pill ${
                  resume.status === 'CONFIRMED' ? 'status-ready' : 'status-needed'
                }`}
              >
                {resume.status === 'CONFIRMED' ? 'Confirmed' : 'Review needed'}
              </span>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-950">Detected skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {resume.profile.detectedSkills.length ? (
                  resume.profile.detectedSkills.map((skill) => (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700" key={skill}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No familiar skills were detected automatically.</p>
                )}
              </div>
            </div>
          </div>

          <form className="card" onSubmit={handleReview}>
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Review extracted information
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Correct section text if extraction moved anything. This is deterministic
                document parsing, not detailed AI interpretation.
              </p>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {Object.entries(sectionLabels).map(([section, label]) => (
                <label className="field-label" key={section}>
                  {label}
                  <textarea
                    className="field-input min-h-32 resize-y"
                    maxLength={25_000}
                    onChange={(event) =>
                      setDraftSections((current) => ({
                        ...current,
                        [section]: event.target.value,
                      }))
                    }
                    value={draftSections[section]}
                  />
                </label>
              ))}
            </div>
            <button className="button-primary mt-6" disabled={isWorking} type="submit">
              {isWorking
                ? 'Saving…'
                : resume.status === 'CONFIRMED'
                  ? 'Save corrections'
                  : 'Save and confirm resume'}
            </button>
          </form>

          {resume.warnings.length ? (
            <StatusMessage>
              <strong>Extraction notes:</strong> {resume.warnings.join(' ')}
            </StatusMessage>
          ) : null}
        </section>
      ) : (
        <section className="card border-dashed text-center">
          <h2 className="font-semibold text-slate-950">No active resume</h2>
          <p className="mt-2 text-sm text-slate-600">
            You can still select a role and complete role-only interviews.
          </p>
        </section>
      )}
    </div>
  );
}

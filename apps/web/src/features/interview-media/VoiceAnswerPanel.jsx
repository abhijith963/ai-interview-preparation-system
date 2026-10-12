import { useCallback, useEffect, useRef, useState } from 'react';

import { transcribeRecording } from './transcription.js';

const MAX_RECORDING_MS = 180_000;

export function VoiceAnswerPanel({
  disabled,
  interviewId,
  onBusyChange,
  onTranscriptChange,
  transcript,
}) {
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const [recordingMs, setRecordingMs] = useState(0);
  const chunks = useRef([]);
  const mediaRecorder = useRef(null);
  const recordingDuration = useRef(0);
  const shouldTranscribe = useRef(false);
  const stream = useRef(null);
  const startedAt = useRef(0);
  const timer = useRef(null);

  const stopTracks = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    clearInterval(timer.current);
    recordingDuration.current = Math.min(
      Date.now() - startedAt.current,
      MAX_RECORDING_MS,
    );
    setRecordingMs(recordingDuration.current);
    if (mediaRecorder.current?.state === 'recording') {
      setIsTranscribing(true);
      mediaRecorder.current.stop();
    }
    stopTracks();
    setIsRecording(false);
  }, [stopTracks]);

  useEffect(() => {
    onBusyChange?.(isRecording || isTranscribing);
  }, [isRecording, isTranscribing, onBusyChange]);

  useEffect(
    () => () => {
      shouldTranscribe.current = false;
      clearInterval(timer.current);
      if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
      stopTracks();
      onBusyChange?.(false);
    },
    [onBusyChange, stopTracks],
  );

  const startRecording = async () => {
    setError('');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = nextStream;
      setPermissionState('granted');

      chunks.current = [];
      recordingDuration.current = 0;
      shouldTranscribe.current = true;
      const recorder = new MediaRecorder(nextStream);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('Recording failed. You can still type your answer in the transcript box.');
      };
      recorder.onstop = async () => {
        if (!shouldTranscribe.current) return;
        const blob = new Blob(chunks.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (!blob.size) {
          setError('No audio was captured. Retry the recording or type your answer instead.');
          setIsTranscribing(false);
          return;
        }
        try {
          const data = await transcribeRecording({ blob, interviewId });
          onTranscriptChange(data.transcript, recordingDuration.current);
        } catch (requestError) {
          setError(
            `${requestError.message} Your recording was not stored; retry or type your answer instead.`,
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      startedAt.current = Date.now();
      setRecordingMs(0);
      setIsRecording(true);
      recorder.start();
      timer.current = setInterval(() => {
        const elapsed = Date.now() - startedAt.current;
        setRecordingMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) stopRecording();
      }, 250);
    } catch {
      stopTracks();
      setPermissionState('denied');
      setError('Microphone permission is required for voice recording. You can type instead.');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Voice answer</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Record with your microphone. When you stop, the audio is sent to the server for
            transcription and then discarded. Edit the transcript before submitting.
          </p>
        </div>
        <span aria-live="polite" className="text-xs font-medium text-indigo-800">
          {isRecording
            ? `Recording ${Math.round(recordingMs / 1000)}s`
            : isTranscribing
              ? 'Transcribing recording…'
              : 'Microphone ready'}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {isRecording ? (
          <button className="button-secondary" disabled={disabled} onClick={stopRecording} type="button">
            Stop and transcribe
          </button>
        ) : (
          <button
            className="button-secondary"
            disabled={disabled || isTranscribing}
            onClick={startRecording}
            type="button"
          >
            {permissionState === 'denied' ? 'Retry microphone' : 'Start microphone recording'}
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-amber-800" role="status">{error}</p> : null}
      <label className="field-label" htmlFor="interview-answer">
        Answer transcript
      </label>
      <textarea
        className="field-input min-h-56 resize-y bg-white"
        disabled={disabled || isTranscribing}
        id="interview-answer"
        maxLength={10_000}
        onChange={(event) => onTranscriptChange(event.target.value, recordingMs)}
        placeholder="Record your answer, then review the transcript—or type your answer here…"
        value={transcript}
      />
    </div>
  );
}

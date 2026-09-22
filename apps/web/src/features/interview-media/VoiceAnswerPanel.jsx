import { useCallback, useEffect, useRef, useState } from 'react';

import { getSpeechRecognitionConstructor } from './speech.js';

const MAX_RECORDING_MS = 180_000;

export function VoiceAnswerPanel({ disabled, onTranscriptChange, transcript }) {
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const [recordingMs, setRecordingMs] = useState(0);
  const mediaRecorder = useRef(null);
  const recognition = useRef(null);
  const stream = useRef(null);
  const startedAt = useRef(0);
  const timer = useRef(null);

  const stopTracks = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  const stopRecording = useCallback(() => {
    clearInterval(timer.current);
    recognition.current?.stop();
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    stopTracks();
    setIsRecording(false);
  }, []);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const startRecording = async () => {
    setError('');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = nextStream;
      setPermissionState('granted');

      const recorder = new MediaRecorder(nextStream);
      mediaRecorder.current = recorder;
      recorder.start();

      const SpeechRecognition = getSpeechRecognitionConstructor();
      if (SpeechRecognition) {
        const speech = new SpeechRecognition();
        speech.continuous = true;
        speech.interimResults = true;
        speech.onresult = (event) => {
          const text = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? '')
            .join(' ')
            .trim();
          onTranscriptChange(text, Date.now() - startedAt.current);
        };
        speech.onerror = () => {
          setError('Live transcription was interrupted. You can still edit the transcript by hand.');
        };
        recognition.current = speech;
        speech.start();
      } else {
        setError(
          'This browser cannot transcribe speech automatically. Record, then type or paste what you said.',
        );
      }

      startedAt.current = Date.now();
      setRecordingMs(0);
      setIsRecording(true);
      timer.current = setInterval(() => {
        const elapsed = Date.now() - startedAt.current;
        setRecordingMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) stopRecording();
      }, 250);
    } catch {
      setPermissionState('denied');
      setError('Microphone permission is required for voice answers. You can type instead.');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Voice answer</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Record with your microphone. The transcript is what the technical score evaluates.
            Edit it before submitting. Voice pace and fillers are stored separately.
          </p>
        </div>
        <span className="text-xs font-medium text-indigo-800">
          {isRecording ? `Recording ${Math.round(recordingMs / 1000)}s` : 'Microphone ready'}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {isRecording ? (
          <button className="button-secondary" disabled={disabled} onClick={stopRecording} type="button">
            Stop recording
          </button>
        ) : (
          <button className="button-secondary" disabled={disabled} onClick={startRecording} type="button">
            {permissionState === 'denied' ? 'Retry microphone' : 'Start microphone recording'}
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      <label className="field-label" htmlFor="interview-answer">
        Answer transcript
      </label>
      <textarea
        className="field-input min-h-56 resize-y bg-white"
        disabled={disabled}
        id="interview-answer"
        maxLength={10_000}
        onChange={(event) => onTranscriptChange(event.target.value, recordingMs)}
        placeholder="Speak your answer, then edit the transcript if needed…"
        value={transcript}
      />
    </div>
  );
}

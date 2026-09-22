import { useCallback, useEffect, useRef, useState } from 'react';

import { getSpeechRecognitionConstructor } from './speech.js';

const MAX_RECORDING_MS = 180_000;

const VideoPreview = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      autoPlay
      className="w-full rounded-xl border border-slate-200 bg-slate-50 object-cover"
      height={240}
      playsInline
      ref={videoRef}
      width={320}
    />
  );
};

export function VideoAnswerPanel({ disabled, onTranscriptChange, transcript }) {
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');
  const [recordingMs, setRecordingMs] = useState(0);
  const [activeStream, setActiveStream] = useState(null);
  const mediaRecorder = useRef(null);
  const recognition = useRef(null);
  const startedAt = useRef(0);
  const timer = useRef(null);

  const stopTracks = useCallback(() => {
    activeStream?.getTracks().forEach((track) => track.stop());
    setActiveStream(null);
  }, [activeStream]);

  const stopRecording = useCallback(() => {
    clearInterval(timer.current);
    recognition.current?.stop();
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    stopTracks();
    setIsRecording(false);
  }, [stopTracks]);

  useEffect(() => () => {
    clearInterval(timer.current);
    recognition.current?.stop();
    if (mediaRecorder.current?.state === 'recording') mediaRecorder.current.stop();
    activeStream?.getTracks().forEach((track) => track.stop());
  }, [activeStream]);

  const startRecording = async () => {
    setError('');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setActiveStream(nextStream);
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
    } catch (error) {
      setPermissionState('denied');
      setError(`Camera/microphone access failed: ${error.message}. You can type instead.`);
    }
  };

  const togglePreview = () => {
    if (activeStream) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Video answer</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Record with your camera and microphone. The transcript is what the technical score evaluates.
            Edit it before submitting. Voice pace and fillers are stored separately.
          </p>
        </div>
        <span className="text-xs font-medium text-indigo-800">
          {isRecording ? `Recording ${Math.round(recordingMs / 1000)}s` : 'Camera/microphone ready'}
        </span>
      </div>

      {activeStream ? (
        <VideoPreview stream={activeStream} />
      ) : (
        <div className="h-60 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-500">Camera preview will appear here</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isRecording ? (
          <button className="button-secondary" disabled={disabled} onClick={stopRecording} type="button">
            Stop recording
          </button>
        ) : (
          <button className="button-secondary" disabled={disabled} onClick={togglePreview} type="button">
            {permissionState === 'denied' ? 'Retry camera/microphone' : 'Start camera/microphone recording'}
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

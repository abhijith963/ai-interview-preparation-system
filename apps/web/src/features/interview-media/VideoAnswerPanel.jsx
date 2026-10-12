import { useCallback, useEffect, useRef, useState } from 'react';

import { transcribeRecording } from './transcription.js';

const MAX_RECORDING_MS = 180_000;

const VideoPreview = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    const videoElement = videoRef.current;
    videoElement.srcObject = stream;
    return () => {
      videoElement.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      aria-label="Live camera preview"
      autoPlay
      className="w-full rounded-xl border border-slate-200 bg-slate-50 object-cover"
      height={240}
      muted
      playsInline
      ref={videoRef}
      width={320}
    />
  );
};

export function VideoAnswerPanel({
  disabled,
  interviewId,
  onBusyChange,
  onTranscriptChange,
  transcript,
}) {
  const [activeStream, setActiveStream] = useState(null);
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
    setActiveStream(null);
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
      stream.current?.getTracks().forEach((track) => track.stop());
      onBusyChange?.(false);
    },
    [onBusyChange],
  );

  const startRecording = async () => {
    setError('');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.current = nextStream;
      setActiveStream(nextStream);
      setPermissionState('granted');

      const audioStream = new MediaStream(nextStream.getAudioTracks());
      chunks.current = [];
      recordingDuration.current = 0;
      shouldTranscribe.current = true;
      const recorder = new MediaRecorder(audioStream);
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
    } catch (requestError) {
      stopTracks();
      setPermissionState('denied');
      setError(
        `Camera/microphone access failed: ${requestError.message}. You can type instead.`,
      );
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Video answer</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Practice with the camera preview. Only the microphone audio is sent for transcription;
            video is not uploaded or stored. Edit the transcript before submitting.
          </p>
        </div>
        <span aria-live="polite" className="text-xs font-medium text-indigo-800">
          {isRecording
            ? `Recording ${Math.round(recordingMs / 1000)}s`
            : isTranscribing
              ? 'Transcribing recording…'
              : 'Camera/microphone ready'}
        </span>
      </div>

      {activeStream ? (
        <VideoPreview stream={activeStream} />
      ) : (
        <div className="flex h-60 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500">Camera preview will appear here</p>
        </div>
      )}

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
            {permissionState === 'denied'
              ? 'Retry camera/microphone'
              : 'Start camera/microphone recording'}
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

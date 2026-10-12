import { apiRequest } from '../../lib/api.js';

const extensionForMimeType = (mimeType) => {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
};

export const transcribeRecording = async ({ blob, interviewId }) => {
  const mimeType = blob.type || 'audio/webm';
  const formData = new FormData();
  formData.append('audio', blob, `answer.${extensionForMimeType(mimeType)}`);
  return apiRequest(`/interviews/${interviewId}/transcriptions`, {
    body: formData,
    method: 'POST',
  });
};

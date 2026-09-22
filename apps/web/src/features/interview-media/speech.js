export const getSpeechRecognitionConstructor = () =>
  globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

export const speakInterviewQuestion = (text) => {
  if (!text || !globalThis.speechSynthesis) return false;
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  globalThis.speechSynthesis.speak(utterance);
  return true;
};

export const stopInterviewSpeech = () => {
  globalThis.speechSynthesis?.cancel();
};

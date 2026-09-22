const FILLER_PATTERNS = Object.freeze([
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\ber+\b/gi,
  /\bhm+\b/gi,
  /\byou know\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\bbasically\b/gi,
  /\blike\b/gi,
]);

const tokenize = (transcript) =>
  String(transcript ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const countFillers = (transcript) => {
  const text = String(transcript ?? '');
  return FILLER_PATTERNS.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches?.length ?? 0);
  }, 0);
};

export const computeVoiceMetrics = ({ durationMs, transcript }) => {
  const wordCount = tokenize(transcript).length;
  const durationSeconds = Math.max(0, Number(durationMs) || 0) / 1000;
  const durationMinutes = durationSeconds / 60;
  const fillerCount = countFillers(transcript);

  return Object.freeze({
    durationMs: Math.round(durationSeconds * 1000),
    fillerCount,
    fillerRatePerMinute:
      durationMinutes > 0 ? Number((fillerCount / durationMinutes).toFixed(2)) : null,
    speakingPaceWpm:
      durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : null,
    wordCount,
  });
};

export type CandidateScore = { sound: string; candidateIPA: string; slug: string; relativeScorePercent: number };
export type ComponentComparison = { component: string; target: string; inferred: string | null; matches: boolean | null };
export type AnalysisResult = {
  schemaVersion: 3; soundSlug: string; targetSound: string; targetWord: string;
  expectedIPA: string; observedIPA: string; observedSound: string | null; canEvaluate: boolean;
  evaluationStatus: 'matched' | 'sound_mismatch' | 'retry' | 'ambiguous'; message: string;
  soundCandidateScores: CandidateScore[]; bestCandidateSound: string | null;
  scoreMargin: number | null; scoreMarginThreshold: number; scoreMarginThresholdStatus: 'provisional';
  scoreConfidenceStatus: 'clear' | 'ambiguous' | 'not_provided' | 'not_evaluable'; scoreMeaning: string;
  feedbackBasis: 'inferred_phoneme' | null;
  soundComponentAnalysis: ComponentComparison[] | null; durationSeconds?: number;
};
export type HistoryEntry = AnalysisResult & { id: string; recordedAt: string };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!record(value) || value.schemaVersion !== 3) return false;
  if (!['soundSlug', 'targetSound', 'targetWord', 'expectedIPA', 'observedIPA', 'message', 'scoreMeaning'].every(key => typeof value[key] === 'string')) return false;
  if (!nullableString(value.observedSound) || !nullableString(value.bestCandidateSound) || typeof value.canEvaluate !== 'boolean') return false;
  if (!['matched', 'sound_mismatch', 'retry', 'ambiguous'].includes(String(value.evaluationStatus)) ||
      !['clear', 'ambiguous', 'not_provided', 'not_evaluable'].includes(String(value.scoreConfidenceStatus)) || value.scoreMarginThresholdStatus !== 'provisional') return false;
  if (!(value.scoreMargin === null || finite(value.scoreMargin)) || !finite(value.scoreMarginThreshold)) return false;
  if (value.durationSeconds !== undefined && (!finite(value.durationSeconds) || value.durationSeconds < 0)) return false;
  if (!Array.isArray(value.soundCandidateScores) || !value.soundCandidateScores.every(item => record(item) &&
      typeof item.sound === 'string' && typeof item.candidateIPA === 'string' && typeof item.slug === 'string' &&
      finite(item.relativeScorePercent) && item.relativeScorePercent >= 0 && item.relativeScorePercent <= 100)) return false;
  if (value.soundComponentAnalysis === null) return value.feedbackBasis === null;
  return value.feedbackBasis === 'inferred_phoneme' && typeof value.observedSound === 'string' && value.canEvaluate &&
    Array.isArray(value.soundComponentAnalysis) && value.soundComponentAnalysis.length > 0 && value.soundComponentAnalysis.every(item => record(item) &&
      typeof item.component === 'string' && typeof item.target === 'string' && nullableString(item.inferred) &&
      (item.matches === null || typeof item.matches === 'boolean'));
}

export function responseErrorMessage(value: unknown, status: number) {
  if (record(value)) {
    if (typeof value.error === 'string') return value.error;
    if (typeof value.detail === 'string') return value.detail;
  }
  return `発音解析を利用できませんでした（${status}）。もう一度お試しください。`;
}

export async function requestAnalysis(audio: Blob, word: string, soundSlug: string, signal: AbortSignal) {
  const formData = new FormData();
  formData.append('file', audio, audio.type === 'audio/wav' ? 'recording.wav' : 'recording');
  formData.append('target_word', word);
  formData.append('sound_slug', soundSlug);
  const response = await fetch('/api/analyze-pronunciation', { method: 'POST', body: formData, signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(responseErrorMessage(body, response.status));
  if (!isAnalysisResult(body)) throw new Error('解析結果を読み取れませんでした。もう一度お試しください。');
  if (body.soundSlug !== soundSlug || body.targetWord !== word) throw new Error('選択した音と解析結果が一致しません。もう一度お試しください。');
  return body;
}

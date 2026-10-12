import { soundLessons } from '../data/american-english.ts';
import { isAnalysisResult, type HistoryEntry } from './analysis.ts';
export const HISTORY_STORAGE_KEY = 'elps-j:pronunciation-history:v3';
export const PREVIOUS_STORAGE_KEY = 'elps-j:pronunciation-history:v2';
export const LEGACY_STORAGE_KEY = 'elps-j:pronunciation-history:v1';
export const HISTORY_LIMIT = 200;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function migrateEntry(value: unknown): unknown {
  if (!record(value) || value.schemaVersion === 3) return value;
  if (value.schemaVersion === 2) return {
    ...value, schemaVersion: 3, feedbackBasis: null,
    // Preserve the original candidate-based comparison for JSON export only.
    legacySoundComponentAnalysis: value.soundComponentAnalysis,
    soundComponentAnalysis: null,
  };
  const sound = soundLessons.find(sound => sound.symbol === value.targetVowel);
  if (!sound || !Array.isArray(value.vowelCandidateScores)) return null;
  return {
    ...value, schemaVersion: 3, feedbackBasis: null, soundSlug: sound.slug, targetSound: sound.symbol,
    observedSound: value.observedVowel, bestCandidateSound: value.bestCandidateVowel,
    evaluationStatus: value.evaluationStatus === 'correct' ? 'matched' : value.evaluationStatus === 'vowel_mismatch' ? 'sound_mismatch' : value.evaluationStatus,
    soundCandidateScores: value.vowelCandidateScores.map(candidate => record(candidate) ? ({
      sound: candidate.vowel, candidateIPA: candidate.candidateIPA,
      slug: soundLessons.find(sound => sound.symbol === candidate.vowel)?.slug,
      relativeScorePercent: candidate.relativeScorePercent,
    }) : null),
    // Old component classifications differ from the shared curriculum. Keep raw
    // historical data for export, but do not present them as today's teaching target.
    soundComponentAnalysis: null,
  };
}
export function parseHistory(serialized: string | null): HistoryEntry[] {
  if (serialized === null) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  return parsed.map(migrateEntry).filter((entry): entry is HistoryEntry => record(entry) &&
    typeof entry.id === 'string' && typeof entry.recordedAt === 'string' && Number.isFinite(Date.parse(entry.recordedAt)) && isAnalysisResult(entry)).slice(0, HISTORY_LIMIT);
}
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export function historyCsv(history: HistoryEntry[]) {
  const headers = ['recordedAt', 'soundSlug', 'targetSound', 'targetWord', 'expectedIPA', 'observedIPA', 'observedSound', 'evaluationStatus', 'scoreConfidenceStatus', 'scoreMargin', 'feedbackBasis', 'soundComponentAnalysis'];
  const rows = history.map(entry => headers.map(key => csvCell(key === 'soundComponentAnalysis' ? JSON.stringify(entry.soundComponentAnalysis) : entry[key as keyof HistoryEntry])).join(','));
  return '\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\n');
}
export function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

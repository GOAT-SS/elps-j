import { soundLessons, type SoundLesson } from '../../data/american-english.ts';
import legacy from '../../data/practice_words.json' with { type: 'json' };
import type { AnalysisResult } from '../../practice/analysis.ts';

export type PracticeTarget = { lesson: SoundLesson; word: string; expectedIPA: string };
export type TranscriptionResponse = { phonemes: string; sample_rate: number };

export function normalizeIPA(ipa: string) {
  return ipa.replace(/[ˈˌːˑ.\s/\[\]ʰ]/g, '')
    .replaceAll('ɡ', 'g').replaceAll('ɹ', 'r')
    .replaceAll('ɜr', 'ɝ').replaceAll('ər', 'ɚ')
    .replaceAll('t͡ʃ', 'tʃ').replaceAll('d͡ʒ', 'dʒ');
}

export function resolvePractice(word: string, slug: string): PracticeTarget | null {
  word = word.trim().toLowerCase();
  const previous = legacy.rows.flat().find(item => item.word === word);
  const lesson = soundLessons.find(item => slug ? item.slug === slug : item.symbol === previous?.target_vowel);
  if (!lesson) return null;
  const example = lesson.examples.find(item => item.word === word);
  const ipa = example?.ipa ?? (previous?.target_vowel === lesson.symbol ? previous.expected_ipa : undefined);
  return ipa ? { lesson, word, expectedIPA: ipa } : null;
}

export function candidateTranscriptions(practice: PracticeTarget) {
  const symbols = [...new Set([...soundLessons.map(item => normalizeIPA(item.symbol)), 'a', 'e', 'o'])].sort((a, b) => b.length - a.length);
  let remaining = normalizeIPA(practice.expectedIPA);
  const tokens: string[] = [];
  while (remaining) {
    const token = symbols.find(symbol => remaining.startsWith(symbol)) ?? remaining[0];
    tokens.push(token);
    remaining = remaining.slice(token.length);
  }
  const target = normalizeIPA(practice.lesson.symbol);
  return soundLessons.filter(item => item.group === practice.lesson.group).map(lesson => ({
    lesson,
    ipa: normalizeIPA(tokens.map(token => token === target ? normalizeIPA(lesson.symbol) : token).join('')),
  }));
}

export function isTranscriptionResponse(value: unknown): value is TranscriptionResponse {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.phonemes === 'string' && item.phonemes.length <= 4096 &&
    typeof item.sample_rate === 'number' && Number.isInteger(item.sample_rate) && item.sample_rate > 0;
}

export function transcriptionToAnalysis(data: TranscriptionResponse, practice: PracticeTarget): AnalysisResult {
  const { lesson, word, expectedIPA } = practice;
  const matches = candidateTranscriptions(practice).filter(candidate => candidate.ipa === normalizeIPA(data.phonemes));
  const inferred = matches.length === 1 ? matches[0].lesson : null;
  return {
    schemaVersion: 3, soundSlug: lesson.slug, targetSound: lesson.symbol, targetWord: word,
    expectedIPA, observedIPA: data.phonemes, observedSound: inferred?.symbol ?? null,
    canEvaluate: inferred !== null, evaluationStatus: inferred ? 'ambiguous' : 'retry',
    message: inferred
      ? `/${inferred.symbol}/ と推定されました。認識の確かさの数値がないため、以下は推定音に基づく参考フィードバックです。録音を聞き、目標 /${lesson.symbol}/ と比べてみましょう。`
      : '単語全体から対象の音を特定できませんでした。静かな場所で、選んだ単語をもう一度録音してください。',
    soundCandidateScores: [], bestCandidateSound: null, scoreMargin: null,
    scoreMarginThreshold: legacy.scoreMargin.minimumForClearResult, scoreMarginThresholdStatus: 'provisional',
    scoreConfidenceStatus: inferred ? 'not_provided' : 'not_evaluable',
    scoreMeaning: '解析結果には推定した音素列が含まれますが、候補スコアや認識の確かさの数値はありません。発音の正解確率は算出していません。',
    feedbackBasis: inferred ? 'inferred_phoneme' : null,
    soundComponentAnalysis: inferred ? Object.entries(lesson.structure).map(([component, target]) => {
      const value = inferred.structure[component] ?? null;
      return { component, target, inferred: value,
        matches: target === 'unspecified' || value === null || value === 'unspecified' ? null : target === value };
    }) : null,
  };
}

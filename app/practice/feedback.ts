import { featureDefinitions } from '../data/american-english.ts';
import type { AnalysisResult, ComponentComparison } from './analysis.ts';

export function componentLabel(key: string) {
  return featureDefinitions[key as keyof typeof featureDefinitions]?.label ?? key;
}

export function featureLabel(key: string, value: string | null) {
  if (value === null) return '対応する定義なし';
  return featureDefinitions[key as keyof typeof featureDefinitions]?.options.find(([option]) => option === value)?.[1] ?? value;
}

export function componentAdvice(item: ComponentComparison) {
  const label = componentLabel(item.component);
  const target = featureLabel(item.component, item.target);
  const inferred = featureLabel(item.component, item.inferred);
  if (item.matches === null) return `${label}は、この音同士では比較できません。知識学習で目標の使い方を確認しましょう。`;
  if (item.matches) return `${label}は共通する「${target}」を意識したまま発音しましょう。`;
  const heights = ['high', 'near-high', 'close-mid', 'mid', 'open-mid', 'low'];
  const positions = ['front', 'near-front', 'central', 'near-back', 'back'];
  let movement = '';
  if (['height', 'startHeight'].includes(item.component) && item.inferred !== null && heights.includes(item.inferred) && heights.includes(item.target)) {
    movement = heights.indexOf(item.target) > heights.indexOf(item.inferred) ? '舌を低くする方向を意識しましょう。' : '舌を高くする方向を意識しましょう。';
  } else if (['backness', 'startBackness'].includes(item.component) && item.inferred !== null && positions.includes(item.inferred) && positions.includes(item.target)) {
    movement = positions.indexOf(item.target) > positions.indexOf(item.inferred) ? '舌を後ろへ動かす方向を意識しましょう。' : '舌を前へ動かす方向を意識しましょう。';
  } else {
    movement = `目標の「${target}」を意識して発音しましょう。`;
  }
  return `${label}：推定音の「${inferred}」から目標の「${target}」へ。${movement}`;
}

export function feedbackGroups(result: AnalysisResult) {
  const components = result.soundComponentAnalysis ?? [];
  return {
    change: components.filter(item => item.matches === false),
    maintain: components.filter(item => item.matches === true),
    unknown: components.filter(item => item.matches === null),
  };
}

export function compareAttempts(current: AnalysisResult, previous: AnalysisResult | undefined) {
  if (!previous || current.soundSlug !== previous.soundSlug || current.targetWord !== previous.targetWord ||
      !['clear', 'not_provided'].includes(current.scoreConfidenceStatus) || !['clear', 'not_provided'].includes(previous.scoreConfidenceStatus) ||
      !current.soundComponentAnalysis || !previous.soundComponentAnalysis) return null;
  return { previousSound: previous.observedSound, currentSound: current.observedSound,
    previousDifferences: feedbackGroups(previous).change.length, currentDifferences: feedbackGroups(current).change.length };
}

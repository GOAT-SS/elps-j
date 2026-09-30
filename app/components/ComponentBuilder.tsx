"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { soundGroups, soundLessons } from "../data/american-english";
import { createSoundExercise } from "../data/american-english-structures";
import ConversionBuilder from "./ConversionBuilder";
import FreeConceptMap, { assessConceptMap, emptyConceptMapSnapshot, type ConceptMapSnapshot } from "./FreeConceptMap";

export default function ComponentBuilder() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [mapSnapshot, setMapSnapshot] = useState<ConceptMapSnapshot>(emptyConceptMapSnapshot);
  const [mapRevision, setMapRevision] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);
  const [completedSounds, setCompletedSounds] = useState<string[]>([]);
  const sound = soundLessons[targetIndex];
  const exercise = createSoundExercise(sound);
  const assessment = assessConceptMap(mapSnapshot, exercise.values, exercise.connections);
  const hasCompletedAll = completedSounds.length === soundLessons.length;
  const conversionAvailable = ["ae", "uh", "ah"].every((slug) => completedSounds.includes(slug));
  const componentLabel = (key: string) => exercise.definitions.find((item) => item.key === key)?.label ?? key;
  const answerLabel = (key: string) => exercise.definitions.find((item) => item.key === key)?.options.find(([value]) => value === exercise.values[key])?.[1];
  const updateMapSnapshot = useCallback((snapshot: ConceptMapSnapshot) => {
    setMapSnapshot(snapshot);
    setHasChecked(false);
  }, []);

  function resetMap() {
    setMapSnapshot(emptyConceptMapSnapshot);
    setMapRevision((current) => current + 1);
    setHasChecked(false);
  }
  function selectTarget(index: number) {
    setTargetIndex(index);
    resetMap();
  }
  function showNextTarget() {
    for (let offset = 1; offset <= soundLessons.length; offset++) {
      const index = (targetIndex + offset) % soundLessons.length;
      if (!completedSounds.includes(soundLessons[index].slug)) {
        selectTarget(index);
        return;
      }
    }
  }
  function checkAnswers() {
    setHasChecked(true);
    if (assessment.isCorrect) setCompletedSounds((current) => current.includes(sound.slug) ? current : [...current, sound.slug]);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <h2 className="font-bold text-slate-950">41項目の構成要素を組み立てる</h2>
          <p className="font-semibold text-slate-600" aria-live="polite">{completedSounds.length} / {soundLessons.length} 問完了</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="発音構成理解の進捗" aria-valuemin={0} aria-valuemax={soundLessons.length} aria-valuenow={completedSounds.length}>
          <div className="h-full bg-emerald-600 transition-[width]" style={{ width: `${completedSounds.length / soundLessons.length * 100}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500">完了状況はこの画面を開いている間に記録されます。好きな記号から取り組めます。</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {soundGroups.map((group) => (
            <fieldset key={group.id} className="min-w-0">
              <legend className="text-sm font-bold text-slate-700">{group.title} · {soundLessons.filter((item) => item.group === group.id && completedSounds.includes(item.slug)).length} / {soundLessons.filter((item) => item.group === group.id).length}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {soundLessons.map((item, index) => item.group === group.id ? (
                  <button key={item.slug} type="button" onClick={() => selectTarget(index)} aria-pressed={index === targetIndex} aria-label={`/${item.symbol}/ の問題${completedSounds.includes(item.slug) ? " 完了" : ""}`} className={`min-h-11 min-w-14 rounded-xl border px-3 py-2 text-lg font-bold ${index === targetIndex ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500"}`}>
                    <span lang="en">/{item.symbol}/</span>{completedSounds.includes(item.slug) && <span aria-hidden="true"> ✓</span>}
                  </button>
                ) : null)}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <section className="mt-6 border-b border-slate-200 pb-6" aria-label="今回の問題">
        <p className="text-sm font-bold text-emerald-700">今回の発音記号 · {targetIndex + 1} / {soundLessons.length}</p>
        <h3 lang="en" className="mt-2 text-6xl font-bold text-slate-950">/{sound.symbol}/</h3>
        <p className="mt-3 text-sm text-slate-600">単語例：<span lang="en">{sound.examples.map((item) => item.word).join("・")}</span></p>
        <p className="mt-4 text-sm leading-7 text-slate-600">{exercise.definitions.length}個の部品を選び、{exercise.connections.length}本の関係を接続してください。発音記号 → 分類の関係 → 音の種類 → 各構成要素への関係 → 構成要素、の順につなぎます。</p>
        <Link href={`/learn/${sound.slug}`} className="mt-3 inline-block text-sm font-bold text-blue-700 underline">/{sound.symbol}/ の発音知識を確認する</Link>
      </section>
      <div className="mt-7">
        <FreeConceptMap key={`${sound.slug}-${mapRevision}`} mapLabel={`/${sound.symbol}/ を自由に組み立てる概念マップ`} definitions={exercise.definitions} onChange={updateMapSnapshot} />
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" disabled={!assessment.isReady} onClick={checkAnswers} className="min-h-12 rounded-full bg-emerald-700 px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">組み立てた構造を確認</button>
        <button type="button" onClick={resetMap} className="min-h-12 rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700">部品をすべて戻す</button>
        {!hasCompletedAll && <button type="button" onClick={showNextTarget} className="min-h-12 rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700">未完了の発音記号へ</button>}
      </div>
      {!assessment.isReady && <p className="mt-3 text-sm text-slate-500">全ての部品を置き、必要な本数の接続を作ると確認できます。</p>}
      {hasChecked && (
        <section role="status" className={`mt-7 rounded-2xl p-5 ${assessment.isCorrect ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}>
          <h3 className="text-lg font-bold">{assessment.isCorrect ? "すべて合っています。" : `正しい部品 ${assessment.correctNodeCount}/${exercise.definitions.length}、正しい接続 ${assessment.correctConnectionCount}/${exercise.connections.length} です。`}</h3>
          {!assessment.isCorrect && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {assessment.incorrectKeys.map((key) => <li key={key}>{componentLabel(key)}：この教材での答えは「{answerLabel(key)}」です。</li>)}
            {assessment.missingConnections.map(([source, target]) => <li key={`${source}-${target}`}>「{componentLabel(source)} → {componentLabel(target)}」の接続を確認しましょう。</li>)}
            {assessment.extraConnections.length > 0 && <li>不要な接続が{assessment.extraConnections.length}本あります。接続一覧から削除できます。</li>}
          </ul>}
          <p className="mt-4 text-sm leading-7">{sound.steps.join(" ")}</p>
          <p className="mt-2 text-sm leading-7">{sound.tip}</p>
          {["ae", "uh", "ah"].includes(sound.slug) && assessment.isCorrect && <Link href={`/practice?vowel=${encodeURIComponent(sound.symbol)}`} className="mt-4 inline-block font-bold underline">/{sound.symbol}/ を録音練習する →</Link>}
        </section>
      )}
      {hasCompletedAll && <div role="status" className="mt-7 rounded-2xl bg-emerald-50 p-6 text-emerald-950"><p className="text-xl font-bold">アメリカ英語の基本41項目の構成理解が完了しました。</p><p className="mt-2">記号を選び直して、何度でも復習できます。</p></div>}
      {conversionAvailable && <details className="mt-7 border-t border-slate-200 pt-5"><summary className="cursor-pointer font-bold text-slate-700">追加演習：/æ/・/ʌ/・/ɑ/ の構造変換</summary><p className="mt-3 text-sm leading-7 text-slate-600">従来の3母音を比較する演習です。舌の高さを高・中・低の3段階で扱います。</p><ConversionBuilder /></details>}
    </div>
  );
}

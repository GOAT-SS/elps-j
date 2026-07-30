"use client";

import { useCallback, useMemo, useState } from "react";
import ipaData from "../backend/data/ipa_features.json";
import practiceConfig from "../data/practice_words.json";
import ConversionBuilder from "./ConversionBuilder";
import FreeConceptMap, {
  assessConceptMap,
  emptyConceptMapSnapshot,
  type ConceptMapSnapshot,
  correctConceptMapConnections,
} from "./FreeConceptMap";
import {
  createVowelStructure,
  pronunciationComponentDefinitions,
  type VowelFeatureKey,
} from "./PronunciationDragDrop";

const targetVowels = ["æ", "ʌ", "ɑ"] as const;
type TargetVowel = (typeof targetVowels)[number];

const vowelGuides: Record<
  TargetVowel,
  { summary: string; comparison: string }
> = {
  æ: {
    summary: "舌を前方の低い位置に置き、口を広く開いて作る母音です。",
    comparison: "/ʌ/ より舌が低く前にあり、/ɑ/ より舌が前にあります。",
  },
  ʌ: {
    summary: "舌を中央の中間的な高さに置き、力を入れすぎずに作る母音です。",
    comparison: "/æ/・/ɑ/ より舌が高く、舌の前後位置は中央です。",
  },
  ɑ: {
    summary: "舌を後方の低い位置に置き、口を大きく開いて作る母音です。",
    comparison: "/æ/ と高さは同じですが、舌をより後ろに置きます。",
  },
};

export default function ComponentBuilder() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [mapSnapshot, setMapSnapshot] = useState<ConceptMapSnapshot>(
    emptyConceptMapSnapshot,
  );
  const [mapRevision, setMapRevision] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);
  const [completedVowels, setCompletedVowels] = useState<TargetVowel[]>([]);

  const targetVowel = targetVowels[targetIndex];
  const correctFeatures = ipaData.phonemes[targetVowel]
    .features as Record<VowelFeatureKey, string>;
  const correctStructure = createVowelStructure(
    targetVowel,
    correctFeatures,
  );
  const exampleWords = useMemo(() => {
    return practiceConfig.rows
      .map((row) => row.find((word) => word.target_vowel === targetVowel)?.word)
      .filter((word): word is string => word !== undefined);
  }, [targetVowel]);
  const assessment = assessConceptMap(mapSnapshot, correctStructure);
  const isComplete = assessment.isReady;
  const isAllCorrect = assessment.isCorrect;
  const hasCompletedCurrent = completedVowels.includes(targetVowel);
  const hasCompletedAll = completedVowels.length === targetVowels.length;

  const updateMapSnapshot = useCallback((snapshot: ConceptMapSnapshot) => {
    setMapSnapshot(snapshot);
    setHasChecked(false);
  }, []);

  function selectTarget(index: number) {
    setTargetIndex(index);
    setMapSnapshot(emptyConceptMapSnapshot);
    setMapRevision((current) => current + 1);
    setHasChecked(false);
  }

  function showNextTarget() {
    const nextOffset = targetVowels.findIndex((_, offset) => {
      const index = (targetIndex + offset + 1) % targetVowels.length;
      return !completedVowels.includes(targetVowels[index]);
    });

    if (nextOffset !== -1) {
      selectTarget((targetIndex + nextOffset + 1) % targetVowels.length);
    }
  }

  function checkAnswers() {
    setHasChecked(true);

    if (isAllCorrect && !hasCompletedCurrent) {
      setCompletedVowels((current) => [...current, targetVowel]);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-7 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="font-bold text-slate-950">構成要素の理解度</p>
          <p className="font-semibold text-slate-600">
            {completedVowels.length} / {targetVowels.length} 問完了
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="発音構成理解の進捗"
          aria-valuemin={0}
          aria-valuemax={targetVowels.length}
          aria-valuenow={completedVowels.length}
        >
          <div
            className="h-full bg-emerald-600 transition-[width]"
            style={{
              width: `${(completedVowels.length / targetVowels.length) * 100}%`,
            }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {pronunciationComponentDefinitions.length}
          個のノードを自由に配置し、{correctConceptMapConnections.length}
          本の関係を接続すると1問完了です。
        </p>
      </div>

      <div className="flex flex-col gap-6 border-b border-slate-200 pb-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-700">今回の発音記号</p>
          <p lang="en" className="mt-2 text-6xl font-bold text-slate-950">
            /{targetVowel}/
          </p>
          <p className="mt-2 text-sm text-slate-500">
            単語例：<span lang="en">{exampleWords.join("・")}</span>
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">
            問題を選ぶ
          </p>
          <div className="flex gap-2">
            {targetVowels.map((vowel, index) => (
              <button
                key={vowel}
                type="button"
                onClick={() => selectTarget(index)}
                className={`min-h-11 min-w-14 rounded-xl border px-4 py-2 text-lg font-bold transition ${
                  targetIndex === index
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500"
                }`}
                aria-pressed={targetIndex === index}
              >
                <span lang="en">/{vowel}/</span>
                {completedVowels.includes(vowel) ? (
                  <span className="sr-only"> 完了</span>
                ) : null}
                {completedVowels.includes(vowel) ? " ✓" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7">
        <FreeConceptMap
          key={`${targetVowel}-${mapRevision}`}
          mapLabel={`/${targetVowel}/ を自由に組み立てる概念マップ`}
          onChange={updateMapSnapshot}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!isComplete}
          onClick={checkAnswers}
          className="min-h-12 rounded-full bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          組み立てた構造を確認
        </button>
        <button
          type="button"
          onClick={() => {
            setMapSnapshot(emptyConceptMapSnapshot);
            setMapRevision((current) => current + 1);
            setHasChecked(false);
          }}
          className="min-h-12 rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
        >
          部品をすべて戻す
        </button>
      </div>

      {hasChecked && (
        <div
          role="status"
          className={`mt-7 rounded-2xl p-5 ${
            isAllCorrect
              ? "bg-emerald-50 text-emerald-950"
              : "bg-amber-50 text-amber-950"
          }`}
        >
          <p className="text-lg font-bold">
            {isAllCorrect
              ? "すべて合っています。"
              : `正しいノード ${assessment.correctNodeCount}/${pronunciationComponentDefinitions.length}、正しい接続 ${assessment.correctConnectionCount}/${correctConceptMapConnections.length} です。`}
          </p>
          <p className="mt-2 text-sm leading-6">
            {vowelGuides[targetVowel].summary}
          </p>
          <p className="mt-2 text-sm leading-6">
            比較のポイント：{vowelGuides[targetVowel].comparison}
          </p>
          {isAllCorrect && !hasCompletedAll ? (
            <button
              type="button"
              onClick={showNextTarget}
              className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 font-bold text-white transition hover:bg-slate-800"
            >
              未完了の発音記号へ
            </button>
          ) : null}
        </div>
      )}

      {hasCompletedAll ? (
        <div className="mt-7 border-t border-emerald-200 pt-7">
          <p className="text-xl font-bold text-emerald-950">
            個別母音の構成が完了しました。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            次は学部版の学習活動と同じように、作った構成を近い母音へ変換し、
            変える要素と残す要素を確認します。
          </p>
          <ConversionBuilder />
        </div>
      ) : null}
    </div>
  );
}

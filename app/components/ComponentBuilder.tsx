"use client";

import { useMemo, useState } from "react";
import ipaData from "../backend/data/ipa_features.json";
import practiceConfig from "../data/practice_words.json";

const targetVowels = ["æ", "ʌ", "ɑ"] as const;

const componentDefinitions = [
  {
    key: "height",
    label: "舌の高さ",
    options: [
      ["high", "高い"],
      ["mid", "中間"],
      ["low", "低い"],
    ],
  },
  {
    key: "backness",
    label: "舌の前後",
    options: [
      ["front", "前"],
      ["central", "中央"],
      ["back", "後ろ"],
    ],
  },
  {
    key: "rounding",
    label: "唇の丸め",
    options: [
      ["rounded", "円唇"],
      ["unrounded", "非円唇"],
    ],
  },
  {
    key: "tenseness",
    label: "緊張性",
    options: [
      ["tense", "緊張"],
      ["lax", "弛緩"],
      ["neutral", "中立"],
      ["unspecified", "未指定"],
    ],
  },
] as const;

type ComponentKey = (typeof componentDefinitions)[number]["key"];
type Answers = Record<ComponentKey, string | null>;

const emptyAnswers: Answers = {
  height: null,
  backness: null,
  rounding: null,
  tenseness: null,
};

function valueLabel(value: string) {
  for (const definition of componentDefinitions) {
    const option = definition.options.find(([optionValue]) => {
      return optionValue === value;
    });

    if (option !== undefined) {
      return option[1];
    }
  }

  return value;
}

export default function ComponentBuilder() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [hasChecked, setHasChecked] = useState(false);

  const targetVowel = targetVowels[targetIndex];
  const correctFeatures = ipaData.phonemes[targetVowel]
    .features as Record<ComponentKey, string>;
  const exampleWords = useMemo(() => {
    return practiceConfig.rows
      .map((row) => row.find((word) => word.target_vowel === targetVowel)?.word)
      .filter((word): word is string => word !== undefined);
  }, [targetVowel]);
  const isComplete = Object.values(answers).every((answer) => answer !== null);
  const correctCount = componentDefinitions.filter(({ key }) => {
    return answers[key] === correctFeatures[key];
  }).length;
  const isAllCorrect = correctCount === componentDefinitions.length;

  function selectAnswer(key: ComponentKey, value: string) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setHasChecked(false);
  }

  function selectTarget(index: number) {
    setTargetIndex(index);
    setAnswers(emptyAnswers);
    setHasChecked(false);
  }

  function showNextTarget() {
    selectTarget((targetIndex + 1) % targetVowels.length);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 space-y-7">
        {componentDefinitions.map((definition) => (
          <fieldset key={definition.key}>
            <legend className="font-bold text-slate-950">
              {definition.label}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {definition.options.map(([value, label]) => {
                const isSelected = answers[definition.key] === value;
                const isCorrectChoice = correctFeatures[definition.key] === value;
                const answerClassName = hasChecked
                  ? isCorrectChoice
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : isSelected
                      ? "border-red-500 bg-red-50 text-red-900"
                      : "border-slate-300 bg-white text-slate-700"
                  : isSelected
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-emerald-500";

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectAnswer(definition.key, value)}
                    className={`min-h-11 rounded-xl border px-4 py-2 font-semibold transition ${answerClassName}`}
                    aria-pressed={isSelected}
                  >
                    {label}
                    {hasChecked && isCorrectChoice ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
            {hasChecked && answers[definition.key] !== correctFeatures[definition.key] && (
              <p className="mt-2 text-sm text-red-700">
                選択：{valueLabel(answers[definition.key] ?? "未選択")}／
                正しい構成要素：{valueLabel(correctFeatures[definition.key])}
              </p>
            )}
          </fieldset>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!isComplete}
          onClick={() => setHasChecked(true)}
          className="min-h-12 rounded-full bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          構成要素を答え合わせ
        </button>
        <button
          type="button"
          onClick={() => {
            setAnswers(emptyAnswers);
            setHasChecked(false);
          }}
          className="min-h-12 rounded-full border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
        >
          選び直す
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
              : `${componentDefinitions.length}項目中${correctCount}項目が合っています。`}
          </p>
          <p className="mt-2 text-sm leading-6">
            正解を確認したら、音の違いを構成要素の違いとして見比べてみましょう。
          </p>
          <button
            type="button"
            onClick={showNextTarget}
            className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 font-bold text-white transition hover:bg-slate-800"
          >
            次の発音記号へ
          </button>
        </div>
      )}
    </div>
  );
}

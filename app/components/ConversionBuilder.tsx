"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import ipaData from "../backend/data/ipa_features.json";
import FreeConceptMap, {
  assessConceptMap,
  emptyConceptMapSnapshot,
  type ConceptMapSnapshot,
  correctConceptMapConnections,
} from "./FreeConceptMap";
import {
  createVowelStructure,
  pronunciationComponentDefinitions,
  type PronunciationComponentKey,
  type VowelFeatureKey,
} from "./PronunciationDragDrop";
import VowelStructureWorkspace from "./VowelStructureWorkspace";

const conversionTasks = [
  { source: "æ", target: "ʌ" },
  { source: "ʌ", target: "ɑ" },
  { source: "ɑ", target: "æ" },
] as const;

function componentLabel(key: PronunciationComponentKey) {
  return pronunciationComponentDefinitions.find(
    (definition) => definition.key === key,
  )
    ?.label ?? key;
}

function hasSameKeys(
  selected: PronunciationComponentKey[],
  correct: PronunciationComponentKey[],
) {
  return selected.length === correct.length &&
    correct.every((key) => selected.includes(key));
}

export default function ConversionBuilder() {
  const [taskIndex, setTaskIndex] = useState(0);
  const [mapSnapshot, setMapSnapshot] = useState<ConceptMapSnapshot>(
    emptyConceptMapSnapshot,
  );
  const [mapRevision, setMapRevision] = useState(0);
  const [hasCheckedStructure, setHasCheckedStructure] = useState(false);
  const [selectedDifferences, setSelectedDifferences] = useState<
    PronunciationComponentKey[]
  >([]);
  const [selectedCommonalities, setSelectedCommonalities] = useState<
    PronunciationComponentKey[]
  >([]);
  const [hasCheckedComparison, setHasCheckedComparison] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const task = conversionTasks[taskIndex];
  const sourceFeatures = ipaData.phonemes[task.source]
    .features as Record<VowelFeatureKey, string>;
  const targetFeatures = ipaData.phonemes[task.target]
    .features as Record<VowelFeatureKey, string>;
  const sourceStructure = createVowelStructure(task.source, sourceFeatures);
  const targetStructure = createVowelStructure(task.target, targetFeatures);
  const correctDifferences = useMemo(() => {
    return pronunciationComponentDefinitions
      .filter(({ key }) => sourceStructure[key] !== targetStructure[key])
      .map(({ key }) => key);
  }, [sourceStructure, targetStructure]);
  const correctCommonalities = useMemo(() => {
    return pronunciationComponentDefinitions
      .filter(({ key }) => sourceStructure[key] === targetStructure[key])
      .map(({ key }) => key);
  }, [sourceStructure, targetStructure]);
  const structureAssessment = assessConceptMap(mapSnapshot, targetStructure);
  const isStructureComplete = structureAssessment.isReady;
  const isStructureCorrect = structureAssessment.isCorrect;
  const isComparisonComplete =
    selectedDifferences.length > 0 && selectedCommonalities.length > 0;
  const isComparisonCorrect =
    hasSameKeys(selectedDifferences, correctDifferences) &&
    hasSameKeys(selectedCommonalities, correctCommonalities);
  const hasCompletedAll = completedCount === conversionTasks.length;

  const updateMapSnapshot = useCallback((snapshot: ConceptMapSnapshot) => {
    setMapSnapshot(snapshot);
    setHasCheckedStructure(false);
  }, []);

  function toggleComponent(
    key: PronunciationComponentKey,
    selected: PronunciationComponentKey[],
    setSelected: React.Dispatch<
      React.SetStateAction<PronunciationComponentKey[]>
    >,
  ) {
    setSelected(
      selected.includes(key)
        ? selected.filter((selectedKey) => selectedKey !== key)
        : [...selected, key],
    );
    setHasCheckedComparison(false);
  }

  function showNextTask() {
    const nextCompletedCount = completedCount + 1;
    setCompletedCount(nextCompletedCount);

    if (nextCompletedCount < conversionTasks.length) {
      setTaskIndex(taskIndex + 1);
      setMapSnapshot(emptyConceptMapSnapshot);
      setMapRevision((current) => current + 1);
      setHasCheckedStructure(false);
      setSelectedDifferences([]);
      setSelectedCommonalities([]);
      setHasCheckedComparison(false);
    }
  }

  if (hasCompletedAll) {
    return (
      <section className="mt-8 border-t border-emerald-200 pt-8">
        <p className="text-sm font-bold text-emerald-700">
          構造変換 3 / 3 問完了
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          構成理解の学習が完了しました
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          それぞれの母音を構成し、近い母音へ作り替えるときに変える要素と残す要素を確認しました。
          次は実際に単語を発音して、構成要素の違いを意識します。
        </p>
        <Link
          href="/practice"
          className="mt-5 inline-flex min-h-12 items-center rounded-full bg-violet-700 px-6 py-3 font-bold text-white transition hover:bg-violet-800"
        >
          発音練習へ進む
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-8 border-t border-emerald-200 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-emerald-700">
            学部版の構造変換活動
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            近い母音へ作り替える
          </h2>
        </div>
        <p className="font-semibold text-slate-600">
          {completedCount} / {conversionTasks.length} 問完了
        </p>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        学部版の /ɑː/ に相当する対象は、現在の音声モデルと辞書に合わせて
        /ɑ/ と表記しています。
      </p>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="構造変換の進捗"
        aria-valuemin={0}
        aria-valuemax={conversionTasks.length}
        aria-valuenow={completedCount}
      >
        <div
          className="h-full bg-emerald-600 transition-[width]"
          style={{
            width: `${(completedCount / conversionTasks.length) * 100}%`,
          }}
        />
      </div>

      <div className="mt-7">
        <div className="mx-auto max-w-2xl">
          <p className="mb-2 text-sm font-bold text-slate-700">変換前の構造</p>
          <VowelStructureWorkspace
            values={sourceStructure}
            label={`変換前 /${task.source}/ の構造`}
            workspaceId={`conversion-source-${taskIndex}`}
          />
        </div>

        <p
          aria-hidden="true"
          className="my-5 text-center text-3xl font-bold text-emerald-700"
        >
          ↓
        </p>

        <div>
          <p className="mb-2 text-sm font-bold text-emerald-700">
            作り替える概念マップ
          </p>
          <FreeConceptMap
            key={`${taskIndex}-${mapRevision}`}
            mapLabel={`変換後 /${task.target}/ を自由に組み立てる概念マップ`}
            onChange={updateMapSnapshot}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isStructureComplete}
        onClick={() => setHasCheckedStructure(true)}
        className="mt-7 min-h-12 rounded-full bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        作り替えた構成を確認
      </button>

      {hasCheckedStructure ? (
        <div
          role="status"
          className={`mt-5 p-5 ${
            isStructureCorrect
              ? "bg-emerald-50 text-emerald-950"
              : "bg-amber-50 text-amber-950"
          }`}
        >
          <p className="font-bold">
            {isStructureCorrect
              ? `/${task.target}/ の構成に作り替えられました。`
              : `正しいノード ${structureAssessment.correctNodeCount}/${pronunciationComponentDefinitions.length}、正しい接続 ${structureAssessment.correctConnectionCount}/${correctConceptMapConnections.length} です。`}
          </p>
        </div>
      ) : null}

      {hasCheckedStructure && isStructureCorrect ? (
        <div className="mt-8 border-t border-slate-200 pt-7">
          <h3 className="text-xl font-bold text-slate-950">
            何を変えて、何を残しましたか？
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            変換前と変換後を比べ、該当する構成要素をすべて選択してください。
          </p>

          <fieldset className="mt-6">
            <legend className="font-bold text-red-800">
              変えた構成要素
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {pronunciationComponentDefinitions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleComponent(
                    key,
                    selectedDifferences,
                    setSelectedDifferences,
                  )}
                  aria-pressed={selectedDifferences.includes(key)}
                  className={`min-h-11 rounded-xl border px-4 py-2 font-semibold transition ${
                    selectedDifferences.includes(key)
                      ? "border-red-700 bg-red-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-red-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="font-bold text-blue-800">
              残した共通の構成要素
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {pronunciationComponentDefinitions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleComponent(
                    key,
                    selectedCommonalities,
                    setSelectedCommonalities,
                  )}
                  aria-pressed={selectedCommonalities.includes(key)}
                  className={`min-h-11 rounded-xl border px-4 py-2 font-semibold transition ${
                    selectedCommonalities.includes(key)
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            disabled={!isComparisonComplete}
            onClick={() => setHasCheckedComparison(true)}
            className="mt-7 min-h-12 rounded-full bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            差分と共通点を確認
          </button>

          {hasCheckedComparison ? (
            <div
              role="status"
              className={`mt-5 p-5 ${
                isComparisonCorrect
                  ? "bg-emerald-50 text-emerald-950"
                  : "bg-amber-50 text-amber-950"
              }`}
            >
              <p className="font-bold">
                {isComparisonCorrect
                  ? "差分と共通点を正しく見つけられました。"
                  : "選択をもう一度見比べてください。"}
              </p>
              {!isComparisonCorrect ? (
                <div className="mt-3 space-y-1 text-sm leading-6">
                  <p>
                    変える要素：
                    {correctDifferences.map(componentLabel).join("・")}
                  </p>
                  <p>
                    残す要素：
                    {correctCommonalities.map(componentLabel).join("・")}
                  </p>
                </div>
              ) : null}
              {isComparisonCorrect ? (
                <button
                  type="button"
                  onClick={showNextTask}
                  className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 font-bold text-white transition hover:bg-slate-800"
                >
                  {taskIndex === conversionTasks.length - 1
                    ? "学習を完了する"
                    : "次の構造変換へ"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

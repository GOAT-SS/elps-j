"use client";

import { useDroppable } from "@dnd-kit/core";
import type {
  PronunciationComponentKey,
  PronunciationSlotData,
  PronunciationStructureValues,
} from "./PronunciationDragDrop";

const valueLabels: Record<string, string> = {
  "airflow-obstruction": "空気の流れが妨げられるか",
  vowel: "母音",
  consonant: "子音",
  "tongue-shape": "舌の形",
  "lip-shape": "唇の形",
  tenseness: "緊張性",
  high: "高い",
  mid: "中間",
  low: "低い",
  front: "前",
  central: "中央",
  back: "後ろ",
  rounded: "円唇",
  unrounded: "非円唇",
  tense: "緊張",
  lax: "弛緩",
  neutral: "中立",
  unspecified: "未指定",
};

function valueLabel(value: string | null) {
  return value === null ? "未配置" : valueLabels[value] ?? value;
}

function PartSlot({
  workspaceId,
  componentKey,
  label,
  value,
  droppable,
  symbol = false,
  compact = false,
}: {
  workspaceId: string;
  componentKey: PronunciationComponentKey;
  label: string;
  value: string | null;
  droppable: boolean;
  symbol?: boolean;
  compact?: boolean;
}) {
  const isEmpty = value === null;
  const { isOver, setNodeRef } = useDroppable({
    id: `${workspaceId}:${componentKey}`,
    disabled: !droppable,
    data: {
      kind: "pronunciation-slot",
      componentKey,
    } satisfies PronunciationSlotData,
  });

  return (
    <div
      ref={setNodeRef}
      aria-label={`${label}の部品置き場`}
      className={`${compact ? "min-h-20" : "min-h-24"} border p-3 transition ${
        isOver
          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
          : isEmpty
          ? "border-dashed border-slate-300 bg-white"
          : "border-emerald-500 bg-emerald-50"
      }`}
    >
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-2 font-bold ${
          isEmpty ? "text-slate-400" : "text-emerald-950"
        }`}
      >
        {symbol && value !== null ? `/${value}/` : valueLabel(value)}
      </p>
    </div>
  );
}

export default function VowelStructureWorkspace({
  values,
  label,
  workspaceId,
  droppable = false,
}: {
  values: PronunciationStructureValues;
  label: string;
  workspaceId: string;
  droppable?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className="border border-slate-300 bg-slate-50 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold text-slate-500">ワークスペース</p>
        <p className="text-xs text-slate-500">
          {droppable
            ? "部品を対応する枠へドラッグ"
            : "完成した構造"}
        </p>
      </div>

      <div className="mx-auto mt-5 max-w-2xl">
        <div className="mx-auto max-w-36">
          <PartSlot
            workspaceId={workspaceId}
            componentKey="symbol"
            label="発音記号"
            value={values.symbol}
            droppable={droppable}
            symbol
            compact
          />
        </div>

        <div className="mx-auto h-4 w-px bg-slate-400" />
        <div className="mx-auto max-w-64">
          <PartSlot
            workspaceId={workspaceId}
            componentKey="classificationLink"
            label="分類の関係"
            value={values.classificationLink ?? null}
            droppable={droppable}
            compact
          />
        </div>
        <div className="mx-auto h-4 w-px bg-slate-400" />
        <div className="mx-auto max-w-36">
          <PartSlot
            workspaceId={workspaceId}
            componentKey="soundType"
            label="音の種類"
            value={values.soundType}
            droppable={droppable}
            compact
          />
        </div>

        <div className="mx-auto h-5 w-px bg-slate-400" />
        <div className="mx-auto hidden h-px w-[72%] bg-slate-400 sm:block" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="mx-auto h-4 w-px bg-slate-400" />
            <div className="border border-slate-300 bg-white p-3">
              <PartSlot
                workspaceId={workspaceId}
                componentKey="tongueLink"
                label="舌への関係"
                value={values.tongueLink ?? null}
                droppable={droppable}
                compact
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PartSlot
                  workspaceId={workspaceId}
                  componentKey="height"
                  label="高さ"
                  value={values.height}
                  droppable={droppable}
                />
                <PartSlot
                  workspaceId={workspaceId}
                  componentKey="backness"
                  label="前後"
                  value={values.backness}
                  droppable={droppable}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mx-auto h-4 w-px bg-slate-400" />
            <div className="border border-slate-300 bg-white p-3">
              <PartSlot
                workspaceId={workspaceId}
                componentKey="roundingLink"
                label="唇への関係"
                value={values.roundingLink ?? null}
                droppable={droppable}
                compact
              />
              <div className="mt-3">
                <PartSlot
                  workspaceId={workspaceId}
                  componentKey="rounding"
                  label="丸め"
                  value={values.rounding}
                  droppable={droppable}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mx-auto h-4 w-px bg-slate-400" />
            <div className="border border-slate-300 bg-white p-3">
              <PartSlot
                workspaceId={workspaceId}
                componentKey="tensenessLink"
                label="緊張への関係"
                value={values.tensenessLink ?? null}
                droppable={droppable}
                compact
              />
              <div className="mt-3">
                <PartSlot
                  workspaceId={workspaceId}
                  componentKey="tenseness"
                  label="舌の緊張"
                  value={values.tenseness}
                  droppable={droppable}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

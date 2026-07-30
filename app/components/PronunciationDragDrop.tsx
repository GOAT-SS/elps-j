"use client";

import {
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

export const pronunciationComponentDefinitions = [
  {
    key: "symbol",
    label: "発音記号",
    options: [
      ["æ", "/æ/"],
      ["ʌ", "/ʌ/"],
      ["ɑ", "/ɑ/"],
    ],
  },
  {
    key: "classificationLink",
    label: "分類の関係",
    options: [
      ["airflow-obstruction", "空気の流れが妨げられるか"],
    ],
  },
  {
    key: "soundType",
    label: "音の種類",
    options: [
      ["vowel", "母音"],
      ["consonant", "子音"],
    ],
  },
  {
    key: "tongueLink",
    label: "舌への関係",
    options: [["tongue-shape", "舌の形"]],
  },
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
    key: "roundingLink",
    label: "唇への関係",
    options: [["lip-shape", "唇の形"]],
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
    key: "tensenessLink",
    label: "緊張への関係",
    options: [["tenseness", "緊張性"]],
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

export type PronunciationComponentKey =
  (typeof pronunciationComponentDefinitions)[number]["key"];

export type VowelFeatureKey =
  | "height"
  | "backness"
  | "rounding"
  | "tenseness";

export type PronunciationStructureValues = Record<
  PronunciationComponentKey,
  string | null
>;

export const emptyPronunciationStructure: PronunciationStructureValues = {
  symbol: null,
  classificationLink: null,
  soundType: null,
  tongueLink: null,
  height: null,
  backness: null,
  roundingLink: null,
  rounding: null,
  tensenessLink: null,
  tenseness: null,
};

export function createVowelStructure(
  symbol: string,
  features: Record<VowelFeatureKey, string>,
): Record<PronunciationComponentKey, string> {
  return {
    symbol,
    classificationLink: "airflow-obstruction",
    soundType: "vowel",
    tongueLink: "tongue-shape",
    roundingLink: "lip-shape",
    tensenessLink: "tenseness",
    ...features,
  };
}

export type PronunciationPartData = {
  kind: "pronunciation-part";
  componentKey: PronunciationComponentKey;
  value: string;
};

export type PronunciationSlotData = {
  kind: "pronunciation-slot";
  componentKey: PronunciationComponentKey;
};

export function usePronunciationSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );
}

export function DraggablePartButton({
  id,
  componentKey,
  value,
  label,
  selected,
  onClick,
  className,
}: {
  id: string;
  componentKey: PronunciationComponentKey;
  value: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  className: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: {
      kind: "pronunciation-part",
      componentKey,
      value,
    } satisfies PronunciationPartData,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`${className} ${
        isDragging ? "relative z-50 cursor-grabbing opacity-70" : "cursor-grab"
      }`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

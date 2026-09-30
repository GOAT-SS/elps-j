import type { SoundLesson } from "./american-english";
import type { ComponentDefinition, ConceptConnection } from "./concept-map";

type Feature = { label: string; options: ReadonlyArray<readonly [string, string]> };
const features = {
  height: { label: "舌の高さ", options: [["high", "高い"], ["near-high", "やや高い"], ["mid", "中間"], ["open-mid", "中低"], ["low", "低い"]] },
  backness: { label: "舌の前後", options: [["front", "前"], ["near-front", "前寄り"], ["central", "中央"], ["near-back", "後ろ寄り"], ["back", "後ろ"]] },
  rounding: { label: "唇の丸め", options: [["unrounded", "丸めない"], ["rounded", "丸める"], ["lightly-rounded", "軽く丸める"]] },
  tenseness: { label: "緊張性", options: [["tense", "比較的緊張"], ["lax", "弛緩"], ["neutral", "中立"], ["unspecified", "緊張・弛緩で指定しない"]] },
  startHeight: { label: "開始時の舌の高さ", options: [["close-mid", "中高"], ["open-mid", "中低"], ["low", "低い"]] },
  startBackness: { label: "開始時の舌の前後", options: [["front", "前"], ["central", "中央付近"], ["back", "後ろ"]] },
  endDirection: { label: "終了時の舌の方向", options: [["ih", "/ɪ/ 方向（前上方）"], ["uu", "/ʊ/ 方向（後ろ上方）"]] },
  lipMovement: { label: "唇の動き", options: [["unrounded", "丸めずに移る"], ["release", "丸めから緩める"], ["round", "徐々に丸める"], ["rounded", "丸めたまま狭める"]] },
  rhoticity: { label: "Rの響き", options: [["rhotic", "Rの響きを伴う"], ["plain", "Rの響きを伴わない"]] },
  tongueContact: { label: "舌先と上あご", options: [["no-contact", "舌先を上あごにつけない"], ["contact", "舌先を上の歯茎につける"]] },
  stress: { label: "強勢", options: [["stressed", "強勢あり"], ["unstressed", "強勢なし"]] },
  place: { label: "調音位置", options: [["bilabial", "両唇"], ["labiodental", "上の歯と下唇"], ["dental", "舌先と歯"], ["alveolar", "歯茎"], ["postalveolar", "歯茎の少し後ろ"], ["palatal", "硬口蓋"], ["velar", "軟口蓋"], ["glottal", "声門"], ["labio-velar", "両唇と軟口蓋"]] },
  manner: { label: "調音方法", options: [["stop", "破裂（閉鎖して開放）"], ["fricative", "摩擦（隙間に息を通す）"], ["affricate", "破擦（閉鎖から摩擦）"], ["nasal", "鼻音（鼻へ息を通す）"], ["approximant", "接近（閉鎖しない）"], ["lateral", "側面接近（舌の左右へ）"]] },
  voicing: { label: "声帯の振動", options: [["voiceless", "無声"], ["voiced", "有声"]] },
} as const satisfies Record<string, Feature>;
type FeatureKey = keyof typeof features;

// Pedagogical targets for General American; broad positions, not narrow phonetic measurements.
const vowelTargets: Record<string, readonly [string, string, string, string]> = {
  i: ["high", "front", "unrounded", "tense"],
  ih: ["near-high", "near-front", "unrounded", "lax"],
  eh: ["open-mid", "front", "unrounded", "lax"],
  ae: ["low", "front", "unrounded", "lax"],
  ah: ["low", "back", "unrounded", "unspecified"],
  aw: ["open-mid", "back", "rounded", "unspecified"],
  uu: ["near-high", "near-back", "lightly-rounded", "lax"],
  u: ["high", "near-back", "rounded", "tense"],
  uh: ["open-mid", "central", "unrounded", "lax"],
  schwa: ["mid", "central", "unrounded", "neutral"],
};
const diphthongTargets: Record<string, readonly [string, string, string, string]> = {
  ay: ["close-mid", "front", "ih", "unrounded"],
  eye: ["low", "central", "ih", "unrounded"],
  oy: ["open-mid", "back", "ih", "release"],
  ow: ["low", "central", "uu", "round"],
  oh: ["close-mid", "back", "uu", "rounded"],
};
const consonantTargets: Record<string, readonly [string, string, string]> = {
  p: ["bilabial", "stop", "voiceless"], b: ["bilabial", "stop", "voiced"],
  t: ["alveolar", "stop", "voiceless"], d: ["alveolar", "stop", "voiced"],
  k: ["velar", "stop", "voiceless"], g: ["velar", "stop", "voiced"],
  f: ["labiodental", "fricative", "voiceless"], v: ["labiodental", "fricative", "voiced"],
  th: ["dental", "fricative", "voiceless"], dh: ["dental", "fricative", "voiced"],
  s: ["alveolar", "fricative", "voiceless"], z: ["alveolar", "fricative", "voiced"],
  sh: ["postalveolar", "fricative", "voiceless"], zh: ["postalveolar", "fricative", "voiced"],
  h: ["glottal", "fricative", "voiceless"],
  ch: ["postalveolar", "affricate", "voiceless"], jh: ["postalveolar", "affricate", "voiced"],
  m: ["bilabial", "nasal", "voiced"], n: ["alveolar", "nasal", "voiced"], ng: ["velar", "nasal", "voiced"],
  l: ["alveolar", "lateral", "voiced"], r: ["postalveolar", "approximant", "voiced"],
  y: ["palatal", "approximant", "voiced"], w: ["labio-velar", "approximant", "voiced"],
};

function targetFeatures(sound: SoundLesson): Array<readonly [FeatureKey, string]> {
  if (sound.group === "vowel") {
    const values = vowelTargets[sound.slug];
    if (!values) throw new Error(`Missing vowel structure: ${sound.slug}`);
    const keys: FeatureKey[] = ["height", "backness", "rounding", "tenseness"];
    const result: Array<readonly [FeatureKey, string]> = keys.map((key, i) => [key, values[i]]);
    if (sound.slug === "uh" || sound.slug === "schwa") result.push(["stress", sound.slug === "uh" ? "stressed" : "unstressed"]);
    return result;
  }
  if (sound.group === "diphthong") {
    const values = diphthongTargets[sound.slug];
    if (!values) throw new Error(`Missing diphthong structure: ${sound.slug}`);
    return (["startHeight", "startBackness", "endDirection", "lipMovement"] as const).map((key, i) => [key, values[i]]);
  }
  if (sound.group === "rhotic") {
    if (!["er-stressed", "er-unstressed"].includes(sound.slug)) throw new Error(`Missing rhotic structure: ${sound.slug}`);
    return [["rhoticity", "rhotic"], ["tongueContact", "no-contact"], ["stress", sound.slug === "er-stressed" ? "stressed" : "unstressed"]];
  }
  const values = consonantTargets[sound.slug];
  if (!values) throw new Error(`Missing consonant structure: ${sound.slug}`);
  return (["place", "manner", "voicing"] as const).map((key, i) => [key, values[i]]);
}

export function createSoundExercise(sound: SoundLesson) {
  const definitions: ComponentDefinition[] = [
    { key: "symbol", label: "発音記号", options: [[sound.symbol, `/${sound.symbol}/`]] },
    { key: "classificationLink", label: "分類の関係", options: [["classified-as", "音の種類は"]] },
    { key: "soundType", label: "音の種類", options: [["vowel", "単母音"], ["diphthong", "二重母音"], ["rhotic", "R音性母音"], ["consonant", "子音"]] },
  ];
  const values: Record<string, string> = { symbol: sound.symbol, classificationLink: "classified-as", soundType: sound.group };
  const connections: ConceptConnection[] = [["symbol", "classificationLink"], ["classificationLink", "soundType"]];
  for (const [key, value] of targetFeatures(sound)) {
    const feature = features[key];
    const relation = `${key}Link`;
    definitions.push({ key: relation, label: `${feature.label}への関係`, options: [[key, `${feature.label}は`]] });
    definitions.push({ key, label: feature.label, options: feature.options });
    values[relation] = key;
    values[key] = value;
    connections.push(["soundType", relation], [relation, key]);
  }
  return { definitions, values, connections };
}

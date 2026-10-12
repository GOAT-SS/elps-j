import { featureDefinitions, type SoundLesson } from './american-english.ts';
import type { ComponentDefinition, ConceptConnection } from './concept-map.ts';

export function createSoundExercise(sound: SoundLesson) {
  const definitions: ComponentDefinition[] = [
    { key: 'symbol', label: '発音記号', options: [[sound.symbol, `/${sound.symbol}/`]] },
    { key: 'classificationLink', label: '分類の関係', options: [['classified-as', '音の種類は']] },
    { key: 'soundType', label: '音の種類', options: [['vowel', '単母音'], ['diphthong', '二重母音'], ['rhotic', 'R音性母音'], ['consonant', '子音']] },
  ];
  const values: Record<string, string> = { symbol: sound.symbol, classificationLink: 'classified-as', soundType: sound.group };
  const connections: ConceptConnection[] = [['symbol', 'classificationLink'], ['classificationLink', 'soundType']];
  for (const [key, value] of Object.entries(sound.structure)) {
    const feature = featureDefinitions[key as keyof typeof featureDefinitions];
    const relation = `${key}Link`;
    definitions.push({ key: relation, label: `${feature.label}への関係`, options: [[key, `${feature.label}は`]] });
    definitions.push({ key, label: feature.label, options: feature.options.map(([value, label]) => [value, label] as const) });
    values[relation] = key;
    values[key] = value;
    connections.push(['soundType', relation], [relation, key]);
  }
  return { definitions, values, connections };
}

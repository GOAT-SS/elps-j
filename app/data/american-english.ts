import curriculum from './curriculum.json' with { type: 'json' };

export type SoundGroup = 'vowel' | 'diphthong' | 'rhotic' | 'consonant';
export type SoundLesson = {
  slug: string; symbol: string; group: SoundGroup; name: string;
  examples: { word: string; ipa: string }[];
  features: string[]; steps: string[]; tip: string; comparison: string; aliases: string;
  structure: Record<string, string>;
};
export const soundGroups = curriculum.groups as Array<{id: SoundGroup; title: string; description: string}>;
export const soundLessons: SoundLesson[] = curriculum.lessons.map(sound => ({ ...sound, group: sound.group as SoundGroup, structure: Object.fromEntries(Object.entries(sound.structure).filter(([, value]) => typeof value === 'string')) }));
export const featureDefinitions = curriculum.featureDefinitions;

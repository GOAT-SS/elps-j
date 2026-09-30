// Run with Node 22.18+ / 24: node --experimental-strip-types --test tests/*.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { soundLessons } from '../app/data/american-english.ts';
import { createSoundExercise } from '../app/data/american-english-structures.ts';
import { assessStructure } from '../app/data/concept-map.ts';

const snapshotFor = (exercise) => ({
  values: { ...exercise.values },
  connections: exercise.connections.map(([source, target]) => ({ source, target })),
});

test('all 41 lessons have selectable, fully connected and gradable exercises', () => {
  assert.equal(soundLessons.length, 41);
  assert.deepEqual(new Set(soundLessons.map((sound) => sound.symbol)), new Set('i ɪ ɛ æ ɑ ɔ ʊ u ʌ ə eɪ aɪ ɔɪ aʊ oʊ ɝ ɚ p b t d k g f v θ ð s z ʃ ʒ h tʃ dʒ m n ŋ l r j w'.split(' ')));
  for (const lesson of soundLessons) {
    const exercise = createSoundExercise(lesson);
    assert.equal(new Set(exercise.definitions.map(({key})=>key)).size, exercise.definitions.length);
    for (const definition of exercise.definitions) {
      assert(definition.options.some(([value]) => value === exercise.values[definition.key]), `${lesson.slug}: ${definition.key}`);
    }
    assert.equal(exercise.connections.length, exercise.definitions.length - 1);
    const reached = new Set(['symbol']);
    for (const [source, target] of exercise.connections) {
      assert(reached.has(source)); reached.add(target);
    }
    assert.equal(reached.size, exercise.definitions.length);
    assert(assessStructure(snapshotFor(exercise), exercise.values, exercise.connections).isCorrect, lesson.slug);
    for (const definition of exercise.definitions.filter((item) => item.options.length > 1)) {
      const snapshot = snapshotFor(exercise);
      snapshot.values[definition.key] = definition.options.find(([value]) => value !== exercise.values[definition.key])[0];
      const result = assessStructure(snapshot, exercise.values, exercise.connections);
      assert(!result.isCorrect);
      assert.deepEqual(result.incorrectKeys, [definition.key]);
    }
  }
});

test('incomplete, reversed, extra and duplicate connections never pass', () => {
  for (const lesson of soundLessons) {
    const exercise = createSoundExercise(lesson);
    const grade = (snapshot) => assessStructure(snapshot, exercise.values, exercise.connections);
    const missingNode = snapshotFor(exercise); delete missingNode.values.soundType;
    assert(!grade(missingNode).isReady);
    const missingEdge = snapshotFor(exercise); missingEdge.connections.pop();
    assert(!grade(missingEdge).isReady);
    const reversed = snapshotFor(exercise);
    reversed.connections[0] = { source: 'classificationLink', target: 'symbol' };
    assert(grade(reversed).isReady); assert(!grade(reversed).isCorrect);
    const extra = snapshotFor(exercise); extra.connections.push({source: 'symbol', target: 'soundType'});
    assert(!grade(extra).isCorrect); assert.equal(grade(extra).extraConnections.length, 1);
    const duplicate = snapshotFor(exercise); duplicate.connections.push(duplicate.connections[0]);
    assert(!grade(duplicate).isCorrect);
  }
});

test('category-specific distinctions match the American English lessons', () => {
  const values = (slug) => createSoundExercise(soundLessons.find((sound) => sound.slug === slug)).values;
  assert.equal(values('p').voicing, 'voiceless');
  assert.equal(values('b').voicing, 'voiced');
  assert.equal(values('th').place, 'dental');
  assert.equal(values('r').manner, 'approximant');
  assert.equal(values('l').manner, 'lateral');
  assert.equal(values('er-stressed').stress, 'stressed');
  assert.equal(values('er-unstressed').stress, 'unstressed');
  assert.equal(values('uh').stress, 'stressed');
  assert.equal(values('schwa').stress, 'unstressed');
  assert.equal(values('ay').endDirection, 'ih');
  assert.equal(values('oh').endDirection, 'uu');
  assert.equal(values('oy').lipMovement, 'release');
  assert.equal(values('ih').height, 'near-high');
  assert.equal(values('eh').height, 'open-mid');
  assert.equal(values('ae').height, 'low');
});

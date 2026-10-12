import unittest
from backend.curriculum import LESSONS, LEGACY_WORDS, resolve_practice, candidate_targets, evaluate, normalize_ipa


def scores(practice, best):
    return [{**candidate, 'relativeScorePercent': 95 if candidate['sound'] == best else 0.1} for candidate in candidate_targets(practice)]


class CurriculumTests(unittest.TestCase):
    def test_all_82_examples_resolve_and_contain_the_selected_phoneme(self):
        self.assertEqual(len(LESSONS), 41)
        self.assertEqual(sum(len(lesson['examples']) for lesson in LESSONS.values()), 82)
        for slug, lesson in LESSONS.items():
            for example in lesson['examples']:
                with self.subTest(slug=slug, word=example['word']):
                    practice = resolve_practice(example['word'], slug)
                    candidates = candidate_targets(practice)
                    self.assertEqual(next(candidate['candidateIPA'] for candidate in candidates if candidate['slug'] == slug), normalize_ipa(example['ipa']))
                    result = evaluate(practice, example['ipa'], scores(practice, lesson['symbol']))
                    self.assertEqual(result['evaluationStatus'], 'matched')
                    self.assertEqual(result['targetSound'], lesson['symbol'])
                    for component in result['soundComponentAnalysis']:
                        self.assertEqual(component['target'], lesson['structure'][component['component']])

    def test_same_word_evaluates_selected_sound(self):
        for word, slug, target in [('see', 'i', 'i'), ('see', 's', 's'), ('hat', 'h', 'h'), ('cat', 't', 't')]:
            practice = resolve_practice(word, slug)
            result = evaluate(practice, practice['expectedIPA'], scores(practice, target))
            self.assertEqual(result['targetSound'], target)
            self.assertEqual(result['evaluationStatus'], 'matched')

    def test_unknown_words_or_wrong_sound_are_rejected(self):
        for word, slug in [('see', None), ('see', 'bad'), ('cap', 'h')]:
            with self.assertRaises(ValueError): resolve_practice(word, slug)

    def test_legacy_9_words_still_work(self):
        for word in LEGACY_WORDS:
            self.assertEqual(resolve_practice(word, None)['word'], word)

    def test_whole_phoneme_replacement_and_rhotic_normalization(self):
        self.assertEqual(normalize_ipa(' /ˈbɜːɹd/ '), 'bɝd')
        self.assertEqual(normalize_ipa('ˈtit͡ʃəɹ'), 'titʃɚ')
        practice = resolve_practice('teacher', 'er-unstressed')
        self.assertTrue(all(candidate['candidateIPA'].startswith('titʃ') for candidate in candidate_targets(practice)))
        practice = resolve_practice('day', 'ay')
        self.assertEqual(next(candidate['candidateIPA'] for candidate in candidate_targets(practice) if candidate['slug'] == 'eye'), 'daɪ')

    def test_wrong_context_silence_and_disagreement_never_pass(self):
        practice = resolve_practice('cap', 'ae')
        for observed in ['', 'æ', 'bæp', 'kæpi', 'ɾæp']:
            result = evaluate(practice, observed, scores(practice, 'æ'))
            self.assertEqual(result['evaluationStatus'], 'retry')
            self.assertIsNone(result['feedbackBasis'])
            self.assertIsNone(result['soundComponentAnalysis'])
        result = evaluate(practice, 'kæp', scores(practice, 'ʌ'))
        self.assertEqual(result['evaluationStatus'], 'ambiguous')
        self.assertEqual(result['feedbackBasis'], 'inferred_phoneme')
        self.assertTrue(all(item['matches'] is not False for item in result['soundComponentAnalysis']))
        self.assertEqual(evaluate(practice, 'kæp', [])['evaluationStatus'], 'ambiguous')
        tied = [{**candidate, 'relativeScorePercent': 10} for candidate in candidate_targets(practice)]
        self.assertEqual(evaluate(practice, 'kæp', tied)['evaluationStatus'], 'ambiguous')

    def test_clear_mismatch_uses_shared_features(self):
        practice = resolve_practice('cap', 'ae')
        result = evaluate(practice, 'kʌp', scores(practice, 'ʌ'))
        self.assertEqual(result['evaluationStatus'], 'sound_mismatch')
        height = next(item for item in result['soundComponentAnalysis'] if item['component'] == 'height')
        self.assertEqual(height['inferred'], 'open-mid')

    def test_paper_example_identifies_changes_and_common_components(self):
        practice = resolve_practice('cap', 'ae')
        result = evaluate(practice, 'kʌp', scores(practice, 'ʌ'))
        self.assertEqual(result['schemaVersion'], 3)
        self.assertEqual(result['feedbackBasis'], 'inferred_phoneme')
        changes = {item['component'] for item in result['soundComponentAnalysis'] if item['matches'] is False}
        common = {item['component'] for item in result['soundComponentAnalysis'] if item['matches'] is True}
        self.assertEqual(changes, {'height', 'backness'})
        self.assertEqual(common, {'rounding', 'tenseness'})

    def test_feedback_always_follows_transcription_even_when_ranking_disagrees(self):
        # Every within-group phoneme pair, not just the paper's three vowels.
        for slug, lesson in LESSONS.items():
            practice = resolve_practice(lesson['examples'][0]['word'], slug)
            for candidate in candidate_targets(practice):
                result = evaluate(practice, candidate['candidateIPA'], scores(practice, lesson['symbol']))
                inferred = LESSONS[candidate['slug']]
                with self.subTest(target=slug, inferred=candidate['slug']):
                    self.assertEqual(result['observedSound'], inferred['symbol'])
                    for item in result['soundComponentAnalysis']:
                        self.assertEqual(item['inferred'], inferred['structure'].get(item['component']))
                    if candidate['slug'] != slug:
                        self.assertEqual(result['evaluationStatus'], 'ambiguous')

    def test_low_or_missing_scores_give_conditional_feedback_and_unspecified_is_not_common(self):
        practice = resolve_practice('cap', 'ae')
        for candidate_scores in [[], [{**candidate, 'relativeScorePercent': 10} for candidate in candidate_targets(practice)]]:
            result = evaluate(practice, 'kɑp', candidate_scores)
            self.assertEqual(result['evaluationStatus'], 'ambiguous')
            self.assertIn('参考', result['message'])
            tension = next(item for item in result['soundComponentAnalysis'] if item['component'] == 'tenseness')
            self.assertEqual(tension['inferred'], 'unspecified')
            self.assertIsNone(tension['matches'])

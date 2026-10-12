"""Shared teaching targets. No model or web-server dependencies."""
import json
from pathlib import Path
import re

DATA_DIRECTORY = Path(__file__).resolve().parent.parent / 'app' / 'data'
CURRICULUM = json.loads((DATA_DIRECTORY / 'curriculum.json').read_text(encoding='utf-8'))
LESSONS = {lesson['slug']: lesson for lesson in CURRICULUM['lessons']}
LEGACY_CONFIG = json.loads((DATA_DIRECTORY / 'practice_words.json').read_text(encoding='utf-8'))
LEGACY_WORDS = {word['word']: word for row in LEGACY_CONFIG['rows'] for word in row}
SYMBOL_SLUGS = {lesson['symbol']: lesson['slug'] for lesson in LESSONS.values()}


def normalize_ipa(ipa: str) -> str:
    ipa = re.sub(r'[ˈˌːˑ.\s/\[\]ʰ]', '', ipa)
    # Broad General American dictionary spellings used by this curriculum/model.
    return (ipa.replace('ɡ', 'g').replace('ɹ', 'r')
            .replace('ɜr', 'ɝ').replace('ər', 'ɚ')
            .replace('t͡ʃ', 'tʃ').replace('d͡ʒ', 'dʒ'))


def resolve_practice(word: str, sound_slug: str | None):
    word = word.strip().lower()
    if sound_slug:
        lesson = LESSONS.get(sound_slug)
        if lesson is None:
            raise ValueError('発音記号が見つかりません。選び直してください。')
        example = next((example for example in lesson['examples'] if example['word'] == word), None)
        # Keep existing three-vowel practice words usable by saved clients.
        legacy = LEGACY_WORDS.get(word)
        if example is None and legacy and legacy['target_vowel'] == lesson['symbol']:
            example = {'word': word, 'ipa': legacy['expected_ipa']}
    else:
        legacy = LEGACY_WORDS.get(word)
        if legacy is None:
            raise ValueError('練習する発音記号を指定してください。')
        lesson = LESSONS[SYMBOL_SLUGS[legacy['target_vowel']]]
        example = {'word': word, 'ipa': legacy['expected_ipa']}
    if example is None:
        raise ValueError('この発音記号の例語を選んでください。')
    return {'lesson': lesson, 'word': word, 'expectedIPA': example['ipa']}


def candidate_targets(practice):
    lesson = practice['lesson']
    expected = normalize_ipa(practice['expectedIPA'])
    target = normalize_ipa(lesson['symbol'])
    # Replace whole phonemes, never /t/ inside /tʃ/ or /ɪ/ inside /eɪ/.
    symbols = sorted({normalize_ipa(item['symbol']) for item in LESSONS.values()} | {'a', 'e', 'o'}, key=len, reverse=True)
    tokens = []
    rest = expected
    while rest:
        symbol = next((symbol for symbol in symbols if rest.startswith(symbol)), rest[0])
        tokens.append(symbol)
        rest = rest[len(symbol):]
    positions = [index for index, token in enumerate(tokens) if token == target]
    if not positions:
        raise ValueError('例語に対象の発音記号が含まれていません。')
    candidates = []
    for item in LESSONS.values():
        if item['group'] != lesson['group']:
            continue
        symbol = normalize_ipa(item['symbol'])
        replaced = [symbol if index in positions else token for index, token in enumerate(tokens)]
        candidates.append({'sound': item['symbol'], 'candidateIPA': ''.join(replaced), 'slug': item['slug']})
    return candidates


def evaluate(practice, observed_ipa, candidate_scores):
    lesson = practice['lesson']
    observed = normalize_ipa(observed_ipa)
    matching = [candidate for candidate in candidate_targets(practice) if candidate['candidateIPA'] == observed]
    observed_sound = matching[0]['sound'] if len(matching) == 1 else None
    ranked = sorted(candidate_scores, key=lambda candidate: candidate['relativeScorePercent'], reverse=True)
    best = ranked[0] if len(ranked) >= 2 else None
    margin = round(ranked[0]['relativeScorePercent'] - ranked[1]['relativeScorePercent'], 2) if best else None
    threshold = LEGACY_CONFIG['scoreMargin']['minimumForClearResult']
    if observed_sound is None:
        status = 'retry'
        message = '単語全体を確認できませんでした。静かな場所で、選んだ単語をもう一度録音してください。'
    elif best is None or margin < threshold or best['sound'] != observed_sound:
        status = 'ambiguous'
        message = '推定音を確かめる根拠が弱いため、判定は保留です。以下は推定音が正しい場合の参考フィードバックです。録音を聞き、もう一度確かめましょう。'
    elif observed_sound == lesson['symbol']:
        status = 'matched'
        message = '推定音は目標の音と一致しました。共通する構成要素を意識して、もう一度発音してみましょう。'
    else:
        status = 'sound_mismatch'
        message = f'発音した音は /{observed_sound}/ と推定されました。共通する要素を維持し、異なる要素を目標 /{lesson["symbol"]}/ に近づけてみましょう。'
    comparison = None
    # Feedback follows the transcribed phoneme, never the CTC candidate ranking.
    # Uncertain recognition may support conditional practice guidance, not a pass.
    if observed_sound is not None:
        inferred_lesson = LESSONS[SYMBOL_SLUGS[observed_sound]]
        comparison = [{
            'component': key, 'target': value,
            'inferred': inferred_lesson['structure'].get(key),
            'matches': (None if value == 'unspecified' or inferred_lesson['structure'].get(key) in (None, 'unspecified') else value == inferred_lesson['structure'][key]),
        } for key, value in lesson['structure'].items()]
    return {
        'schemaVersion': 3, 'soundSlug': lesson['slug'], 'targetSound': lesson['symbol'],
        'targetWord': practice['word'], 'expectedIPA': practice['expectedIPA'], 'observedIPA': observed_ipa,
        'observedSound': observed_sound, 'canEvaluate': observed_sound is not None,
        'evaluationStatus': status, 'message': message,
        'soundCandidateScores': candidate_scores, 'bestCandidateSound': best['sound'] if best else None,
        'scoreMargin': margin, 'scoreMarginThreshold': threshold, 'scoreMarginThresholdStatus': 'provisional',
        'scoreConfidenceStatus': 'not_evaluable' if status == 'retry' else 'ambiguous' if status == 'ambiguous' else 'clear',
        'scoreMeaning': '同じ種類の候補内相対スコアであり、正解確率ではありません。判定基準は暫定です。',
        'feedbackBasis': 'inferred_phoneme' if comparison is not None else None,
        'soundComponentAnalysis': comparison,
    }

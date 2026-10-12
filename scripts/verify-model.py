"""Optional offline smoke test against the cached model (no downloads)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.curriculum import LESSONS, resolve_practice, candidate_targets
from backend.engine import ModelEngine, MODEL_ID
from backend.tests.test_audio import wav_bytes


def verify():
    from transformers import AutoProcessor
    processor = AutoProcessor.from_pretrained(MODEL_ID, local_files_only=True)
    examples = 0
    for slug, lesson in LESSONS.items():
        for example in lesson['examples']:
            for candidate in candidate_targets(resolve_practice(example['word'], slug)):
                ipa = candidate['candidateIPA']
                if 'g' not in processor.tokenizer.get_vocab(): ipa = ipa.replace('g', 'ɡ')
                ids = processor.tokenizer(ipa, add_special_tokens=False).input_ids
                assert processor.tokenizer.unk_token_id not in ids, (slug, example['word'], ipa, ids)
            examples += 1
    print(f'Cached tokenizer: all {examples} examples and their candidate sets supported', flush=True)
    engine = ModelEngine()
    try:
        for slug, word in [('i', 'see'), ('h', 'hat'), ('ay', 'day'), ('er-stressed', 'bird')]:
            result = engine.analyze(wav_bytes(1), resolve_practice(word, slug))
            assert result['soundSlug'] == slug
            assert len(result['soundCandidateScores']) >= 2
            assert result['evaluationStatus'] != 'matched', 'Synthetic tone must not pass as speech'
            print(f'{slug}: actual inference OK; status={result["evaluationStatus"]}; candidates={len(result["soundCandidateScores"])}', flush=True)
    finally: engine.close()

if __name__ == '__main__': verify()

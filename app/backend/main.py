from fastapi import FastAPI, UploadFile, File,Form,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import subprocess
import tempfile
import wave
import torch
import librosa
import soundfile as sf
from transformers import AutoModelForCTC, AutoProcessor


MODEL_ID="KoelLabs/xlsr-english-01"
IPA_FEATURES_PATH = (
    Path(__file__).parent
    / "data"
    / "ipa_features.json"
)
PRACTICE_WORDS_PATH = (
    Path(__file__).parent.parent
    / "data"
    / "practice_words.json"
)

with IPA_FEATURES_PATH.open(encoding="utf-8") as ipa_features_file:
    IPA_FEATURES_DATA = json.load(ipa_features_file)

with PRACTICE_WORDS_PATH.open(encoding="utf-8") as practice_words_file:
    PRACTICE_CONFIG = json.load(practice_words_file)

IPA_PHONEMES = IPA_FEATURES_DATA["phonemes"]
PRACTICE_WORDS = {
    practice_word["word"]: {
        "expected_ipa": practice_word["expected_ipa"],
        "target_vowel": practice_word["target_vowel"],
    }
    for row in PRACTICE_CONFIG["rows"]
    for practice_word in row
}
VOWEL_COMPONENTS = (
    "height",
    "backness",
    "rounding",
    "tenseness",
)
UNKNOWN_COMPONENT_VALUES = {
    None,
    "unspecified",
}
SCORE_MARGIN_THRESHOLD = PRACTICE_CONFIG["scoreMargin"][
    "minimumForClearResult"
]
SCORE_MARGIN_THRESHOLD_STATUS = PRACTICE_CONFIG["scoreMargin"]["status"]

##子音があっている時だけ母音を評価
VOWEL_CANDIDATES = tuple(PRACTICE_CONFIG["candidateVowels"])
TARGET_VOWELS = set(VOWEL_CANDIDATES)
IGNORED_MARKS = {"ʰ"}


def extract_target_vowels(ipa: str) -> list[str]:
    return [
        symbol
        for symbol in ipa
        if symbol in TARGET_VOWELS
    ]


def make_consonant_skeleton(ipa: str) -> str:
    return "".join(
        symbol
        for symbol in ipa
        if symbol not in TARGET_VOWELS
        and symbol not in IGNORED_MARKS
    )


def build_vowel_component_analysis(
    target_vowel: str,
    best_candidate_vowel: str,
):
    target_entry = IPA_PHONEMES.get(target_vowel)
    candidate_entry = IPA_PHONEMES.get(best_candidate_vowel)

    if target_entry is None or candidate_entry is None:
        raise RuntimeError(
            "Vowel component data is missing from ipa_features.json"
        )

    target_features = target_entry["features"]
    candidate_features = candidate_entry["features"]
    comparison = []

    for component in VOWEL_COMPONENTS:
        target_value = target_features.get(component)
        candidate_value = candidate_features.get(component)
        values_are_known = (
            target_value not in UNKNOWN_COMPONENT_VALUES
            and candidate_value not in UNKNOWN_COMPONENT_VALUES
        )

        comparison.append(
            {
                "component": component,
                "target": target_value,
                "bestCandidate": candidate_value,
                "matches": (
                    target_value == candidate_value
                    if values_are_known
                    else None
                ),
            }
        )

    return {
        "basis": "best_candidate_vowel",
        "directMeasurement": False,
        "target": {
            "ipa": target_vowel,
            "features": target_features,
        },
        "bestCandidate": {
            "ipa": best_candidate_vowel,
            "features": candidate_features,
        },
        "comparison": comparison,
    }


def calculate_vowel_candidate_scores(
    logits: torch.Tensor,
    expected_ipa: str,
    target_vowel: str,
):
    log_probabilities = (
        logits
        .detach()
        .cpu()
        .log_softmax(dim=-1)
        .transpose(0, 1)
    )

    input_lengths = torch.tensor(
        [log_probabilities.shape[0]],
        dtype=torch.long,
    )

    candidate_losses = []

    for candidate_vowel in VOWEL_CANDIDATES:
        candidate_ipa = expected_ipa.replace(
            target_vowel,
            candidate_vowel,
            1,
        )

        target_ids = processor.tokenizer(
            candidate_ipa,
            add_special_tokens=False,
        ).input_ids

        targets = torch.tensor(
            [target_ids],
            dtype=torch.long,
        )
        target_lengths = torch.tensor(
            [len(target_ids)],
            dtype=torch.long,
        )

        loss = torch.nn.functional.ctc_loss(
            log_probabilities,
            targets,
            input_lengths,
            target_lengths,
            blank=processor.tokenizer.pad_token_id,
            reduction="none",
            zero_infinity=True,
        )[0]

        candidate_losses.append(
            {
                "vowel": candidate_vowel,
                "candidateIPA": candidate_ipa,
                "loss": float(loss.item()),
            }
        )

    relative_scores = torch.softmax(
        torch.tensor(
            [-candidate["loss"] for candidate in candidate_losses],
            dtype=torch.float32,
        ),
        dim=0,
    )

    candidate_scores = []

    for candidate, relative_score in zip(
        candidate_losses,
        relative_scores,
    ):
        candidate_scores.append(
            {
                "vowel": candidate["vowel"],
                "candidateIPA": candidate["candidateIPA"],
                "relativeScorePercent": round(
                    float(relative_score.item()) * 100,
                    2,
                ),
            }
        )

    return candidate_scores
##子音があっている時だけ母音を評価

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available() else "cpu"
)

processor = AutoProcessor.from_pretrained(
    MODEL_ID,
    local_files_only = True,
)

model = AutoModelForCTC.from_pretrained(
    MODEL_ID,
    local_files_only = True,
)

model.to(DEVICE)
model.eval()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001",
                   "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-pronunciation")
async def analyze_pronunciation(
    file: UploadFile = File(...),
    target_word: str = Form (...),
):
    normalized_target_word = target_word.strip().lower()
    practice_word = PRACTICE_WORDS.get(normalized_target_word)

    if practice_word is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported practice word",
        )

    contents = await file.read()

    with tempfile.TemporaryDirectory() as temp_directory:
        temp_path = Path(temp_directory)

        input_path = temp_path /"recording.webm"
        output_path = temp_path /"recording.wav"

        input_path.write_bytes(contents)

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",str(input_path),
                "-ac","1",
                "-ar","16000",
                "-c:a","pcm_s16le",
                str(output_path),
            ],
            check=True,
            capture_output=True,
            text = True,
        )

        with wave.open(str(output_path),"rb") as wav_file:
            sample_rate = wav_file.getframerate()
            channels = wav_file.getnchannels()
            frames = wav_file.getnframes()
            duration_seconds = frames / sample_rate

        audio_samples , audio_sample_rate = sf.read(
            str(output_path),
            dtype="float32",
        )

        trimmed_audio_samples, _ = librosa.effects.trim(
            audio_samples,
            top_db=30,
        )

        if trimmed_audio_samples.size > 0:
            audio_samples = trimmed_audio_samples

        analyzed_duration_seconds = len(audio_samples) / audio_sample_rate

        inputs = processor(
            audio_samples,
            sampling_rate=audio_sample_rate,
            return_tensors="pt",
        )
        inputs = inputs.to(DEVICE)

        with torch.inference_mode():
            logits = model(**inputs).logits

        predicted_ids = torch.argmax(logits,dim=-1).cpu()
        observed_ipa=processor.batch_decode(predicted_ids)[0]


        ####子音があっている時だけ母音を評価の評価部分
        expected_ipa = practice_word["expected_ipa"]
        target_vowel = practice_word["target_vowel"]

        candidate_scores = calculate_vowel_candidate_scores(
            logits,
            expected_ipa,
            target_vowel,
        )
        ranked_candidate_scores = sorted(
            candidate_scores,
            key=lambda candidate: candidate["relativeScorePercent"],
            reverse=True,
        )
        best_candidate = ranked_candidate_scores[0]
        score_margin = round(
            ranked_candidate_scores[0]["relativeScorePercent"]
            - ranked_candidate_scores[1]["relativeScorePercent"],
            2,
        )

        observed_vowels = extract_target_vowels(observed_ipa)

        expected_consonants = make_consonant_skeleton(expected_ipa)
        observed_consonants = make_consonant_skeleton(observed_ipa)

        can_evaluate = (
            len(observed_vowels) == 1
            and observed_consonants == expected_consonants
        )
        if not can_evaluate:
            score_confidence_status = "not_evaluable"
        elif score_margin < SCORE_MARGIN_THRESHOLD:
            score_confidence_status = "ambiguous"
        else:
            score_confidence_status = "clear"

        vowel_component_analysis = (
            build_vowel_component_analysis(
                target_vowel,
                best_candidate["vowel"],
            )
            if score_confidence_status == "clear"
            else None
        )

        if not can_evaluate:
            observed_vowel = None
            is_correct = None
            evaluation_status = "retry"
            message = "対象単語を確認できませんでした。もう一度録音してください。"
        elif score_confidence_status == "ambiguous":
            observed_vowel = observed_vowels[0]
            is_correct = None
            evaluation_status = "ambiguous"
            message = "母音候補の差が小さいため、判定を保留しました。"
        else:
            observed_vowel = observed_vowels[0]
            is_correct = observed_vowel == target_vowel

            if is_correct:
                evaluation_status = "correct"
                message = "対象の母音を正しく発音できています。"
            else:
                evaluation_status = "vowel_mismatch"
                message = "対象の母音を確認しましょう。"
        #子音があっている時だけ母音を評価の評価部分
        return{
            "originalFilename":file.filename,
            "contentType":file.content_type,
            "originalSize":len(contents),
            "wavSize":output_path.stat().st_size,
            "sampleRate":sample_rate,
            "channels":channels,
            "durationSeconds":round(duration_seconds,2),
            "analyzedDurationSeconds":round(analyzed_duration_seconds,2),
            "observedIPA":observed_ipa,
            "targetWord":normalized_target_word,
            "expectedIPA":practice_word["expected_ipa"],
            "targetVowel": practice_word["target_vowel"],
            "observedVowel": observed_vowel,
            "canEvaluate": can_evaluate,
            "isCorrect": is_correct,
            "evaluationStatus": evaluation_status,
            "message": message,
            "vowelCandidateScores": candidate_scores,
            "bestCandidateVowel": best_candidate["vowel"],
            "scoreMargin": score_margin,
            "scoreConfidenceStatus": score_confidence_status,
            "scoreMarginThreshold": SCORE_MARGIN_THRESHOLD,
            "scoreMarginThresholdStatus": SCORE_MARGIN_THRESHOLD_STATUS,
            "scoreMeaning":"候補内相対スコアであり、正解確率ではありません。",
            "vowelComponentAnalysis": vowel_component_analysis,
        }

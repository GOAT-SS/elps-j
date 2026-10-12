"""Bounded audio conversion and quality checks, testable without the model."""
from array import array
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

MAX_DURATION_SECONDS = 15
MIN_DURATION_SECONDS = 0.25


class AudioError(ValueError):
    pass


def validate_samples(samples, sample_rate):
    duration = len(samples) / sample_rate
    if duration < MIN_DURATION_SECONDS:
        raise AudioError('録音が短すぎます。単語を最後まで発音してください。')
    if duration > MAX_DURATION_SECONDS:
        raise AudioError('録音は15秒以内にしてください。')
    if not all(math.isfinite(value) for value in samples):
        raise AudioError('音声データを読み取れませんでした。もう一度録音してください。')
    rms = math.sqrt(sum(value * value for value in samples) / len(samples))
    if rms < 0.003:
        raise AudioError('声を確認できませんでした。マイクに近づいて、もう一度録音してください。')
    clipped = sum(abs(value) >= 0.999 for value in samples) / len(samples)
    if clipped > 0.1:
        raise AudioError('録音の音量が大きすぎます。マイクから少し離れてください。')
    return duration


def convert_audio(contents: bytes):
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / 'recording'
        output = Path(directory) / 'recording.wav'
        source.write_bytes(contents)
        try:
            subprocess.run([
                'ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(source),
                '-t', str(MAX_DURATION_SECONDS + 1), '-ac', '1', '-ar', '16000',
                '-c:a', 'pcm_s16le', str(output),
            ], check=True, capture_output=True, timeout=10)
        except subprocess.TimeoutExpired as error:
            raise AudioError('音声の変換に時間がかかりすぎました。もう一度録音してください。') from error
        except subprocess.CalledProcessError as error:
            raise AudioError('音声データを読み取れませんでした。もう一度録音してください。') from error
        except FileNotFoundError as error:
            raise RuntimeError('音声変換を利用できません。管理者へお知らせください。') from error
        with wave.open(str(output), 'rb') as recording:
            samples = array('h', recording.readframes(recording.getnframes()))
            if sys.byteorder != 'little':
                samples.byteswap()
            sample_rate = recording.getframerate()
        normalized = [sample / 32768 for sample in samples]
        duration = validate_samples(normalized, sample_rate)
        return normalized, sample_rate, duration

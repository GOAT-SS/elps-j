import io
import math
import unittest
import wave
from array import array
from unittest.mock import patch
import subprocess
from backend.audio import AudioError, convert_audio, validate_samples


def wav_bytes(duration=0.5, volume=0.1):
    samples = array('h', (int(volume * 32767 * math.sin(2 * math.pi * 220 * index / 16000)) for index in range(int(16000 * duration))))
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(16000); output.writeframes(samples.tobytes())
    return buffer.getvalue()


class AudioTests(unittest.TestCase):
    def test_real_ffmpeg_converts_wav_and_checks_duration(self):
        samples, rate, duration = convert_audio(wav_bytes())
        self.assertEqual(rate, 16000)
        self.assertEqual(len(samples), 8000)
        self.assertEqual(duration, 0.5)

    def test_silent_short_long_clipped_and_nonfinite_audio_are_rejected(self):
        for samples in [[], [0.1]*100, [0.0]*16000, [1.0]*16000, [float('nan')]*16000, [0.1]*240001]:
            with self.subTest(size=len(samples)):
                with self.assertRaises(AudioError): validate_samples(samples, 16000)

    def test_invalid_files_and_silent_wav_are_recoverable(self):
        for contents in [b'broken audio', wav_bytes(volume=0)]:
            with self.assertRaises(AudioError): convert_audio(contents)

    def test_conversion_timeout_is_recoverable(self):
        with patch('backend.audio.subprocess.run', side_effect=subprocess.TimeoutExpired('ffmpeg', 10)):
            with self.assertRaises(AudioError): convert_audio(b'audio')

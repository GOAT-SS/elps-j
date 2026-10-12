import os
os.environ.setdefault('PRONUNCIATION_API_KEY', 'test-only-key')
import threading
import time
import unittest
from fastapi.testclient import TestClient
from backend.main import create_app, MAX_UPLOAD_BYTES
from backend.audio import AudioError
from backend.engine import EngineBusy, EngineTimeout
from backend.curriculum import LESSONS, evaluate
from backend.tests.test_curriculum import scores


class FakeEngine:
    def __init__(self):
        self.error = None
        self.entered = threading.Event()
        self.release = threading.Event()
        self.block = False
        self.calls = 0
    def analyze(self, contents, practice):
        self.calls += 1
        if self.error: raise self.error
        if self.block:
            self.entered.set(); self.release.wait(2)
        return evaluate(practice, practice['expectedIPA'], scores(practice, practice['lesson']['symbol']))
    def close(self): pass


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = FakeEngine()
        self.client = TestClient(create_app(self.engine, api_key='private-test-key'))
    def post(self, word='see', slug='i', contents=b'audio', key='private-test-key'):
        return self.client.post('/analyze-pronunciation', data={'target_word': word, 'sound_slug': slug}, files={'file': ('audio.wav', contents, 'audio/wav')}, headers={'X-Pronunciation-Api-Key': key})
    def test_all_82_examples_return_selected_sound(self):
        for slug, lesson in LESSONS.items():
            for example in lesson['examples']:
                response = self.post(example['word'], slug)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()['targetSound'], lesson['symbol'])
    def test_auth_target_and_upload_validation(self):
        self.assertEqual(self.post(key='wrong').status_code, 401)
        self.assertEqual(self.post(slug='unknown').status_code, 400)
        self.assertEqual(self.post(contents=b'').status_code, 422)
        self.assertEqual(self.post(contents=b'x'*(MAX_UPLOAD_BYTES+1)).status_code, 413)
        self.assertEqual(self.engine.calls, 0)
    def test_recoverable_errors_and_successful_retry(self):
        for failure, status in [(AudioError('無音です'), 422), (EngineBusy('busy'), 429), (EngineTimeout('timeout'), 504), (RuntimeError('private detail'), 503)]:
            self.engine.error = failure
            if status == 503:
                with self.assertLogs(level='ERROR'):
                    response = self.post()
            else:
                response = self.post()
            self.assertEqual(response.status_code, status)
            self.assertNotIn('private detail', response.text)
            if status == 429: self.assertEqual(response.headers['Retry-After'], '3')
        self.engine.error = None
        self.assertEqual(self.post().status_code, 200)
    def test_health_responds_during_inference(self):
        self.engine.block = True
        result = []
        worker = threading.Thread(target=lambda: result.append(self.post().status_code))
        worker.start()
        try:
            self.assertTrue(self.engine.entered.wait(1))
            started = time.monotonic()
            self.assertEqual(self.client.get('/health').status_code, 200)
            self.assertLess(time.monotonic()-started, 0.5)
        finally:
            self.engine.release.set(); worker.join(2)
        self.assertEqual(result, [200])

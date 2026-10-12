import time
import threading
import unittest
from unittest.mock import patch
from backend.engine import ModelEngine, EngineBusy, EngineTimeout
from backend.curriculum import resolve_practice


def responsive_worker(connection):
    try:
        while True:
            payload = connection.recv()
            if payload is None: break
            samples, rate, practice = payload
            connection.send({'result': {'targetWord': practice['word']}})
    except EOFError: pass
    finally: connection.close()


def stalled_worker(connection):
    connection.recv()
    time.sleep(10)


class EngineTests(unittest.TestCase):
    def test_persistent_worker_reused_and_released(self):
        engine = ModelEngine(timeout_seconds=3, worker_target=responsive_worker)
        with patch('backend.engine.convert_audio', return_value=([0.1]*8000, 16000, 0.5)):
            try:
                engine.analyze(b'audio', resolve_practice('see', 'i'))
                process_id = engine._process.pid
                self.assertEqual(engine.analyze(b'audio', resolve_practice('hat', 'h'))['targetWord'], 'hat')
                self.assertEqual(engine._process.pid, process_id)
            finally: engine.close()
        self.assertIsNone(engine._process)
    def test_timeout_kills_worker_and_allows_retry(self):
        engine = ModelEngine(timeout_seconds=0.3, worker_target=stalled_worker)
        with patch('backend.engine.convert_audio', return_value=([0.1]*8000, 16000, 0.5)):
            try:
                with self.assertRaises(EngineTimeout): engine.analyze(b'audio', resolve_practice('see', 'i'))
                self.assertIsNone(engine._process)
                engine.worker_target = responsive_worker
                engine.timeout_seconds = 3
                self.assertEqual(engine.analyze(b'audio', resolve_practice('hat', 'h'))['targetWord'], 'hat')
            finally: engine.close()
    def test_busy_rejected_without_queuing(self):
        engine = ModelEngine()
        entered = threading.Event(); release = threading.Event()
        def conversion(_contents):
            entered.set(); release.wait(2)
            raise ValueError('test conversion stopped')
        def analyze():
            try: engine.analyze(b'audio', resolve_practice('see', 'i'))
            except ValueError: pass
        with patch('backend.engine.convert_audio', side_effect=conversion):
            worker = threading.Thread(target=analyze); worker.start()
            try:
                self.assertTrue(entered.wait(1))
                with self.assertRaises(EngineBusy): engine.analyze(b'audio', resolve_practice('see', 'i'))
            finally: release.set(); worker.join(2); engine.close()

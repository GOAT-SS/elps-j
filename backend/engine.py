"""One persistent model worker. Timeouts kill the worker so retries do not pile up."""
import logging
import math
import multiprocessing
import signal
import threading
import time

from .audio import convert_audio
from .curriculum import candidate_targets, evaluate

MODEL_ID = 'KoelLabs/xlsr-english-01'


class EngineBusy(RuntimeError):
    pass


class EngineTimeout(RuntimeError):
    pass


def model_worker(connection):
    # The parent owns graceful shutdown; terminal Ctrl+C should not interrupt
    # the worker before its connection and model resources are released.
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    try:
        import torch
        from transformers import AutoModelForCTC, AutoProcessor
        torch.set_num_threads(1)
        device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
        processor = AutoProcessor.from_pretrained(MODEL_ID, local_files_only=True)
        model = AutoModelForCTC.from_pretrained(MODEL_ID, local_files_only=True).to(device).eval()
        while True:
            payload = connection.recv()
            if payload is None:
                break
            samples, sample_rate, practice = payload
            inputs = processor(samples, sampling_rate=sample_rate, return_tensors='pt').to(device)
            with torch.inference_mode():
                logits = model(**inputs).logits
            observed = processor.batch_decode(torch.argmax(logits, dim=-1).cpu())[0]
            log_probs = logits.detach().cpu().log_softmax(dim=-1).transpose(0, 1)
            candidates = candidate_targets(practice)
            losses = []
            for candidate in candidates:
                model_ipa = candidate['candidateIPA']
                if 'g' not in processor.tokenizer.get_vocab():
                    model_ipa = model_ipa.replace('g', 'ɡ')
                ids = processor.tokenizer(model_ipa, add_special_tokens=False).input_ids
                if not ids or processor.tokenizer.unk_token_id in ids:
                    # Unsupported model vocabulary cannot produce a fair comparison.
                    losses = []
                    break
                loss = torch.nn.functional.ctc_loss(
                    log_probs, torch.tensor([ids], dtype=torch.long),
                    torch.tensor([log_probs.shape[0]], dtype=torch.long),
                    torch.tensor([len(ids)], dtype=torch.long),
                    blank=processor.tokenizer.pad_token_id, reduction='none', zero_infinity=False,
                )[0].item()
                if not math.isfinite(loss):
                    losses = []
                    break
                losses.append(loss)
            scores = []
            if losses:
                percentages = torch.softmax(torch.tensor([-loss for loss in losses]), dim=0).tolist()
                scores = [{**candidate, 'relativeScorePercent': round(score * 100, 2)} for candidate, score in zip(candidates, percentages)]
            connection.send({'result': evaluate(practice, observed, scores)})
    except EOFError:
        pass
    except Exception:
        logging.exception('Pronunciation model worker failed')
        connection.send({'error': '音声モデルを利用できません。管理者へお知らせください。'})
    finally:
        connection.close()


class ModelEngine:
    def __init__(self, timeout_seconds=90, worker_target=model_worker):
        self.timeout_seconds = timeout_seconds
        self.worker_target = worker_target
        self._lock = threading.Lock()
        self._process = None
        self._connection = None

    def _start(self):
        context = multiprocessing.get_context('spawn')
        parent, child = context.Pipe()
        self._process = context.Process(target=self.worker_target, args=(child,), daemon=True)
        self._connection = parent
        self._process.start()
        child.close()

    def close(self, force=False):
        if self._process is not None:
            if self._process.is_alive() and not force:
                try:
                    self._connection.send(None)
                except (BrokenPipeError, EOFError, OSError):
                    pass
                self._process.join(timeout=2)
            if self._process.is_alive():
                self._process.terminate()
            self._process.join(timeout=2)
            if self._process.is_alive():
                self._process.kill()
                self._process.join(timeout=2)
            self._process.close()
            self._process = None
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    def analyze(self, contents, practice):
        if not self._lock.acquire(blocking=False):
            raise EngineBusy('ほかの音声を解析しています。少し待ってから、もう一度お試しください。')
        try:
            started = time.monotonic()
            samples, sample_rate, duration = convert_audio(contents)
            if self._process is None or not self._process.is_alive():
                self.close()
                self._start()
            self._connection.send((samples, sample_rate, practice))
            remaining = max(0, self.timeout_seconds - (time.monotonic() - started))
            if not self._connection.poll(remaining):
                self.close(force=True)
                raise EngineTimeout('解析に時間がかかりすぎました。もう一度録音してください。')
            response = self._connection.recv()
            if 'error' in response:
                self.close()
                raise RuntimeError(response['error'])
            return {**response['result'], 'durationSeconds': round(duration, 2)}
        except (BrokenPipeError, EOFError, OSError) as error:
            self.close()
            raise RuntimeError('音声モデルとの接続が切れました。もう一度録音してください。') from error
        finally:
            self._lock.release()

"""HTTP boundary only; teaching targets and model execution live in separate modules."""
from contextlib import asynccontextmanager
import logging
import os
import secrets

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from .audio import AudioError
from .curriculum import resolve_practice
from .engine import EngineBusy, EngineTimeout, ModelEngine, MODEL_ID

MAX_UPLOAD_BYTES = 4_000_000


def create_app(engine=None, api_key=None):
    key = api_key or os.environ.get('PRONUNCIATION_API_KEY')
    if not key:
        raise RuntimeError('PRONUNCIATION_API_KEY environment variable is required')
    engine = engine or ModelEngine()

    @asynccontextmanager
    async def lifespan(_app):
        yield
        await run_in_threadpool(engine.close)

    app = FastAPI(lifespan=lifespan)

    @app.get('/health')
    def health():
        # Liveness, not a guarantee of model availability (loaded on first request).
        return {'status': 'ok', 'model': MODEL_ID, 'modelLoading': 'on_first_request'}

    @app.post('/analyze-pronunciation')
    async def analyze_pronunciation(
        file: UploadFile = File(...), target_word: str = Form(...),
        sound_slug: str | None = Form(default=None),
        provided_api_key: str | None = Header(default=None, alias='X-Pronunciation-Api-Key'),
    ):
        try:
            if provided_api_key is None or not secrets.compare_digest(provided_api_key, key):
                raise HTTPException(status_code=401, detail='Unauthorized')
            try:
                practice = resolve_practice(target_word, sound_slug)
            except ValueError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error
            contents = await file.read(MAX_UPLOAD_BYTES + 1)
            if len(contents) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail='録音データが大きすぎます。15秒以内にしてください。')
            if not contents:
                raise HTTPException(status_code=422, detail='録音データが空です。もう一度録音してください。')
            try:
                return await run_in_threadpool(engine.analyze, contents, practice)
            except AudioError as error:
                raise HTTPException(status_code=422, detail=str(error)) from error
            except EngineBusy as error:
                raise HTTPException(status_code=429, detail=str(error), headers={'Retry-After': '3'}) from error
            except EngineTimeout as error:
                raise HTTPException(status_code=504, detail=str(error)) from error
            except Exception as error:
                logging.exception('Pronunciation analysis failed')
                raise HTTPException(status_code=503, detail='音声解析を利用できません。少し待ってから、もう一度お試しください。') from error
        finally:
            await file.close()

    return app


app = create_app()

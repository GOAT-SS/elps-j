from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import subprocess
import tempfile
import wave
import torch
import soundfile as sf
from transformers import AutoModelForCTC, AutoProcessor

MODEL_ID="KoelLabs/xlsr-english-01"
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
async def analyze_pronunciation(file: UploadFile = File(...)):
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

        return{
            "originalFilename":file.filename,
            "contentType":file.content_type,
            "originalSize":len(contents),
            "wavSize":output_path.stat().st_size,
            "sampleRate":sample_rate,
            "channels":channels,
            "durationSeconds":round(duration_seconds,2),
            "observedIPA":observed_ipa,
        }

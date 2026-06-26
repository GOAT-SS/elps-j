from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-pronunciation")
async def analyze_pronunciation(file: UploadFile = File(...)):
    return {
        "targetPhoneme": "/r/",
        "predictedPhoneme": "/l/"
    }

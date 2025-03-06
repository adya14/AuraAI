import os
import json
import base64
import asyncio
from dotenv import load_dotenv
from openai import OpenAI
from prompt import get_interview_prompt
import wave
import numpy as np
import tempfile

# Load API keys
load_dotenv()
SECRET_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=SECRET_KEY)
ROLE = "SDE"
JOB_DESCRIPTION = "Python, ML, Cloud"

async def transcribe_audio(audio_payload):
    """Convert G.711 u-law audio to WAV and transcribe it using OpenAI's Whisper."""
    
    # Convert G.711 u-law (8-bit, 8kHz) to PCM WAV
    wav_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    
    with wave.open(wav_file.name, "wb") as wf:
        wf.setnchannels(1)  # Mono
        wf.setsampwidth(2)  # 16-bit PCM
        wf.setframerate(8000)  # 8kHz
        pcm_data = np.frombuffer(audio_payload, dtype=np.uint8) - 128  # Convert u-law
        wf.writeframes(pcm_data.tobytes())

    # 🔹 Send WAV file to OpenAI for transcription
    with open(wav_file.name, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    
    return transcript.text.strip()

async def get_ai_response(text, role, job_description, request_rating=False, conversation_history=None):
    """Generate AI interview questions and final rating."""
    messages = get_interview_prompt(role, job_description)

    # Add the full conversation history before requesting a rating
    if conversation_history:
        for entry in conversation_history:
            messages.append(entry)

    messages.append({"role": "user", "content": text})

    if request_rating:
        messages.append(
            {"role": "user", "content": "Now that the interview is complete, rate the candidate out of 10 based on their performance."}
        )

    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    return response.choices[0].message.content

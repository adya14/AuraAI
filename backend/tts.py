from openai import OpenAI
import io
import base64
import soundfile as sf
import numpy as np
from scipy.signal import resample
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv()
client = OpenAI()

def text_to_speech(text, save_file=True):
    """Convert text to speech using OpenAI's TTS API and return Twilio-compatible 8-bit PCM µ-law audio."""
    response = client.audio.speech.create(  
        model="tts-1",
        voice="alloy",
        input=text
    )

    # Load MP3 audio into memory
    audio_data = io.BytesIO(response.content)

    # Read audio data
    data, samplerate = sf.read(audio_data)

    # 🔹 Resample to 8kHz (required for Twilio)
    if samplerate != 8000:
        num_samples = int(len(data) * (8000 / samplerate))
        data = resample(data, num_samples)

    # 🔹 Convert to 8-bit PCM µ-law (Twilio-compatible)
    pcm_ulaw_data = (data * 32767).astype(np.int16)  # Convert to 16-bit PCM
    pcm_ulaw_data = np.frombuffer(pcm_ulaw_data.tobytes(), dtype=np.int16)  # Ensure correct byte format
    pcm_ulaw_data = pcm_ulaw_data.astype(np.uint8)  # Convert to 8-bit PCM µ-law

    # 🔹 Save as a WAV file for testing
    if save_file:
        sf.write("test_audio.wav", data, 8000, subtype="PCM_U8")
        print("✅ AI Speech Saved as test_audio.wav! Try playing it.")

    # 🔹 Encode in Base64 (Twilio requires this format)
    encoded_audio = base64.b64encode(pcm_ulaw_data.tobytes()).decode("utf-8")

    return encoded_audio  # ✅ Return Base64 PCM µ-law

if __name__ == "__main__":
    test_text = "Hello! This is a test of the text-to-speech functionality."
    ai_audio_base64 = text_to_speech(test_text)
    print("✅ AI Speech Converted to Base64 PCM µ-law!")
    print(f"🔹 First 100 Characters of Encoded Audio:\n{ai_audio_base64[:100]}")
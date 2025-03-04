from openai import OpenAI
import sounddevice as sd
import soundfile as sf
import os
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv()
client = OpenAI()  

def text_to_speech(text, filename="response.mp3"):
    """Convert text to speech using OpenAI's TTS API and save as an audio file."""
    response = client.audio.speech.create(  
        model="tts-1",
        voice="alloy",
        input=text
    )

    with open(filename, "wb") as audio_file:
        audio_file.write(response.content) 

    return filename

def play_audio(filename):
    """Play the generated speech audio."""
    data, samplerate = sf.read(filename)
    sd.play(data, samplerate)
    sd.wait()

# Test function if run separately
if __name__ == "__main__":
    test_text = "Hello! This is a test of the text-to-speech functionality."
    audio_file = text_to_speech(test_text)
    play_audio(audio_file)
import os
import json
import base64
import asyncio
import requests
from fastapi import FastAPI, WebSocket
from twilio.rest import Client
from dotenv import load_dotenv
from test import handle_interview, transcribe_audio, get_ai_response  
from tts import text_to_speech

# Load API keys
load_dotenv()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PORT = int(os.getenv('PORT', 5050))
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
RECIPIENT_PHONE_NUMBER = os.getenv('RECIPIENT_PHONE_NUMBER')

app = FastAPI()

if not OPENAI_API_KEY or not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER or not RECIPIENT_PHONE_NUMBER:
    raise ValueError("Missing required environment variables. Check .env file.")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.post("/make-call")
async def make_call():
    """Initiate an outbound call."""
    try:
        print("Attempting to make a call...")
        call = client.calls.create(
            to=RECIPIENT_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER,
            twiml=f"""
            <Response>
                <Say>Connecting you to the AI assistant.</Say>
                <Connect>
                    <Stream url="wss://92f2-223-181-33-83.ngrok-free.app/media-stream"/>
                </Connect>
            </Response>
            """
        )
        print("Call initiated. Call SID:", call.sid)
        return {"message": "Call initiated", "call_sid": call.sid}
    except Exception as e:
        print("Error making call:", e)
        return {"error": str(e)}

@app.websocket("/media-stream")
async def handle_media_stream(websocket: WebSocket):
    """Handle WebSocket connections between Twilio and OpenAI."""
    print("🔹 WebSocket Connection Attempt...")
    await websocket.accept()
    print("✅ WebSocket Accepted Successfully!")

    role = "Software Engineer"
    job_description = "Software Engineer role requiring Python, cloud, and AI experience."

    # Keep track of the stream SID
    stream_sid = None

    while True:
        try:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            # 🔹 Extract stream SID from Twilio's first message
            if data["event"] == "start":
                stream_sid = data["start"]["streamSid"]
                print(f"✅ Stream SID: {stream_sid}")

            # 🔹 Handle audio input from Twilio
            elif data["event"] == "media":
                print(f"📩 Received Audio Chunk: {data['media']['chunk']}")

                # Generate AI response (text)
                user_audio = base64.b64decode(data["media"]["payload"])
                user_input = await transcribe_audio(user_audio)
                ai_response = await get_ai_response(user_input, role, job_description)

                # Convert AI text response to speech (G.711 u-law)
                ai_audio = text_to_speech(ai_response)  # Implement this function

                # 🔹 Send AI-generated audio back to Twilio
                audio_payload = base64.b64encode(ai_audio).decode("utf-8")
                audio_response = {
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {"payload": audio_payload}
                }
                await websocket.send_json(audio_response)

        except Exception as e:
            print(f"❌ WebSocket Error: {e}")
            break  # Stop loop on error

    print("🔴 WebSocket Closed")
    await websocket.close()

        
@app.get("/")
async def root():
    return {"message": "Twilio media service is running"}

if __name__ == "__main__":
    import uvicorn
    print("🔹 Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)

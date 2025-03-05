import os
import json
from fastapi import FastAPI, Form
from fastapi.responses import Response
from twilio.rest import Client
from dotenv import load_dotenv
from test import get_ai_response  # No need for WebSockets or TTS

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
    """Initiate an outbound call using Twilio's built-in text-to-speech and Gather."""
    try:
        print("Attempting to make a call...")
        call = client.calls.create(
            to=RECIPIENT_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER,
            twiml=f"""
            <Response>
                <Say>Connecting you to the AI.</Say>
                <Gather input="speech" action="https://3c9b-223-181-33-83.ngrok-free.app/process-response" timeout="5">
                    <Say>Hi, I am Askara, your AI interviewer. Let's begin. Can you start with introduce yourself.</Say>
                </Gather>
            </Response>
            """
        )
        print("Call initiated. Call SID:", call.sid)
        return {"message": "Call initiated", "call_sid": call.sid}
    except Exception as e:
        print("Error making call:", e)
        return {"error": str(e)}

@app.post("/process-response")
async def process_response(SpeechResult: str = Form("")):
    """Receive user speech input from Twilio, generate AI response, and send it back as TwiML."""
    try:
        print(f"Candidate: {SpeechResult}")

        role = "Software Engineer"
        job_description = "Software Engineer role requiring Python, cloud, and AI experience."

        # 🔹 AI Generates Response
        ai_response = await get_ai_response(SpeechResult, role, job_description)
        print(f"AI: {ai_response}")

        # 🔹 Send AI Response as Valid TwiML
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
        <Response>
            <Say>{ai_response}</Say>
            <Gather input="speech" action="https://9d89-223-181-33-83.ngrok-free.app/process-response" timeout="10">
            </Gather>
        </Response>
        """

        return Response(content=twiml_response, media_type="application/xml")

    except Exception as e:
        print(f"❌ Error Processing Response: {e}")
        return Response(content="""<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>""", media_type="application/xml")

@app.get("/")
async def root():
    return {"message": "Twilio AI interview service is running"}

if __name__ == "__main__":
    import uvicorn
    print("🔹 Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)

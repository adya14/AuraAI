import os
import sys
import json
from fastapi import FastAPI, Form
from fastapi.responses import Response
from twilio.rest import Client
from dotenv import load_dotenv
from interview import transcribe_audio, get_ai_response, ROLE, JOB_DESCRIPTION
from collections import defaultdict
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PORT = int(os.getenv('PORT', 5000))
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
RECIPIENT_PHONE_NUMBER = os.getenv('RECIPIENT_PHONE_NUMBER')
NGROK_URL = "https://2957-205-254-176-129.ngrok-free.app"

app = FastAPI()
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CallRequest(BaseModel):
    name: str
    phone: str

# Track interview state (in-memory storage; replace with a database in production)
interview_state = defaultdict(dict)

@app.post("/make-call")
async def make_call():
    """Initiate an outbound call and initialize interview state."""
    try:
        print("Attempting to make a call...")
        call = client.calls.create(
            to=RECIPIENT_PHONE_NUMBER,
            from_=TWILIO_PHONE_NUMBER,
            twiml=f"""
            <Response>
                <Say>Hi, I am Moon, your AI interviewer. Can you start with introducing yourself.</Say>
                <Gather input="speech" action="{NGROK_URL}/process-response" timeout="10">
                    <Say>Hi, I am Moon, your AI interviewer. Let's begin. Please introduce yourself.</Say>
                </Gather>
            </Response>
            """
        )
        # Initialize state for this call
        interview_state[call.sid] = {
            "conversation_history": [],
            "question_count": 0,
            "in_qna_phase": False,
            "is_introduction_done": True
        }
        print(f"Call initiated. Call SID: {call.sid}")
        return {"message": "Call initiated", "call_sid": call.sid}
    except Exception as e:
        print(f"Error making call: {e}")
        return {"error": str(e)}

@app.post("/process-response")
async def process_response(SpeechResult: str = Form(None), CallSid: str = Form(None)):
    """Process user speech input, generate AI response, and update state."""
    try:
        if not CallSid:
            raise ValueError("Missing CallSid.")

        print(f"Processing response for CallSid: {CallSid}")

        # Get the interview state for this call
        state = interview_state[CallSid]

        # Handle missing SpeechResult
        if not SpeechResult:
            print("No speech detected. Prompting the user to speak again.")
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>I didn't hear anything. Please try again.</Say>
                <Gather input="speech" action="{NGROK_URL}/process-response" timeout="5">
                    <Say>..</Say>
                </Gather>
            </Response>
            """
            return Response(content=twiml, media_type="application/xml")

        # Add user input to conversation history
        state["conversation_history"].append({"role": "user", "content": SpeechResult})

        # Check if this is the first interaction
        if not state["is_introduction_done"]:
            state["is_introduction_done"] = True
            ai_response = "I'm your interviewer today. Let's start with your introduction."
        else:
            # Check if we need to transition to Q&A phase
            if state["question_count"] >= 2 and not state["in_qna_phase"]:
                state["in_qna_phase"] = True
                ai_response = "Thank you for your time. Do you have any questions for me?"
            elif state["in_qna_phase"]:
                # Generate final response and end the call
                ai_response = await get_ai_response(
                    SpeechResult, ROLE, JOB_DESCRIPTION,
                    conversation_history=state["conversation_history"]
                )
                # End the call after answering the user's question
                twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>{ai_response}</Say>
                    <Hangup />
                </Response>
                """

                # Generate and print the rating after the call ends
                rating_response = await get_ai_response(
                    "", ROLE, JOB_DESCRIPTION,
                    conversation_history=state["conversation_history"],
                    request_rating=True
                )
                print(f"AI Rating: {rating_response}")

                return Response(content=twiml, media_type="application/xml")
            else:
                # Generate the next question
                ai_response = await get_ai_response(
                    SpeechResult, ROLE, JOB_DESCRIPTION,
                    conversation_history=state["conversation_history"]
                )
                state["question_count"] += 1

        # Add AI response to conversation history
        state["conversation_history"].append({"role": "assistant", "content": ai_response})

        # Build TwiML response
        if state["in_qna_phase"]:
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>{ai_response}</Say>
                <Gather input="speech" action="{NGROK_URL}/process-response" timeout="5">
                    <Say>Please continue.</Say>
                </Gather>
            </Response>
            """
        else:
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>{ai_response}</Say>
                <Gather input="speech" action="{NGROK_URL}/process-response" timeout="5">
                    <Say>Please continue.</Say>
                </Gather>
            </Response>
            """

        return Response(content=twiml, media_type="application/xml")

    except Exception as e:
        print(f"Error processing response: {e}")
        return Response(
            content="""<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say></Response>""",
            media_type="application/xml"
        )
    
@app.get("/")
async def root():
    return {"message": "Twilio AI interview service is running"}

if __name__ == "__main__":
    import uvicorn
    print("🔹 Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
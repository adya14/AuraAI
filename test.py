import os
import json
import base64
import asyncio
from dotenv import load_dotenv
from openai import OpenAI
from prompt import get_interview_prompt

# Load API keys
load_dotenv()
SECRET_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=SECRET_KEY)

async def transcribe_audio(audio_payload):
    """Transcribe received WebSocket audio (Twilio -> Whisper)."""
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_payload
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

async def handle_interview(websocket=None, role=None, job_description=None, terminal_mode=False):
    """Manage AI interview through WebSocket or terminal testing."""

    if terminal_mode:
        role = input("Enter the job role: ")
        job_description = input("Enter the job description: ")

    initial_message = f"Hi, I am Askara, your AI interviewer. I will be conducting your interview today for the {role} role. Let's start with an introduction. Tell me all about yourself."
    
    if terminal_mode:
        print(f"AI: {initial_message}")
    else:
        await websocket.send_json({"event": "media", "text": initial_message})
        print(f"AI: {initial_message}")

    question_count = 0
    max_questions = 2
    in_qna_phase = False  # Tracks if AI is answering candidate's questions
    conversation_history = []  # Stores candidate responses

    while True:
        if terminal_mode:
            user_input = input("You (Candidate): ")
        else:
            message = await websocket.receive_text()
            data = json.loads(message)

            if data["event"] == "media":
                user_audio = base64.b64decode(data["media"]["payload"])
                user_input = await transcribe_audio(user_audio)

        print(f"Candidate: {user_input}")
        conversation_history.append({"role": "user", "content": user_input})  # Store response

        # If in Q&A phase, AI should answer and end the interview
        if in_qna_phase:
            final_reply = await get_ai_response(user_input, role, job_description)
            final_message = f"{final_reply} That concludes our interview. Have a great day!"
            print(f"AI: {final_message}")
            if not terminal_mode:
                await websocket.send_json({"event": "media", "text": final_message})

            # **Ask AI to rate the candidate**
            rating_response = await get_ai_response(
                "", role, job_description, request_rating=True, conversation_history=conversation_history
            )
            print(f"AI Rating: {rating_response}")
            if not terminal_mode:
                await websocket.send_json({"event": "media", "text": rating_response})
            break

        # Stop interview after 5 questions and transition to Q&A phase
        if question_count >= max_questions:
            final_message = "Thank you for your time. Do you have any questions for me?"
            print(f"AI: {final_message}")
            in_qna_phase = True  # Enter Q&A phase
            if not terminal_mode:
                await websocket.send_json({"event": "media", "text": final_message})
            continue

        # Ask next question
        ai_reply = await get_ai_response(user_input, role, job_description)
        conversation_history.append({"role": "assistant", "content": ai_reply})  # Store AI's response
        question_count += 1

        if terminal_mode:
            print(f"AI: {ai_reply}")
        else:
            await websocket.send_json({"event": "media", "text": ai_reply})

# If this file is run directly, simulate a terminal interview
if __name__ == "__main__":
    asyncio.run(handle_interview(terminal_mode=True))

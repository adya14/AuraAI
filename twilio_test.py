from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

# Twilio Credentials
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # Your Twilio number
RECIPIENT_PHONE_NUMBER = os.getenv("RECIPIENT_PHONE_NUMBER")  # Your number

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

call = client.calls.create(
    to=RECIPIENT_PHONE_NUMBER,
    from_=TWILIO_PHONE_NUMBER,
    url="http://demo.twilio.com/docs/voice.xml"  # Replace with your TwiML URL
)

print(f"Call initiated! Call SID: {call.sid}")

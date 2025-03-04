activate env using twenv\Scripts\activate
run ngrok http 5050
run main.py
hit the api using - Invoke-WebRequest -Uri "http://localhost:5050/make-call" -Method Post
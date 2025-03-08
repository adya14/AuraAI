activate env using twenv\Scripts\activate
run ngrok http 5050
Go Twillio > active phone numbers > Click on the number > Config > under voice put the ngrok url
run python main.py
hit the api using - Invoke-WebRequest -Uri "http://localhost:5050/make-call" -Method Post
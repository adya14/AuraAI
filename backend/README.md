activate env using twenv\Scripts\activate
run ngrok http 5000
Go Twillio > active phone numbers > Click on the number > Config > under voice put the ngrok url
update url in main.py as well.
run python main.py
hit the api using - Invoke-WebRequest -Uri "http://localhost:5000/make-call" -Method Post
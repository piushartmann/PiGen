import requests
import json
import time

debug = True

if debug:
    url = 'http://localhost:3000'
else:
    url = "https://superladens.onrender.com/"

def process_data(data):
    print(data)
    respone(data['user'], file="./testimge.jpg")
    

def respone(username, file):
    files ={'image':open(file,'rb')}
    headers = {"authorization":"testtoken", "type":"image", "user":username}
    r = requests.post(url+"/compute-endpoint", files=files, headers=headers)

def main():
    while True:
        headers = {"authorization":"testtoken", "type":"request"}
        r = requests.get(url+"/compute-endpoint", headers=headers)
        if r.text != "":
            data = json.loads(r.text)
            process_data(data)

        time.sleep(1)

main()
import requests
import json
import time
import base64
import threading
import signal
import sys
import os

import stableAPI as sd
import ollamaAPI
from mongoConnector import MongoDB


debug = False
debug = sys.argv[1] == "debug" if len(sys.argv) > 1 else debug
print(f"Debug: {debug}")

db = MongoDB()

if debug:
    url = 'http://localhost:3000'
else:
    url = "https://superladens.onrender.com"

compute_token = os.environ["COMPUTE_TOKEN"]

lla = ollamaAPI.API(url, compute_token)

stop = False

def signal_handler(sig, frame):
    global stop
    if not stop:
        print("Performing cleanup...")
        stop = True
        lla.clearRam()
        sd.unloadModel()
        sys.exit(0)
    else:
        sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

class serverFunctions:
    def generate_img(prompt, negprompt, model, user):
        lla.clearRam()
        sd.launchSD()
        sd.setModel(model)
        global stop_thread
        stop_thread = False
        
        progress_thread = threading.Thread(target=update_progress, args=(user,))
        progress_thread.start()

        try:
            file = sd.txt2img(prompt, negprompt)
            sendFile(user, file)
        finally:
            stop_thread = True
            progress_thread.join()
    

    def chatMsg(msg, username):
        sd.unloadModel()
        lla.setModel(db.get_setting("model"))
        lla.chat(msg, username)
    
    def chatsetModel(model):
        lla.setModel(model)
        
    def stopChat():
        lla.stopChat()
    
    def init():
        headers = {"authorization":compute_token, "Content-Type":"application/json"}
        body = {
            "debug": debug
        }
        r = requests.post(url+"/init", headers=headers, json=body)


def update_progress(username):
    global stop_thread
    while not stop_thread:
        r = requests.get("http://127.0.0.1:7860/sdapi/v1/progress")
        img_data = r.json()["current_image"]
        if img_data != None:
            img_data = r.json()["current_image"]
            file = base64.decodebytes(str.encode(img_data))
            sendFile(username, file, temp=True)
            time.sleep(2)


def sendFile(username, file, temp=False): 
    headers = {"authorization":compute_token, "type":"image", "user":username, "temp":str(temp).lower()}
    filename = username + "-" + str(time.time()) + ".png"
    files = {
        'file': (filename, file, 'image/jpeg'),
    }
    response = requests.post(url+"/compute-endpoint", files=files, headers=headers)

    print(response.text)

    
def checkPublicServer():
    try:
        r = requests.head(url+"/compute-endpoint")
        return r.status_code == 200
    except requests.ConnectionError:
        return False

def process_data(data):
    function = data['function']
    arguments = data['arguments']
    eval(f"serverFunctions.{function}(**{arguments})")


def main():
    while not checkPublicServer():
        print("Cant connect to public Server ... retrying in 5 seconds")
        time.sleep(5)
    else:
        print("Connected to public server")
    while True:
        if stop:
            break
        
        try:
            headers = {"authorization":compute_token, "type":"request"}
            r = requests.get(url+"/compute-endpoint", headers=headers)
            if r.text != "":
                try: 
                    data = json.loads(r.text)
                except json.decoder.JSONDecodeError as e:
                    print("Error decoding JSON")
                    print(e)
                    print(r.text)
                    continue
                process = threading.Thread(target=process_data, args=(data,))
                process.start()
            else:
                time.sleep(0.1)

        except requests.ConnectionError:
            print("Lost Connection to public Server ... retrying in 5 seconds")
            time.sleep(5)

if __name__ == "__main__":
    main()

import requests
import json
import time
import base64
import threading
import sys
import os
import socketio
import signal

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
    
    def setChatBundleBits(bits):
        lla.setBundleBits(bits)


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
    
def speedtest():
    start = time.time()
    r = requests.get(url+"/healthCheck")
    end = time.time()
    print(f"Speedtest: {end-start} seconds")

class Socket():
    def __init__(self):
        sio = socketio.Client()
        sio = socketio.Client()
        sio.connect(url, namespaces=['/backend'])
        
        @sio.event(namespace='/backend')
        def connect():
            print("I'm connected!")
            
        @sio.on('backend', namespace='/backend')
        def on_message(data):
            print("I received "+ str(data))
            process = threading.Thread(target=process_data, args=(data,))
            process.start()
            
        self.sio = sio
        
    def disconnect(self):
        self.sio.disconnect()

    def send(self, msg):
        data = {"auth": compute_token, "msg": msg}
        print(f"SocketIO: Sending: {msg}")
        self.sio.emit('backend', data, namespace='/backend')
        
    def wait(self):
        self.sio.wait()

def main():
    sio = Socket()
    sio.send("Connected to local server")
    speedtest()
    
    def signal_handler(sig, frame):
        lla.clearRam()
        sd.unloadModel()
        sio.disconnect()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    while True:
        pass
        

if __name__ == "__main__":
    main()

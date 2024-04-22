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


debug = False
debug = sys.argv[1] == "debug" if len(sys.argv) > 1 else debug
print(f"Debug: {debug}")

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
    
    def getKeys():
        syncKeys()
    
    def getSettings():
        syncSettings()

    def setUserdata(user, key, value):
        with open("local/userdata.json") as f:
            userdata = json.load(f)

        if user not in userdata:
            userdata.update({user:{}})
        
        userdata[user][key] = value

        with open("local/userdata.json", "w") as f:
            json.dump(userdata, f)
        serverFunctions.updateUserData()
        return
    
    def setSetting(setting, value):
        with open("local/settings.json") as f:
            settings = json.load(f)
        
        settings[setting] = value

        with open("local/settings.json", "w") as f:
            json.dump(settings, f)
            
        print(f"Setting {setting} set to {value}")
    

    def updateUserData():
        with open("local/userdata.json", "r") as f:
            userdata = json.load(f)
            r = requests.post(url+"/userDataUpdate", json=userdata, headers={"authorization":compute_token})
            print(r.text)
            
    

    def chatMsg(msg, username):
        sd.unloadModel()
        lla.setModel(getSetting("model"))
        lla.chat(msg, username)
        
    def createUser(username, password, admin, oldName):            
        jsonKey = json.load(open("local/keys.json", "r"))
        
        if oldName != None:
            del jsonKey[oldName]
            
        jsonKey[username] = {"password": password, "admin": admin}
        open("local/keys.json", "w").write(json.dumps(jsonKey))
        print(f"User {username} created")
        syncKeys()
    
    def deleteUser(username):
        jsonKey = json.load(open("local/keys.json", "r"))
        del jsonKey[username]
        open("local/keys.json", "w").write(json.dumps(jsonKey))
        print(f"User {username} deleted")
        syncKeys()
    
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


def getSetting(setting):
    with open("local/settings.json") as f:
        settings = json.load(f)
    
    return settings[setting]

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

def syncKeys():
    headers = {"authorization":compute_token, "Content-Type":"application/json"}
    jsonKey = json.load(open("local/keys.json", "r"))
    r = requests.post(url+"/sync-keys", headers=headers, json=jsonKey)
    print(r.text)
    
def syncSettings():
    headers = {"authorization":compute_token, "Content-Type":"application/json"}
    jsonSettings = json.load(open("local/settings.json", "r"))
    r = requests.post(url+"/sync-settings", headers=headers, json=jsonSettings)
    print(r.text)

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
    syncKeys()
    serverFunctions.updateUserData()
    while True:
        if stop:
            break
        
        try:
            headers = {"authorization":compute_token, "type":"request"}
            r = requests.get(url+"/compute-endpoint", headers=headers)
            if r.text != "":
                data = json.loads(r.text)
                process = threading.Thread(target=process_data, args=(data,))
                process.start()
            else:
                time.sleep(0.1)

        except requests.ConnectionError:
            print("Lost Connection to public Server ... retrying in 5 seconds")
            time.sleep(5)

if __name__ == "__main__":
    main()

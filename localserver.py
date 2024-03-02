import requests
import json
import time
import base64
import threading

debug = True

if debug:
    url = 'http://localhost:3000'
else:
    url = "https://superladens.onrender.com/"

def process_data(data):
    global stop_thread
    stop_thread = False  # Flag to control the background thread

    # Start the progress updater as a background thread
    progress_thread = threading.Thread(target=update_progress, args=(data['user'],))
    progress_thread.start()

    try:
        file = generate_image(data['prompt'], data['negprompt'])
        sendFile(data['user'], file)
    finally:
        stop_thread = True  # Signal the thread to stop
        progress_thread.join()  # Wait for the thread to finish

def generate_image(prompt, negprompt):
    json = {
        "prompt": prompt,
        "negative_prompt": negprompt
    }
    r = requests.post("http://127.0.0.1:7860/sdapi/v1/txt2img", json=json)
    img_data = r.json()["images"][0]

    file = base64.decodebytes(str.encode(img_data))

    return file

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
    headers = {"authorization":"testtoken", "type":"image", "user":username, "temp":str(temp).lower()}
    filename = username + "-" + str(time.time()) + ".png"
    files = {
        'file': (filename, file, 'image/jpeg'),  # Ensure the field name matches your server's expectation
    }
    response = requests.post(url+"/compute-endpoint", files=files, headers=headers)

    # Print the server's response
    print(response.text)

def main():
    while True:
        headers = {"authorization":"testtoken", "type":"request"}
        r = requests.get(url+"/compute-endpoint", headers=headers)
        if r.text != "":
            data = json.loads(r.text)
            process_data(data)

        time.sleep(1)

main()
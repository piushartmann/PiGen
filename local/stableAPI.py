import os
import requests
import base64
import time
import subprocess

SDmodel = None
sdProcess = None


def launchSD():
    if not checkSD():
        global sdProcess
        original_dir = os.getcwd()
        os.chdir("D:\StableDiffusion\Stable-diffusion-webui")
        sdProcess = subprocess.Popen(['start', 'cmd', '/c',"webui-user.bat"], shell=True)
        print(sdProcess.pid)
        #os.system("cmd /c start cmd /k webui-user.bat")
        os.chdir(original_dir)
        while not checkSD():
            time.sleep(1)
        print("Stable Diffusion started")
        return
    else:
        print("Stable Diffusion already running")
        return
    
def killSD():
    if checkSD():
        global sdProcess
        if sdProcess is None:
            print("Please close Stable Diffusion manually")
            return
        sdProcess.kill()
        print("Stable Diffusion closed")
        return
    else:
        print("Stable Diffusion not running")
        return
    
def checkSD():
    try:
        r = makeAPIreq(requests.head, "/")
        print("Stable Diffusion running")
        return r.status_code == 200
    except requests.ConnectionError or ConnectionRefusedError:
        return False
    

def txt2img(prompt, negprompt):
    json = {
        "prompt": prompt,
        "negative_prompt": negprompt,
        "width": 1024,
        "height": 1024
    }
    if SDmodel == "sd_xl_turbo_1.0_fp16":
        json = {
            "prompt": prompt,
            "negative_prompt": negprompt,
            "width": 512,
            "height": 512,
            "steps": 1,
            "cfg_scale": 1
        }
    if SDmodel == "juggernautXL_version6Rundiffusion":
        json = {
        "prompt": prompt,
        "negative_prompt": negprompt,
        "width": 1024,
        "height": 1024,
        "steps": 30,
        "cfg_scale": 4
        }

    print(json)
    res = makeAPIreq(requests.post, "/sdapi/v1/txt2img", json)
    img_data = res.json()["images"][0]

    file = base64.decodebytes(str.encode(img_data))

    return file

def getModels():
    res = makeAPIreq(requests.get, "/sdapi/v1/sd-models")
    models = []
    for i in res.json():
        title = i["model_name"]
        models.append(title)
    return models

def setModel(model):
    global SDmodel
    SDmodel = model
    r = makeAPIreq(requests.get, '/sdapi/v1/options')
    opt = r.json()
    opt['sd_model_checkpoint'] = model
    makeAPIreq(requests.post, '/sdapi/v1/options', opt)

def getModel():
    r = makeAPIreq(requests.get, '/sdapi/v1/options')
    opt = r.json()
    return opt['sd_model_checkpoint']

def unloadModel():
    if checkSD:
        try:
            r = makeAPIreq(requests.post, '/sdapi/v1/unload-checkpoint')
            return r.status_code == 200
        except requests.exceptions.ConnectionError:
            return False

def reloadModel():
    if checkSD:
        r = makeAPIreq(requests.post, '/sdapi/v1/reload-checkpoint')
        return r.status_code == 200


def makeAPIreq(reqtype, endpoint, json={}):
    r = reqtype("http://127.0.0.1:7860" + endpoint, json=json)
    return r
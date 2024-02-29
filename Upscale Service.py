from flask import Flask, request, jsonify
import requests
import json

app = Flask(__name__)

keyfile = json.loads(open("keys.json", "r").read())

def validate_api_key(username, key):
    return keyfile[username] == key
    
def tests():
    print(keyfile)
    return validate_api_key("test", "testkey")

@app.route('/getTime', methods=['POST'])
def upscale_image()
    

if __name__ == '__main__':
    print(tests())
    app.run(debug=True)
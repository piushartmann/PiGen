from flask import Flask, request, jsonify
import requests
import json

app = Flask(__name__)

keyfile = open("keys.json", "r").json()

def validate_api_key(username, key):
    if keyfile[username] == key:
        return True
    
def tests():
    return "Hello World"
    

if __name__ == '__main__':
    app.run(debug=True)
    print(tests())
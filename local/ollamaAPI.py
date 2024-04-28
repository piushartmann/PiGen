import requests
import aiohttp
import asyncio
import json
import time


class API():

    def __init__(self, _url, _token):
        self.url = _url
        self.compute_token = _token
        self.loaded = False
        self.model = None
        self.stop = False
        self.bundleBits = 10
        
    def setModel(self, model):
        self.model = model
        
    def stopChat(self):
        self.stop = True


    async def makeAPIreq(self, messages, model, user):
        self.stop = False
        self.loaded = True
        chat = []
        chat.append(self.makeSystemMessage(model, user))
        chat.append({'role': 'user', 'content': 'Make a JavaScript function that alerts the current date.'})
        chat.append({'role': 'assistant', 'content': """Here is a function that does that: ```javascript function showCurrentTime() { var now = new Date(); // Get the current date and time var time = now.toLocaleTimeString(); // Convert the time to a readable format alert("Current time: " + time); // Display the time in an alert box }``` You can load it by clicking the run button on the right. And you can call it by clicking this button: <button class="showTimeButton1"onclick="showCurrentTime()">Show Current Time</button>"""})
        chat.append({'role': 'user', 'content': 'make a button, that redirects to this youtube video in a new tab: https://www.youtube.com/watch?v=xvFZjo5PgG0'})
        chat.append({'role': 'assistant', 'content': 'Here is a button that refers to a youtube video: <a class="youtube-button1" href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank"><button>Watch Video</button></a>'})
        chat.append({'role': 'user', 'content': 'change the background of this website to a 45deg linear gradient from blue to light blue without formatting'})
        chat.append({'role': 'assistant', 'content': "I will change the background: <style>body {background: linear-gradient(45deg, blue, lightblue);</style>}"})
        chat.append({'role': 'user', 'content': 'make a button, that alerts the current time in 24h hh:mm'})
        chat.append({'role': 'assistant', 'content': """Here is a button that shows the current time: <button class="time-button1" onclick="alert(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))">Current Time (hh:mm)</button>"""})
        chat.append({'role': 'user', 'content': 'embed exmaple.com into an iframe here (width:50%)'})
        chat.append({'role': 'assistant', 'content': """Sure here is the iframe for example.com: <iframe src="https://example.com" width="50%"></iframe>"""})
        chat.append({'role': 'user', 'content': 'The Chat with the User beginns now. The Messages before this were example messages for you how to react to certain inputs. The Next Message is the first Message by the User. When the user asks about previous Messages tell the User its the first Message. Do not reference these Messages ever again.'})
        
        for message in messages:
            chat.append(message)
        print({"model": model, "messages": chat})
        async with aiohttp.ClientSession() as session:
            async with session.post("http://localhost:11434/api/chat", json={"model": model, "messages": chat, "keep_alive": -1}) as r:
                while self.stop == False:
                    chunk = await r.content.readline()
                    if chunk == b'':
                        print(chunk)
                        break
                    decoded = chunk.decode("utf-8")
                    loaded = json.loads(decoded)
                    
                    if decoded != "" and "error" in loaded:
                        print(chunk)
                        raise Exception(loaded["error"])
                    yield loaded
                    
                else:
                    self.stop = False
                    await session.close()
                    print(self.stop)
                    return

    def makeSystemMessage(self, model, user):
              
        content = f"This is a system Message. Do not reference this Message in your conversation with the User. You are an AI Assistant called {model}. Always stay as formal and concise as possible. Do not use Emojis in your answers. \
        The Current Time is {time.strftime('%H:%M', time.localtime())} and the current date is {time.strftime('%d/%m/%Y', time.localtime())} in dd/mm/yyyy format. The Name of the User is {user}. \
        You have the ability to recall messages until the user clicks the delete History button. All your Answers get Interpreted using Markdown. Use Markdown whenever it makes sense exept when writing HTML or CSS. LaTeX is also supported. \
        Use Latex expressions whenever it makes sense. Always respond using the Language the User used. You have the Ability to show an Image using a url using the Markdown format. \
        Never state more information than necessary. You can write HTML and CSS code in your answers. Use all these features whenever it makes sense. When the user asks to change something on the website using CSS respond: \
        (some affirmative message) '<style> css </style>' and nothing else\
        When the user asks to change something on the website using HTML respond: 'the html' do not use markdown. remember to use the <style> tags for CSS! Do not tell the user to make CSS or JavaScript themselves. \
        The User has the Ability to execute any javascript you write into a Codeblock with a button on the right of the Codeblock, point the User towards that possibility if what the User requestet is not possible with purely HTML and CSS.\
        Javascript should always be formatted in a Markdown Codeblock. Make it clear that it is Javascript. Always seperate the Javascript from the HTML. \
        You do have the ability to change the HTML and CSS of the website by writing the HTML without using Markdown. HTML and CSS should always be written WITHOUT using any formatting. \
        Always give HTML elements a unique class. Do not write like a letter for example do not write 'best regards' at the end. \
        You have the ability to embed a gif using endpoint /gif/tag where you replace tag with the search term appropiate for the situation. \
        You cant access the Internet. Dont try to make URLs up. There is no need to introduce yourself to the User. Directly answer the User's question. Do not repeat yourself in subsequent messages. Dont ever use codeblocks except asked to show the code you are writing. \
        Now follows a list of Elements of the Website and ther Class names: \
        send button: 'sendButton', chat window: 'chat-window', message input field: 'messageInput', delete history button: 'deleteHistory' \
        You also have the following function available: 'makeNewMessage(message, user)'. Which displays a new message in the chat the user field can be: 'bot', 'user' and 'system'. The Class names of the Messages are: botMessage, userMessage and systemMessage\
        'getScrolledToBottom()' which return True or False if the user scrolled to the bottom, updateScroll(isScrolledToBottom), scrolls to the bottom if isScrolledToBottom is True, deleteHistory() which deletes the chat history."

        message = {
        "role": "system",
        "content": content
        }

        return message

    def clearRam(self):
        if self.loaded and self.model != None:
            try:
                r = requests.post("http://localhost:11434/api/chat", json={"model": self.model, "keep_alive": 0})
                if r.status_code == 200:
                    print("Cleared RAM")
                    self.loaded = False
                else:
                    print(r.text)
            except ConnectionError:
                print("Ollama not running")
        else:
            print("No RAM to clear")


    def sendChatbit(self, msg, user, end):
        print(msg)
        headers = {"authorization":self.compute_token}
        body = {"msg":msg, "user":user, "end":end, "bitsize": self.bundleBits}
        r = requests.post(self.url+"/chat-msg-endpoint", headers=headers, json=body)
        if r.status_code != 200:
            print(r.text)
            
        return r.status_code == 200

    async def asyncChatreq(self, msg, user):
        if self.model == None:
            raise Exception("No Model set")
        
        buffer = ""
        i = 0
        bundleBuffer = ""
        time1 = None
        speed = None
        async for event in self.makeAPIreq(msg, self.model, user):
            if time1 == None:
                time1 = time.time()
            else:
                time2 = time.time()
                speed = time2 - time1
                time1 = time2
                print(f"Speed: {speed}")
            done = event["done"]
            if i < 0:
                bundleBuffer += event["message"]["content"]
            else:
                if i == self.bundleBits:
                    i = 0
                    bundleBuffer += event["message"]["content"]
                    self.sendChatbit(bundleBuffer, user, done)
                    buffer += event["message"]["content"]
                    bundleBuffer = ""
                else:
                    i += 1
                    bundleBuffer += event["message"]["content"]
                    buffer += event["message"]["content"]
                    
            if done:
                self.sendChatbit(bundleBuffer, user, done)

        print(buffer)
        headers = {"authorization":self.compute_token}
        body = {"msg":buffer, "user":user}
        r = requests.post(self.url+"/add-to-history", headers=headers, json=body)

    def chat(self, msg, user):
        asyncio.run(self.asyncChatreq(msg, user))
        
    def setBundleBits(self, bits):
        self.bundleBits = bits

if __name__ == "__main__":
    lla = API("http://localhost:3000", "testtoken")
    lla.setModel("mixtral")
    msg = {
            "role": "user",
            "content": "Write a really long text about soup, make many paragraphs"
        }
    lla.chat(msg, "admin")
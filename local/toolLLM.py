from logging import log
import logging
from os import terminal_size
from re import A, VERBOSE
from phi.assistant import Assistant
from phi.tools import tavily
from phi.tools import Toolkit
from phi.tools.tavily import TavilyTools
from phi.llm.ollama import OllamaTools
from phi.tools.python import PythonTools
from phi.tools.duckduckgo import DuckDuckGo
from phi.tools.website import WebsiteTools
from phi.tools.wikipedia import WikipediaTools
from phi.llm.message import Message
from phi.llm.references import References
from phi.memory.assistant import AssistantMemory
from phi.tools.youtube_toolkit import YouTubeTools
import requests
import aiohttp
import asyncio
import json
import time
from stableAPI import getModel
from mongoConnector import MongoDB
from typing import List


class custom_functions(Toolkit):
    def __init__(
    self,
    ):
        super().__init__(name="custom_functions")
        self.register(self.calculator)
        
    def calculator(self, query: str) -> str:
        """Use this function to calculate a math expression.

        Args:
            query (str): The math expression to calculate. like "2+2" or "10*10" do not use text here.

        Returns:
            str: The result of the math expression.
        """
        return str(eval(query))

class API:
    def __init__(self):
        self.url = None
        self.compute_token = None
        self.loaded = False
        self.model = None
        self.stop = False
        self.bundleBits = 1
        self.db = MongoDB()
        
    def setModel(self, model):
        self.model = model
        
    def stopChat(self):
        self.stop = True
        
    def setBundleBits(self, bits):
        self.bundleBits = bits
        
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
            
    def getDBMemory(self, username):
        ChatHistory = self.db.get_user_data(username, "history")
        if ChatHistory == None:
            ChatHistory = []
        else:
            ChatHistory = self.json_to_messages(ChatHistory)
        return ChatHistory
    
    def setDBMemory(self, username, memory):
        self.db.set_user_data(username, "history", self.messages_to_json(memory))
    
    def messages_to_json(self, messages: List[Message]) -> List[dict]:
        """Converts a list of Message objects back to a list of dictionaries."""
        return [{'role': msg.role, 'content': msg.content} for msg in messages]

        
    def json_to_messages(self, schema: List[dict]) -> List[Message]:
        """Converts a list of dictionaries to a list of Message objects."""
        return [Message(role=msg['role'], content=msg['content']) for msg in schema]
    
    def makeSystemMessage(self, username):
        msg = []
        content = f"You have the ability to recall messages until the user clicks the delete History button. All your Answers get Interpreted using Markdown. Use Markdown whenever it makes sense exept when writing HTML or CSS. LaTeX is also supported. \
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
        "
        
        msg.append(f"You are an AI Assistant called {self.model}. The Name of the User is {username}")
        msg.append("Always anser as brief and concise as possible. But when using a tool give a brief explanation of the result.")
        msg.append("Never make a name argument in a tool call.")
        msg.append("dont use tools when the information is already available.")
        msg.append("Dont call the same tool with the same arguments multiple times in a row. Only call a tool once.")
        msg.append("When a DuckDuckGo search doesnt return the desired result, analyse the most promising urls unsing the website tools.")
        msg.append("When researching events, always also take the current date into account.")
        msg.append("Never use text in the expression argument for the calculator. Only use numbers and operators.")
        msg.append("The website you are hosted was created by Pius as an AI project. When the user referrs to this website he means this.")
        msg.append(content)
        
                        
        return "\n".join(msg)
        
    def makeAssistants(self, username):
      
        assistant = Assistant(
            llm=OllamaTools(model=self.model, host="http://localhost:11434"),
            tools=[DuckDuckGo(), YouTubeTools(), custom_functions()],
            show_tool_calls=True,
            add_datetime_to_instructions=True,
            add_to_system_prompt=self.makeSystemMessage(username),
            tool_call_limit=5,
            markdown=True,
            memory = AssistantMemory(chat_history=self.getDBMemory(username)),
        )
        
        return assistant
            
    def chat(self, msg, username):
        assistant = self.makeAssistants(username)
        response = ""
        for resp in assistant.run(msg, stream=True):
            response += resp
            self.sendChatbit(resp, username, False)
        print(response)
        self.sendChatbit("", username, True)
        self.setDBMemory(username, assistant.memory.chat_history)
        
    def sendChatbit(self, msg, user, end):
        print(msg)
        headers = {"authorization":self.compute_token}
        body = {"msg":msg, "user":user, "end":end, "bitsize": self.bundleBits}
        r = requests.post(self.url+"/chat-msg-endpoint", headers=headers, json=body)
        if r.status_code != 200:
            print(r.text)
            
        return r.status_code == 200
        
        
def main():
    api = API()
    api.setModel("command-r")
    api.chat("make a html button that alerts the user", "admin")
        
if __name__ == "__main__":
    main()
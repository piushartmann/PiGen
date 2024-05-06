from googlesearch import search
import asyncio

j = search("what are the natural enemies of frogs?", num_results=1)
for i in j:
    print(i)
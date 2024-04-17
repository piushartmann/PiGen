window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
    },
    svg: {
        fontCache: 'global'
    }
};

function sendMessage() {
    var message = document.getElementById("messageInput").value;

    makeNewMessage(message, "user")
    document.getElementById("messageInput").value = "";

    // Send message to /chat-msg endpoint
    fetch('/chat-msg', {
        method: 'POST',
        body: JSON.stringify({ msg: message }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .catch(error => {
            console.error('Chat-msg error:', error);
        });
}
function loadConversation() {
    fetch('/load-conversation', {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            var chatWindow = document.getElementById("chatWindow");
            chatWindow.innerHTML = "";
            console.log(data);
            data.forEach(function (message) {
                isBot = message.role == "assistant"
                if (isBot) {
                    array = makeNewMessage(message.content, "bot");
                }
                else {
                    array = makeNewMessage(message.content, "user");
                }
                addElementsToNewCodeBlocks();
                updateCodeSyntaxHighlighting();
                try {
                    MathJax.typesetPromise([array[0]]).catch(function (err) {
                        console.error('MathJax typesetPromise failed:', err);
                    });
                } catch (error) {
                    console.error('MathJax typesetPromise failed:', error);
                    location.reload();

                }

                updateScroll(true);
            });
        })
        .catch(error => {
            console.error('Load-conversation error:', error);
        });

}

function makeNewMessage(message, user) {
    var isScrolledToBottom = getScrolledToBottom();
    var chatWindow = document.getElementById("chatWindow");
    var newDIV = document.createElement("div");
    var newMessage = document.createElement("p");
    var newImage = document.createElement("img");
    isBot = user == "bot"
    isSystem = user == "system"
    if (isSystem) {
        newMessage.textContent = message;
        newMessage.className = "systemMessage";
        chatWindow.appendChild(newMessage);
        return newMessage;
    }

    newImage.src = isBot ? "/icons/bot.png" : "/icons/user.png";
    newImage.alt = isBot ? "Bot" : "User";

    newDIV.className = isBot ? "botMessage" : "userMessage";
    newImage.className = isBot ? "botImage" : "userImage";

    if (isBot) {
        newMessage.innerHTML = marked.parse(message);
    }
    else {
        newMessage.textContent = message;
    }

    newDIV.appendChild(newMessage);
    chatWindow.appendChild(newDIV);
    newDIV.insertBefore(newImage, newMessage);
    updateScroll(isScrolledToBottom);
    return [newMessage, newDIV];
}

function updateScroll(isScrolledToBottom) {
    chat = document.getElementById("chatWindow");
    if (isScrolledToBottom) {
        chat.scrollTop = chat.scrollHeight - chat.clientHeight;
    }

}

function getScrolledToBottom() {
    chat = document.getElementById("chatWindow");
    return chat.scrollHeight - chat.clientHeight <= chat.scrollTop + 10;
}

function handleKeyDown(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

function deleteHistory() {
    var chatWindow = document.getElementById("chatWindow");
    chatWindow.innerHTML = "";

    fetch('/delete-history', {
        method: 'POST'
    })
}

ongoing = false;
currentRawMessage = "";

function botMessage(bit) {
    if (ongoing) {
        var isScrolledToBottom = getScrolledToBottom();
        currentRawMessage += bit;
        //currentMessage.innerHTML = DOMPurify.sanitize(marked.parse(currentRawMessage));
        currentMessage.innerHTML = marked.parse(currentRawMessage);

        MathJax.typesetPromise([currentMessage]).catch(function (err) {
            console.error('MathJax typesetPromise failed:', err);
        });

        addElementsToNewCodeBlocks();
        updateCodeSyntaxHighlighting();
        Array.from(document.getElementsByClassName("lanLabel")).forEach((lan) => { updateLanLabel(lan); });
        updateScroll(isScrolledToBottom);
    }
    else {
        var isScrolledToBottom = getScrolledToBottom();
        ongoing = true;
        array = makeNewMessage("", "bot");
        currentMessage = array[0];
        currentDIV = array[1];
        console.log(currentMessage)
        currentRawMessage = bit;
        //currentMessage.innerHTML = DOMPurify.sanitize(marked.parse(currentRawMessage));
        currentMessage.innerHTML = marked.parse(currentRawMessage);
        currentDIV.appendChild(currentMessage);
        updateScroll(isScrolledToBottom);
    }
}

function addElementsToNewCodeBlocks() {
    document.querySelectorAll('pre code').forEach((codeBlock) => {
        const preElement = codeBlock.parentNode;
        if (preElement && !preElement.getAttribute("elements-added")) {
            const btn = document.createElement('button');
            const lan = document.createElement('span');
            const run = document.createElement('button');

            btn.textContent = 'Copy';
            btn.className = 'copy-btn';
            btn.type = 'button';

            run.textContent = 'Run!';
            run.className = 'run-btn';
            run.type = 'button';
            run.hidden = true;


            lan.className = 'lanLabel';
            lan.id = 'lanLabel';

            preElement.setAttribute("elements-added", "true");

            btn.onclick = function () {
                navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = 'Copy', 2000);
                }).catch(err => console.error('Copy failed', err));
            };

            preElement.insertBefore(btn, codeBlock);
            preElement.insertBefore(run, btn);
            preElement.insertBefore(lan, btn);

            updateLanLabel(lan);
        }
    });
}

function updateLanLabel(lan) {
    if (!lan) {
        return;
    }
    const pre = lan.parentNode;
    run = pre.querySelectorAll('.run-btn')[0];
    codeBlock = pre.querySelectorAll('code')[0]
    const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
    if (languageClass) {
        const language = languageClass.split('-')[1];
        lan.textContent = language;
        if (language === "javascript") {
            run.hidden = false;
            run.onclick = function () {
                const pre = lan.parentNode;
                const codeBlock = pre.querySelectorAll('code')[0];
                var code = codeBlock.textContent
                if (code.endsWith("\n")) {
                    code = code.slice(0, -1);
                }
                //catchErrors = code + ".catch(error => {console.error('Error running code:', error);});";
                console.log('Running code:');
                console.log(code);
                try {
                    setTimeout(code, 5);
                } catch (error) {
                    console.error('Error running code:', error);
                }
            };
        }
    } else {
        lan.textContent = "Unknown";
    }
}


document.addEventListener('DOMContentLoaded', (event) => {

    hljs.highlightAll();


    addElementsToNewCodeBlocks();
    updateCodeSyntaxHighlighting();

    loadConversation();

    const eventSource = new EventSource('/chat-events');

    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.end) {
            ongoing = false;
        }
        else {
            botMessage(data.msg);
        }
    };
});

function updateCodeSyntaxHighlighting() {
    document.querySelectorAll('pre code').forEach((block) => {
        if (block.getAttribute('data-highlighted') === "yes") {
            return;
        }
        else {
            hljs.highlightElement(block);
        }
    });
}

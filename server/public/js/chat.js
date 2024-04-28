window.mathjax_loaded = false
window.MathJax = {
    startup: {
        pageReady: () => {
            console.log('Running MathJax');
            window.mathjax_loaded = true
            return MathJax.startup.defaultPageReady();
        }
    },
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']]
    },
    svg: {
        fontCache: 'global'
    }
};

global = {};
global.messages = 0;
global.generating = false;
let currentAnimationPromise = null;

function sendButtonClicked() {
    if (!global.generating) {
        if (global.editing) {
            sendEditedMessage(global.lastSelected);
        }
        else {
            sendMessage();
        }
    }
    else {
        stopGeneration();
    }
}

function stopGeneration() {
    fetch('/stop-chat', {
        method: 'POST'
    })
        .catch(error => {
            console.error('Stop-generation error:', error);
        });
    generationStop();

}

function sendMessage() {
    var message = document.getElementById("messageInput").value;

    makeNewMessage(message, "user")
    document.getElementById("messageInput").value = "";

    generationStarted();
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

    newImage.onclick = function () {
        const message = newImage.parentElement;
        MessageOptions(message);
    };

    newDIV.id = global.messages;
    global.messages += 1;

    newDIV.appendChild(newMessage);
    chatWindow.appendChild(newDIV);
    newDIV.insertBefore(newImage, newMessage);
    updateScroll(isScrolledToBottom);
    return [newMessage, newDIV];
}

function MessageOptions(message) {

    if (message.querySelector('.blurBox') != null) {
        removeOptions(message);
    }
    else {
        if (global.lastSelected != null && global.lastSelected) {
            removeOptions(global.lastSelected);
        }
        global.lastSelected = message;
        addOptions(message);
    }

    function removeOptions(message) {
        isBot = message.classList.contains("botMessage") == true;
        lastblurbox = message.querySelector('.blurBox');
        if (lastblurbox == null) {
            return;
        }
        lastblurbox.style.animation = 'none';
        lastblurbox.offsetHeight;
        lastblurbox.style.animation = "blur-anim 300ms linear reverse";

        lastblurbox.removeChild(removeButton);

        if (isBot) {
            lastblurbox.removeChild(regenerateButton);
        }
        else {
            lastblurbox.removeChild(editButton);
        }

        setTimeout(() => {
            message.removeChild(lastblurbox);
        }, 300);
    }

    function addOptions(message) {
        isBot = message.classList.contains("botMessage") == true;
        removeButton = document.createElement("button");
        blurbox = document.createElement("div");
        blurbox.className = "blurBox";
        blurbox.onclick = function (event) { MessageOptions(message); };

        if (isBot) {
            regenerateButton = document.createElement("button");
            regenerateButton.classList = ["regenerateButton button"];
            regenerateButton.textContent = "Regenerate";
            regenerateButton.onclick = function () { regenerateMessage(message) };
            blurbox.appendChild(regenerateButton);
        }
        else {
            editButton = document.createElement("button");
            editButton.classList = ["editButton button"];
            editButton.textContent = "Edit";
            editButton.onclick = function () { editMessage(message) };
            blurbox.appendChild(editButton);
        }

        removeButton.classList = ["removeButton button"];
        removeButton.textContent = "Delete";
        removeButton.onclick = function () { removeMessage(message) };

        message.appendChild(blurbox);
        blurbox.appendChild(removeButton);
    }
}

function editMessage(message) {
    p = message.querySelector('p')
    p.contentEditable = true;
    p.focus();
    p.addEventListener('keydown', (evt) => {
        console.log(evt.key)
        if (evt.key === "Enter") {
            sendEditedMessage(message);
            evt.preventDefault();
        }
        if (evt.key === "Escape") {
            stopEditingMessage(message);
            evt.preventDefault();
        }
    });
    global.editing = true;
}

function stopEditingMessage(message) {
    p = message.querySelector('p')
    p.contentEditable = false;
    global.editing = false;

}

function sendEditedMessage(message) {
    global.editing = false;
    newContent = p.textContent;
    fetch('/edit-message', {
        method: 'POST',
        body: JSON.stringify({ index: message.id, message: newContent }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(data => {
            generationStarted();
            chat = document.getElementById("chatWindow");
            while (message.nextElementSibling) {
                chat.removeChild(message.nextElementSibling);
            }
            chat.removeChild(message);
            makeNewMessage(newContent, "user");
        })
}

function regenerateMessage(message) {
    fetch('/regenerate-message', {
        method: 'POST',
        body: JSON.stringify({ index: message.id }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(data => {
            generationStarted();
            chat = document.getElementById("chatWindow");
            while (message.nextElementSibling) {
                chat.removeChild(message.nextElementSibling);
            }
            chat.removeChild(message);
        })
}

function removeMessage(message) {
    fetch('/delete-message', {
        method: 'POST',
        body: JSON.stringify({ index: message.id }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(data => {
            chat = document.getElementById("chatWindow");
            chat.removeChild(message);
        })
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
        if (!global.generating) {
            if (global.editing) {
                sendEditedMessage(global.lastSelected);
            }
            else {
                sendMessage();
            }
        }
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
    var isScrolledToBottom = getScrolledToBottom();
    if (ongoing) {
        currentRawMessage += bit;
        animateText(currentRawMessage, currentMessage);

        MathJax.typesetPromise([currentMessage]).catch(function (err) {
            console.error('MathJax typesetPromise failed:', err);
        });

        addElementsToNewCodeBlocks();
        updateCodeSyntaxHighlighting();
        Array.from(document.getElementsByClassName("lanLabel")).forEach((lan) => { updateLanLabel(lan); });
        updateScroll(isScrolledToBottom);
    }
    else {
        ongoing = true;
        array = makeNewMessage("", "bot");
        currentMessage = array[0];
        currentDIV = array[1];
        console.log(currentMessage);
        animateText(bit, currentMessage);

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

    function load() {
        if(window.mathjax_loaded==false) {
            setTimeout(load, 1);
            return;
        }
        speedTest();
    
        hljs.highlightAll();
    
    
        addElementsToNewCodeBlocks();
        updateCodeSyntaxHighlighting();
    
        loadConversation();
    
        const eventSource = new EventSource('/chat-events');
    
        eventSource.onmessage = function (event) {
            const data = JSON.parse(event.data);
            if (data.end) {
                botMessage(data.msg);
                generationStop();
            }
            else {
                botMessage(data.msg);
            }
        };
    }
    load();

});

function generationStarted() {
    sendButton = document.getElementById("sendButton");
    img = sendButton.querySelector('img')
    global.generating = true;
    img.src = "/icons/Github-Octicons-X-24.svg";
    sendButton.style = "background-image: linear-gradient(45deg, red, lightcoral);";

}

function generationStop() {
    ongoing = false;
    sendButton = document.getElementById("sendButton");
    img = sendButton.querySelector('img')
    global.generating = false;
    img.src = "/icons/paper-plane-solid.svg";
    sendButton.style = "background-image: linear-gradient(45deg, var(--color-primary), var(--color-primary-bright));";
}

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

function speedTest() {
    time1 = Date.now();
    fetch('/speedtest', {
        method: 'GET'
    })
        .then(data => {
            time2 = Date.now();
            speed = time2 - time1;
            console.log('Time:', speed + 'ms');
            window.speed = speed;
        })
        .catch(error => {
            console.error('Speed-test error:', error);
        });
}

async function animateText(text, element) {
    if (currentAnimationPromise) {
        clearTimeout(currentAnimationPromise.timeoutId);
        currentAnimationPromise.resolve(); // Resolve the previous promise
    }

    let promise = new Promise(resolve => {
        let interval = window.speed / text.length;
        let index = 0;
        const addCharacter = () => {
            if (index === 0) {
                //element.innerHTML = ''; // Clear the text at the start
            }
            element.innerHTML += text.charAt(index);
            index++;
            if (index < text.length) {
                currentAnimationPromise.timeoutId = setTimeout(addCharacter, interval);
            } else {
                resolve();
            }
        };
        currentAnimationPromise = { timeoutId: setTimeout(addCharacter, interval), resolve };
    });

    await promise;
}
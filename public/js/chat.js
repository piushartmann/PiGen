function sendMessage() {
    var message = document.getElementById("messageInput").value;
    makeNewMessage(message, false)
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

function makeNewMessage(message, isBot) {
    var chatWindow = document.getElementById("chatWindow");
    var newDIV = document.createElement("div");
    var newMessage = document.createElement("p");
    var newImage = document.createElement("img");
    newImage.src = isBot ? "/icons/bot.png" : "/icons/user.png";
    newImage.alt = isBot ? "Bot" : "User";

    newDIV.className = isBot ? "botMessage" : "userMessage";
    newImage.className = isBot ? "botImage" : "userImage";

    newMessage.textContent = message;
    newDIV.appendChild(newMessage);
    chatWindow.appendChild(newDIV);
    newDIV.insertBefore(newImage, newMessage);
    return [newMessage, newDIV];
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

document.addEventListener('DOMContentLoaded', (event) => {
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


ongoing = false;
currentRawMessage = "";

function botMessage(bit) {
    if (ongoing) {
        currentRawMessage += bit;
        //currentMessage.innerHTML = DOMPurify.sanitize(marked.parse(currentRawMessage));
        currentMessage.innerHTML = marked.parse(currentRawMessage);

        MathJax.typesetPromise([currentMessage]).catch(function (err) {
            console.error('MathJax typesetPromise failed:', err);
        });

        addElementsToNewCodeBlocks();
        updateCodeSyntaxHighlighting();
        Array.from(document.getElementsByClassName("lanLabel")).forEach((lan) => { updateLanLabel(lan); });
    }
    else {
        ongoing = true;
        array = makeNewMessage("", true);
        currentMessage = array[0];
        currentDIV = array[1];
        console.log(currentMessage)
        currentRawMessage = bit;
        //currentMessage.innerHTML = DOMPurify.sanitize(marked.parse(currentRawMessage));
        currentMessage.innerHTML = marked.parse(currentRawMessage);
        currentDIV.appendChild(currentMessage);
    }
}

function addElementsToNewCodeBlocks() {
    document.querySelectorAll('pre code').forEach((codeBlock) => {
        const preElement = codeBlock.parentNode;
        if (preElement && !preElement.getAttribute("elements-added")) {
            const btn = document.createElement('button');
            const lan = document.createElement('span');

            btn.textContent = 'Copy';
            btn.className = 'copy-btn';
            btn.type = 'button';


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
    codeBlock = pre.querySelectorAll('code')[0]
    const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
    if (languageClass) {
        const language = languageClass.split('-')[1];
        lan.textContent = language;
    } else {
        lan.textContent = "Unknown";
    }
}


document.addEventListener('DOMContentLoaded', (event) => {

    hljs.highlightAll();

    addElementsToNewCodeBlocks();
    updateCodeSyntaxHighlighting();


    window.MathJax = {  
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']]
        },
        svg: {
            fontCache: 'global'
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

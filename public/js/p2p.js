var peer = null;
var conn = null;
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
connected = false;
connectedToHost = false;
const id = generateString(8);

document.addEventListener("DOMContentLoaded", () => {

    peer = new Peer(id, {
        host: "192.168.52.88",
        port: 3000,
        path: "/peerjs/p2pserver",
        debug: 3
    });
    code = document.getElementById("code");
    code.innerHTML = id
    setEvents();

    const form = document.getElementById('codeForm');
    form.onsubmit = function (event) {
        event.preventDefault();
        join(document.getElementById("codeInput").value);
    };
});


function generateString(length) {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result.slice(0, 4) + "-" + result.slice(4);
}

function setEvents() {
    peer.on('connection', function (conn) {
        onConnection(conn);
    });

    peer.on('close', function (conn) {
        onDisconnect(conn);
    })
}

function onConnection(conn) {
    connected = true;
    setChatInputs(true);
    conn.on('data', function (data) {
        handleIncomingData(data);
    });
    console.log("Connected");
}

function handleIncomingData(data) {
    var message = data.message;
    var dataid = data.id;
    if (dataid){
        join(data.id)
    }
    if (message) {
        addMessageToChat(message, false);
    }

}

function onDisconnect(conn) {
    setChatInputs(false);
    console.log("Disconnected");
    connected = false;
    connectedToHost = false;
}

function setChatInputs(show) {
    userInput = document.getElementById("userInput");
    userInput.style.display = !show ? "none" : "block";
    
    codeForm = document.getElementById("codeForm");
    title = document.getElementById("title");
    codeForm.style.display = show ? "none" : "block";
    title.style.display = show ? "none" : "block";
}

function join(code) {
    console.log("Joining: " + code);
    conn = peer.connect(code);
    console.log(conn);
    connectedToHost = true;
    if (!connected) {
        conn.on("open", () => {
            conn.send({id: id});
        });
    }
}

function formatInput(input) {
    var value = input.value.toUpperCase();  // Convert to upper case for uniformity
    // Remove any characters that are not alphanumeric
    var alphanumericValue = value.replace(/[^A-Z0-9]/gi, '').substring(0, 8);  // Limit to 8 characters
    // Add a dash after the fourth character
    var formattedValue = '';
    for (let i = 0; i < alphanumericValue.length; i++) {
        if (i === 4) {
            formattedValue += '-';
        }
        formattedValue += alphanumericValue[i];
    }
    input.value = formattedValue;
}


function handleKeyDown(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

function sendButtonClicked() {
    sendMessage();
}

function sendMessage() {
    message = document.getElementById("messageInput").value;
    conn.send({message: message});
    document.getElementById("messageInput").value = ""
    addMessageToChat(message, true);
}

function addMessageToChat(message, sender) {
    Scroll = getScrolledToBottom();
    chatWindow = document.getElementById("chatWindow");
    newMessage = document.createElement("p");
    newMessage.innerHTML = message
    newMessage.className = sender ? "MessageMe" : "MessageThey";
    chatWindow.appendChild(newMessage);
    updateScroll(Scroll);
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
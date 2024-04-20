var peer = null;
var conn = null;
var id = null;
var initializer = false;
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
connected = false;
connectedToHost = false;

document.addEventListener("DOMContentLoaded", () => {
    id = generateString(8);

    peer = new Peer(id, {
        host: "/",
        port: 3000,
        path: "/p2pserver",
        debug: 3,
        secure: false,
    });
    setEvents();

    table = document.getElementById("peerTable");
    tablebegin = table.innerHTML
    listAllPeers();
    intervall = setInterval(() => {
        listAllPeers();
    }, 1000);
});


function generateString(length) {
    let result = username + "-";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log(result.length);
    return result
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
    if (initializer) {
        connected = true;
        setChatInputs(true);
    }
    conn.on('data', function (data) {
        if (data.id) {
            if (confirm("Do you want to connect to " + getNameFromPeer(data.id) + "?")) {
                connected = true;
                setChatInputs(true);
                handleIncomingData(data);
            }
        }
        else {
            handleIncomingData(data);
        }
    });
    console.log("Connected");
}

function handleIncomingData(data) {
    var message = data.message;
    var dataid = data.id;
    console.log(data);
    if (dataid) {
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
    //show
    userInput = document.getElementById("userInput");
    userInput.style.display = !show ? "none" : "block";

    //hide
    title = document.getElementById("title");
    title.style.display = show ? "none" : "block";
    table = document.getElementById("peerTable");
    table.style.display = show ? "none" : "block";
}

function join(code) {
    console.log("Joining: " + code);
    conn = peer.connect(code);
    console.log(conn);
    connectedToHost = true;
    if (!connected) {
        conn.on("open", () => {
            conn.send({ id: id });
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
    conn.send({ message: message });
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

function getNameFromPeer(peer) {
    return peer.indexOf("-") > -1 ? peer.split("-")[0] : peer;
}

function listAllPeers() {
    table = document.getElementById("peerTable");
    table.innerHTML = tablebegin;
    peer.listAllPeers((peers) => {peers.forEach(peer => {
        peerusername = getNameFromPeer(peer);
        if (peerusername == username) {
            return;
        }
        var row = table.insertRow(-1);
        cell1 = row.insertCell(0);
        cell2 = row.insertCell(1);

        cell1.innerHTML = peerusername;
        button = document.createElement("button");
        button.className = "joinButton";
        button.innerHTML = "Join";
        button.onclick = function () {
            join(peer);
            initializer = true;
            console.log("Joining: " + peer);
        }

        cell2.appendChild(button);
    })});
    
}
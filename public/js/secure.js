var compatibility = false;
var mode = null;

document.addEventListener("DOMContentLoaded", () => {
    const p2p = new p2pMode();
    const comp = new compabilityMode();

    const checkbox = document.getElementById("compatibility");
    mode = compatibility ? comp : p2p;
    checkbox.addEventListener("change", function () {
        compatibility = checkbox.checked == true;
        mode = compatibility ? comp : p2p;
    });

    table = document.getElementById("peerTable");
    tablebegin = table.innerHTML
    mode.listAllPeers();
    intervall = setInterval(() => {
        mode.listAllPeers();
    }, 1000);
});

function handleKeyDown(keyevent) {
    if (keyevent.key === "Enter") {
        mode.sendMessage();
    }
}


function updateScroll(isScrolledToBottom) {
    const chat = document.getElementById("chatWindow");
    if (isScrolledToBottom) {
        chat.scrollTop = chat.scrollHeight - chat.clientHeight;
    }

}

function getScrolledToBottom() {
    const chat = document.getElementById("chatWindow");
    return chat.scrollHeight - chat.clientHeight <= chat.scrollTop + 10;
}


function addMessageToChat(message, sender) {
    const Scroll = getScrolledToBottom();
    const chatWindow = document.getElementById("chatWindow");
    const newMessage = document.createElement("p");
    newMessage.innerHTML = message;
    newMessage.className = sender ? "MessageMe" : "MessageThey";
    chatWindow.appendChild(newMessage);
    updateScroll(Scroll);
}

function handleIncomingData(data) {
    var message = data.message;
    var dataid = data.id;
    console.log(data);
    if (dataid) {
        mode.join(data.id)

    }
    if (message) {
        addMessageToChat(message, false);
    }

}

function makeRow(username, table) {
    table.innerHTML = tablebegin;
    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);

    cell1.innerHTML = username;
    var button = document.createElement("button");
    button.className = "joinButton";
    button.innerHTML = "Join";
    button.id = "joinButton_" + username;
    cell2.appendChild(button);

    button = document.getElementById("joinButton_" + username);
    return button;
}

function setChatInputs(show) {
    //show
    const userInput = document.getElementById("userInput");
    userInput.style.display = !show ? "none" : "block";

    //hide
    const title = document.getElementById("title");
    title.style.display = show ? "none" : "block";
    const table = document.getElementById("peerTable");
    table.style.display = show ? "none" : "block";
    const compatibility = document.getElementById("compatibility");
    compatibility.style.display = show ? "none" : "block";
}

function formatInput(input) {
    var value = input.value.toUpperCase();
    var alphanumericValue = value.replace(/[^A-Z0-9]/gi, '').substring(0, 8);
    var formattedValue = '';
    for (let i = 0; i < alphanumericValue.length; i++) {
        if (i === 4) {
            formattedValue += '-';
        }
        formattedValue += alphanumericValue[i];
    }
    input.value = formattedValue;
}

function sendButtonClicked() {
    mode.sendMessage();
}

class p2pMode {

    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = this.generateId(8);
        this.initializer = false;
        this.connected = false;
        this.connectedToHost = false;

        if (debug == "true") {
            this.peer = new Peer(id, {
                host: "/",
                port: 3000,
                path: "/p2pserver",
                secure: false,
                //debug: 3
            });
        }
        else {
            this.peer = new Peer(id, {
                host: "/",
                port: 443,
                path: "/p2pserver",
                secure: true,
            });
        }
        this.setEvents();
    }

    generateId(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = username + "-";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result
    }

    setEvents() {
        this.peer.on('connection', this.onConnection);

        this.peer.on('close', this.onDisconnect);
    }

    onConnection = (conn) => {
        if (this.initializer) {
            this.connected = true;
            setChatInputs(true);
        }
        conn.on('data', (data) => {
            if (data.id) {
                if (confirm("Do you want to connect to " + this.getNameFromPeer(data.id) + "?")) {
                    this.connected = true;
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

    getNameFromPeer(peer) {
        return peer.indexOf("-") > -1 ? peer.split("-")[0] : peer;
    }

    onDisconnect = (conn) => {
        setChatInputs(false);
        console.log("Disconnected");
        this.connected = false;
        this.connectedToHost = false;
    }

    join(code) {
        console.log("Joining: " + code);
        this.conn = this.peer.connect(code);
        console.log(this.conn);
        this.connectedToHost = true;
        if (!this.connected) {
            this.conn.on("open", () => {
                this.conn.send({ id: this.id });
            });
        }
    }

    sendMessage() {
        var message = document.getElementById("messageInput").value;
        this.conn.send({ message: message });
        document.getElementById("messageInput").value = "";
        addMessageToChat(message, true);
    }

    listAllPeers() {
        this.peer.listAllPeers((peers) => {
            var table = document.getElementById("peerTable");
            peers.forEach(peer => {
                var peerusername = this.getNameFromPeer(peer);
                if (peerusername == username) {
                    return;
                }

                const button = makeRow(peerusername, table)

                button.onclick = function () {
                    this.join(peer);
                    this.initializer = true;
                }.bind(this);

            })
        });

    }
}

class compabilityMode {

    constructor(id) {
        var socket = io();
        socket.emit('chat message', "Hello World");

        socket.on('chat message', function (msg) {
            console.log(msg);
            //addMessageToChat(msg, false);
        });
    }

    sendMessage() { }
    join() { }
    listAllPeers() { }


}

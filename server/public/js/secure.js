var socketCheckbox = false;
var mode = null;

document.addEventListener("DOMContentLoaded", () => {
    const p2p = new p2pMode();
    const socket = new socketMode();

    const checkbox = document.getElementById("modeSelector");
    mode = socketCheckbox ? p2p : socket;
    checkbox.addEventListener("change", function () {
        socketCheckbox = checkbox.checked == true;
        mode = socketCheckbox ? p2p : socket;
        resetTable();
        mode.listAllPeers();
        if (socketCheckbox) {
            socket.disconnect();
            p2p.connect();
        }
        else {
            socket.connect();
            p2p.disconnect();
        }
    });

    mode.connect();
    table = document.getElementById("peerTable");
    tablebegin = table.innerHTML
    mode.listAllPeers();
    intervall = setInterval(() => {
        mode.listAllPeers();
    }, 1000);
    document.getElementById("messageInput").onchange = function () {
        if (this.value.length > 0) {
            mode.typing(true);
        }
        else {
            mode.typing(false);
        }
    };
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

function resetTable() {
    var table = document.getElementById("peerTable");
    table.innerHTML = tablebegin;
    return table;
}

function setChatInputs(show) {
    //show
    const userInput = document.getElementById("userInput");
    userInput.style.display = !show ? "none" : "block";
    const showElement = document.getElementById("show");
    showElement.style.display = !show ? "none" : "block";

    //hide
    const title = document.getElementById("title");
    title.style.display = show ? "none" : "block";
    const hide = document.getElementById("hide");
    hide.style.display = show ? "none" : "block";
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

function showTyping(show) {
    const typing = document.getElementById("typing");
    typing.style.display = !show ? "none" : "block";
}

class p2pMode {

    constructor() {
        this.peer = null;
        this.conn = null;
        this.id = this.generateId(8);
        this.initializer = false;
        this.connected = false;
        this.connectedToHost = false;
        this.connect();

        this.setEvents();
    }

    connect() {
        if (window.debug == "true") {
            this.peer = new Peer(this.id, {
                host: "/",
                port: 3000,
                path: "/p2pserver",
                secure: false,
            });
        }
        else {
            this.peer = new Peer(this.id, {
                host: "/",
                port: 443,
                path: "/p2pserver",
                secure: true,
            });
        }
    }

    disconnect() {
        this.peer.disconnect();
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
            var table = resetTable();
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

    typing(typing) {}
}

class socketMode {

    constructor() {
        this.socket = io("/secure");
        this.socket.disconnect();
        this.room = ""

        this.socket.on('chat message', function (msg) {
            console.log(msg);
            addMessageToChat(msg, false);
        });

        this.socket.on('comm join', function (data) {
            console.log(data); 
            console.log(data.user + " "+ data.id);  
            console.log(username)
            if (data.user != username) {
                if (!confirm("Do you want to connect to " + data.user + "?")) {
                    this.socket.emit('comm join', false);
                    return;
                }
            }
            this.room = data.id;
            console.log("Joined " + data.id);
            setChatInputs(true);
            this.socket.emit('comm accept', true);
        }.bind(this));

        this.socket.on('comm typing', function (typing) {
            showTyping(typing);
        });
    }

    connect() {
        this.socket.connect();
    }

    disconnect() {
        this.socket.disconnect();
        this.room = "";
        setChatInputs(false);
    }

    sendMessage() {
        if (this.room == "") {
            alert("You are not connected to a peer");
            return;
        }
        const message = document.getElementById("messageInput");
        var data = { message: message.value, id: this.room }
        this.socket.emit('chat message', data);
        addMessageToChat(message.value, true);
        message.value = "";
    }

    typing(typing) {
        this.socket.emit('comm typing', typing);
    }

    join(user) {
        this.socket.emit('comm join', user);
    }

    listAllPeers() {
        fetch("/getSockets", {
            method: 'GET'
        })
            .then(response => response.json())
            .then(data => {
                var table = resetTable();
                data.forEach(user => {
                    var peerusername = user;
                    if (peerusername == username) {
                        return;
                    }

                    const button = makeRow(peerusername, table)

                    button.onclick = function () {
                        mode.join(user);
                    }

                })
            });
    }


}

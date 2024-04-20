const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session')
const multer = require('multer');
const Jimp = require('jimp');
const ExpressPeerServer = require("peer").ExpressPeerServer;
const http = require("http");

const app = express();

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
var upload = multer({ storage: storage })

app.use(express.json());
app.set('view engine', 'ejs')
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static('public'));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));


keyfile = null;
keysynced = false;
userdata = {};
settings = {};
p2pclientsWaiting = [];

console.log("Starting");

var requeststack = [];
const compute_token = "testtoken";

app.get('/', (req, res) => {
    if (checkUser(req.session.user)) {
        res.redirect('/home');
        return;
    }
    else {
        res.render("login.ejs", { connected: keysynced });
        return;
    }
});


app.post('/login', (req, res) => {
    const user = req.body.username;
    const password = req.body.password;

    if (validate_password(user, password)) {
        req.session.user = { username: user, password: password };
        res.redirect('/home');
    }
    else {
        res.redirect('/');
    }
});

app.post('/logout', (req, res) => {
    req.session.user = null;
    res.redirect('/');
});

app.get('/home', (req, res) => {
    if (checkUser(req.session.user)) {
        res.render("home.ejs", { username: req.session.user.username, admin: checkAdmin(req.session.user.username) });
    }
    else {
        res.redirect('/');
    }

});

app.get('/settings', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            res.render("settings.ejs", { chatEnabled: getSetting("chatEnabled"), model: getSetting("model") });
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }

});

app.get('/newUser', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            res.render("newUser.ejs");
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }
});

app.get('/settings/:user', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            user = req.params.user;
            if (user == "admin") {
                res.send("You cannot change the Admin");
                return;
            }
            if (keyfile[user]) {
                res.render("userSettings.ejs", { userdata: userdata, user: user, password: keyfile[user]["password"], admin: keyfile[user]["admin"] });
            }
            else {
                res.send("User not found");
            }
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }
});

app.post('/createUser', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            const username = req.body.username;
            if (username == "admin") {
                res.send("You cannot change the Admin");
                return;
            }
            referer = req.headers.referer
            newUser = !referer.includes("settings");
            if (!newUser) {
                oldName = referer.split("/").pop();
                console.log("Renaming user from " + oldName + " to " + username);
            }
            else {
                oldName = null;
                console.log("Creating user " + username);
            }

            const password = req.body.password;
            const admin = req.body.admin == "on";
            keyfile[username] = { password: password, admin: admin };
            if (!newUser) {
                delete keyfile[oldName];
            }
            requeststack.push({ "function": "createUser", "arguments": { username: username, password: password, admin: admin, oldName: oldName } });
            res.redirect('/settings');
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }

});

app.post('/deleteUser', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            const username = req.body.username;
            if (username == req.session.user.username) {
                res.send("You cannot delete yourself");
                return;
            }
            if (username == "admin") {
                res.send("You cannot delete the admin");
                return;
            }
            console.log("Deleting user " + username);
            delete keyfile[username];
            requeststack.push({ "function": "deleteUser", "arguments": { username: username } });
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }
});

app.get('/getUser', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            res.send(keyfile);
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }

});

app.post('/set-chat', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            setSetting("chatEnabled", req.body.chatEnabled);
            res.status(200).send("Chat enabled set");
        }
        else {
            res.status(401).send("Unauthorized");
        }
    }
    else {
        res.status(401).send("Unauthorized");
    }
});

app.get('/p2p', (req, res) => {
    if (checkUser(req.session.user)) {
        res.render("p2p.ejs", {username: req.session.user.username});
    }
    else {
        res.redirect('/');
    }
});

app.get('/getUserName', (req, res) => {
    if (checkUser(req.session.user)) {
        res.send({username: req.session.user.username});
    }
    else {
        res.redirect('/');
    }
});


app.get('/chat', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            res.render("chat.ejs", { username: req.session.user.username });
        } else {
            res.send("Chat is disabled");
        }
    }
    else {
        res.redirect('/');
    }

});


Chathistory = {};
app.post('/chat-msg', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            msg = {
                "role": "user",
                "content": req.body.msg
            }

            ChatHistory = getUserdata(req.session.user.username, "history");
            if (ChatHistory == null) {
                ChatHistory = [];
            }
            ChatHistory.push(msg);

            addUserdata(req.session.user.username, "history", ChatHistory);

            console.log(ChatHistory);

            requeststack.push({ "function": "chatMsg", "arguments": { msg: ChatHistory, username: req.session.user.username } });

            console.log("Chat msg requested");
            res.status(200);
        } else {
            res.send("Chat is disabled");
        }
    }

});

const Chatclients = new Map();

app.get('/chat-events', function (req, res) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const username = req.session.user.username;
    const newClient = {
        id: username,
        res
    };

    Chatclients.set(username, newClient);

    req.on('close', () => {
        Chatclients.delete(username);
        stopChat();
    });
});

app.post('/stop-chat', (req, res) => {
    if (checkUser(req.session.user)) {
        stopChat();
    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/edit-message', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            newmsg = req.body.message;
            ChatHistory = getUserdata(user, "history");
            if (ChatHistory == null) {
                return;
            }
            ChatHistory[index].content = newmsg;
            ChatHistory = ChatHistory.slice(0, index);
            addUserdata(user, "history", ChatHistory);

            requeststack.push({ "function": "chatMsg", "arguments": { msg: ChatHistory, username: req.session.user.username } });
            res.status(200).send("Message edited");
        } else {
            res.send("Chat is disabled");
        }

    }
});

app.post('/delete-message', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            ChatHistory = getUserdata(user, "history");
            if (ChatHistory == null) {
                return;
            }
            ChatHistory.splice(index, 1);
            addUserdata(user, "history", ChatHistory);
            res.status(200).send("Message removed");
        } else {
            res.send("Chat is disabled");
        }

    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/regenerate-message', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            ChatHistory = getUserdata(user, "history");
            if (ChatHistory == null) {
                return;
            }
            //delete every message after the one to be regenerated
            ChatHistory = ChatHistory.slice(0, index);
            addUserdata(user, "history", ChatHistory);

            requeststack.push({ "function": "chatMsg", "arguments": { msg: ChatHistory, username: req.session.user.username } });
            res.status(200).send("Message removed");
        } else {
            res.send("Chat is disabled");
        }

    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/load-conversation', (req, res) => {
    if (checkUser(req.session.user)) {
        if (req.body.username) {
            user = req.body.username;
        } else {
            user = req.session.user.username;
        }
        ChatHistory = getUserdata(user, "history");
        if (ChatHistory == null) {
            ChatHistory = [];
        }
        res.status(200).send(ChatHistory);
    }
    else {
        res.status(401).send("Unauthorized");
    }

});

app.post('/add-to-history', (req, res) => {
    token = req.headers['authorization'];
    if (token == compute_token) {
        username = req.body.user;
        fullmsg = req.body.msg;

        Jsonmsg = {
            "role": "assistant",
            "content": fullmsg
        }

        ChatHistory = getUserdata(username, "history");
        if (ChatHistory == null) {
            ChatHistory = [];
        }
        ChatHistory.push(Jsonmsg);

        addUserdata(username, "history", ChatHistory);

        res.status(200).send("History updated");
    }
    else {
        res.send("Unauthorized");
    }

});

app.post('/delete-history', (req, res) => {
    if (checkUser(req.session.user)) {
        if (getSetting("chatEnabled")) {
            addUserdata(req.session.user.username, "history", []);
            console.log("History deleted");
            res.status(200).send("History deleted");
        } else {
            res.send("Chat is disabled");
        }

    }
    else {
        res.send("Unauthorized");
    }

});

app.post('/chat-msg-endpoint', (req, res) => {
    token = req.headers['authorization'];
    if (token == compute_token) {
        msg = req.body.msg;
        end = req.body.end;
        user = req.body.user;
        console.log(msg);
        sendChatUpdateToClient(user, msg, end);
        res.status(200).send("Chat message sent");
    }
    else {
        res.send("Unauthorized");
    }

});

app.get('/sd', (req, res) => {
    if (checkUser(req.session.user)) {
        lastrequest = getUserdata(req.session.user.username, "lastrequest")
        if (lastrequest != null) {
            proprompt = lastrequest.prompt;
            negprompt = lastrequest.negprompt;
        }
        else {
            proprompt = null;
            negprompt = null;

        }

        lastimg = getUserdata(req.session.user.username, "lastimg")
        if (lastimg == null) {
            lastimg = "images/stable_diffusion_logo.png";
        } else {
            lastimg = "uploads/" + lastimg;
        }

        res.render("sd.ejs", { username: req.session.user.username, prompt: proprompt, negprompt: negprompt, lastimg: lastimg, instant: getUserdata(req.session.user.username, "instant") });
    }
    else {
        res.redirect('/');
    }

});

app.post('/sd-submit', (req, res) => {
    if (checkUser(req.session.user)) {
        const prompt = req.body.prompt;
        const negprompt = req.body.negprompt;
        const user = req.session.user.username;
        const model = req.body['model-names'];
        console.log(req.body);
        console.log(prompt, negprompt, user, model);
        requeststack.push({ "function": "generate_img", "arguments": { prompt: prompt, negprompt: negprompt, model: model, user: user } });
        addUserdata(user, "lastrequest", { prompt: prompt, negprompt: negprompt });
        res.redirect('/sd');
    }
});

app.get('/compute-endpoint', (req, res) => {
    token = req.headers['authorization'];
    type = req.headers['type'];
    if (token == compute_token) {
        if (type == "request") {
            if (requeststack.length == 0) {
                res.send(null);
            }
            else {
                prompt = requeststack.pop();
                res.send(prompt);
            }
        } else {
            res.status(400).send('Unsupported type');
        }
    }
    else {
        res.send("Unauthorized");
    }

});

var nextdel = null;

app.post('/compute-endpoint', upload.single('file'), async (req, res) => {
    const token = req.headers['authorization'];
    const type = req.headers['type'];
    if (token == compute_token) {
        if (type == "image") {
            user = req.headers['user'];
            try {
                const image = await Jimp.read(req.file.path);
                await image.writeAsync(req.file.path);
                res.status(201).send('Image uploaded and processed successfully')
                console.log("Image processed");
                sendImageUpdateToClient(user, req.file.originalname);
                if (nextdel != null) {
                    fs.unlink(nextdel, (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                    });
                };
                if (req.headers['temp'] === "true") {
                    nextdel = req.file.path;
                }
                else {
                    nextdel = null;
                }
            } catch (error) {
                console.log(error)
                res.status(400).send(error.message)
            }
        } else {
            res.status(400).send('Unsupported type');
        }
    }
    else {
        res.status(401).send("Unauthorized");
    }
});


const SDclients = new Map();

app.get('/sd-events', function (req, res) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);

    const username = req.session.user.username;
    const newClient = {
        id: username,
        res
    };

    SDclients.set(username, newClient);

    req.on('close', () => {
        SDclients.delete(username);
    });
});

app.post('/setInstant', (req, res) => {
    if (checkUser(req.session.user)) {
        const instant = req.body.state;
        addUserdata(req.session.user.username, "instant", instant);
        res.status(200).send("Instant set");
    }

});

app.post('/instant-prompt', (req, res) => {
    if (checkUser(req.session.user)) {
        const prompt = req.body.prompt;
        const negprompt = req.body.negprompt;
        const user = req.session.user.username;
        console.log(prompt, negprompt, user);
        addUserdata(user, "lastrequest", { prompt: prompt, negprompt: negprompt });
        requeststack.push({ "function": "generate_img", "arguments": { prompt: prompt, negprompt: negprompt, model: "sd_xl_turbo_1.0_fp16", user: user } });
        res.status(200).send("Prompt set");
    }

});

app.post('/userDataUpdate', (req, res) => {
    const token = req.headers['authorization'];
    if (token == compute_token) {
        global.userdata = req.body;
        console.log("Userdata updated");
        res.status(200).send("Userdata updated");
    } else {
        res.status(401).send("Unauthorized");
    }

});

app.post('/chat-setModel', (req, res) => {
    if (checkUser(req.session.user)) {
        if (checkAdmin(req.session.user.username)) {
            const model = req.body.model;
            setSetting("model", model);
            requeststack.push({ "function": "chatsetModel", "arguments": { model: model } });
            res.status(200).send("Model set");
        }
    }

});

app.post('/sync-keys', (req, res) => {
    const token = req.headers['authorization'];
    if (token == compute_token) {
        global.keyfile = req.body;
        global.keysynced = true;
        console.log("Keys synced");
        res.status(200).send("Keys synced");
    }
    else {
        res.status(401).send("Unauthorized");
    }

});

app.post('/sync-settings', (req, res) => {
    const token = req.headers['authorization'];
    if (token == compute_token) {
        global.settings = req.body;
        console.log("Settings synced");
        res.status(200).send("Settings synced");
    }
    else {
        res.status(401).send("Unauthorized");
    }

});

function sendChatUpdateToClient(username, msg, end) {
    const client = Chatclients.get(username);
    if (client) {

        client.res.write(`data: ${JSON.stringify({ msg, end })}\n\n`);
    }
}

function addUserdata(user, key, data) {
    if (!global.userdata[user]) {
        global.userdata[user] = {};
    }
    global.userdata[user][key] = data;
    requeststack.push({ "function": "setUserdata", "arguments": { user: user, key: key, value: data } });
}

function getUserdata(user, key) {
    if (global.userdata[user] && global.userdata[user][key]) {
        return global.userdata[user][key];
    } else {
        return null;
    }
}

function sendImageUpdateToClient(username, imagepath) {
    const client = SDclients.get(username);
    if (client) {
        client.res.write(`data: ${JSON.stringify({ imagepath })}\n\n`);
        client.lastimg = imagepath;
        addUserdata(username, "lastimg", imagepath);
    }
}

function checkUser(user) {
    if (!user) {
        return false;
    }
    return validate_password(user.username, user.password);
}

function setSetting(setting, value) {
    global.settings[setting] = value;
    requeststack.push({ "function": "setSetting", "arguments": { setting: setting, value: value } });
}

function getSetting(setting) {
    return global.settings[setting];
}

function checkAdmin(username) {
    return global.keyfile[username]["admin"] == true;
}

function validate_password(username, key) {
    if (global.keysynced == true) {
        if (!global.keyfile[username]["password"]) {
            return false;
        }
        else {
            return keyfile[username]["password"] == key;
        }
    } else {
        return false;
    }
}

function stopChat() {
    requeststack.push({ "function": "stopChat", "arguments": "{}" });
}

requeststack.push({ "function": "getKeys", "arguments": "{}" });
requeststack.push({ "function": "getSettings", "arguments": "{}" });
requeststack.push({ "function": "updateUserData", "arguments": "{}" });

const server = http.createServer(app);

const peerServerOptions = {
    debug: true,
    allow_discovery: true,
    path: '/p2pserver',
    proxied: true
};

const peerServer = ExpressPeerServer(server, peerServerOptions);
app.use(peerServer);


server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
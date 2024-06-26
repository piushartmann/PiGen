const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session')
const multer = require('multer');
const Jimp = require('jimp');
const ExpressPeerServer = require("peer").ExpressPeerServer;
const http = require("http");
const cors = require('cors');
const { isStringObject } = require('util/types');
const Mongo = require('./MongoConnector.js').MongoDB;

const app = express();

app.use(cors());

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
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

userdata = {};
settings = {};
p2pclientsWaiting = [];
const db = new Mongo();

var requeststack = [];

const compute_token = process.env.COMPUTE_TOKEN;

console.log("Starting");

app.get('/', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.render("home.ejs", { username: req.session.user.username, admin: await db.checkAdmin(req.session.user.username) });
        return;
    }
    else {
        res.render("login.ejs");
        return;
    }
});


app.post('/login', async (req, res) => {
    const user = req.body.username;
    const password = req.body.password;

    validation = await db.validate_password(user, password);
    if (isStringObject(validation)) {
        res.send(validation);
        return;
    }

    if (validation == true) {
        req.session.user = { username: user, password: password };
        res.redirect('/');
        return;
    }
    else {
        res.redirect('/');
        return;
    }
});

app.get('/logout', async (req, res) => {
    req.session.user = null;
    res.redirect('/');
    return;
});

app.get('/profile', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.render("profile.ejs", { username: req.session.user.username });
        return;
    }
    else {
        res.redirect('/');
        return;
    }
});

app.post('/change-profile', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        const user = req.session.user.username;
        const password = req.body.oldpassword;
        const newpassword = req.body.newpassword;

        if (await db.validate_password(user, password)) {
            await db.createUser(user, newpassword, await db.getUserAdmin(user));
            res.render("redirect.ejs", { redirect: '/profile', time: 1000, text: "Successfully changed Password!", type:"success"});
            return;
        }
        else {
            res.render("redirect.ejs", { redirect: '/profile', time: 1000, text: "Incorrect old password", type:"error"});
        }
    }
    else {
        res.redirect('/');
        return;
    }
});

app.get('/settings', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            res.render("settings.ejs", { chatEnabled: await db.getSetting("chatEnabled"), model: await db.getSetting("model") });
            return;
        }
        else {
            res.send("You do not have the required permissions to access this page.");
            return;
        }
    }
    else {
        res.redirect('/');
        return;
    }

});

app.get('/newUser', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
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

app.get('/settings/:user', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            user = req.params.user;
            if (user == "admin") {
                res.send("You cannot change the Admin");
                return;
            }
            if (await db.userExists(user)) {
                res.render("userSettings.ejs", { userdata: userdata, user: user, password: await db.getUserPassword(user), admin: await db.getUserAdmin(user) });
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

app.post('/createUser', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            const username = req.body.username;
            if (username == "admin") {
                res.send("You cannot change the Admin");
                return;
            }
            referer = req.headers.referer
            oldName = referer.split("/").pop();
            newUser = !referer.includes("settings");
            if (!newUser && oldName != username) {
                console.log("Renaming user from " + oldName + " to " + username);
            }
            else {
                oldName = null;
                console.log("Creating user " + username);
            }

            const password = req.body.password;
            const admin = req.body.admin == "on";
            await db.createUser(username, password, admin);
            if (!newUser && oldName != username) {
                await db.deleteUser(oldName);
            }
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

app.post('/deleteUser', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
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
            await db.deleteUser(username);
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }
});


app.get('/getUser', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            res.send(await db.listUsers());
        }
        else {
            res.send("You do not have the required permissions to access this page.");
        }
    }
    else {
        res.redirect('/');
    }

});

app.post('/set-chat', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            await db.setSetting("chatEnabled", req.body.chatEnabled);
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

app.get('/secure', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.render("secure.ejs", { username: req.session.user.username, mydebug: global.debug });
    }
    else {
        res.redirect('/');
    }
});

app.get('/getUserName', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.send({ username: req.session.user.username });
    }
    else {
        res.redirect('/');
    }
});

app.get('/builder', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.render("builder.ejs", { username: req.session.user.username });
    }
    else {
        res.redirect('/');
    }
});


app.get('/chat', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
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
app.post('/chat-msg', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
            msg = {
                "role": "user",
                "content": req.body.msg
            }

            //ChatHistory = await db.getUserData(req.session.user.username, "history");
            //if (ChatHistory == null) {
            //    ChatHistory = [];
            //}
            //ChatHistory.push(msg);
//
            //await db.setUserData(req.session.user.username, "history", ChatHistory);

            //console.log(ChatHistory);

            makeRequestToLocal({ "function": "chatMsg", "arguments": { msg: req.body.msg, username: req.session.user.username } });

            console.log("Chat msg requested");
            res.status(200);
        } else {
            res.send("Chat is disabled");
        }
    }

});

const Chatclients = new Map();

app.get('/chat-events', function async(req, res) {
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

app.post('/stop-chat', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        stopChat();
    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/edit-message', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            newmsg = req.body.message;
            ChatHistory = await db.getUserData(user, "history");
            if (ChatHistory == null) {
                return;
            }
            ChatHistory[index].content = newmsg;
            ChatHistory = ChatHistory.slice(0, index);
            await db.setUserData(user, "history", ChatHistory);

            makeRequestToLocal({ "function": "chatMsg", "arguments": { msg: ChatHistory, username: req.session.user.username } });
            res.status(200).send("Message edited");
        } else {
            res.send("Chat is disabled");
        }

    }
});

app.post('/delete-message', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            ChatHistory = await db.getUserData(user, "history");
            if (ChatHistory == null) {
                return;
            }
            ChatHistory.splice(index, 1);
            await db.setUserData(user, "history", ChatHistory);
            res.status(200).send("Message removed");
        } else {
            res.send("Chat is disabled");
        }

    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/regenerate-message', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
            user = req.session.user.username;
            index = req.body.index;
            ChatHistory = await db.getUserData(user, "history");
            if (ChatHistory == null) {
                return;
            }
            //delete every message after the one to be regenerated
            ChatHistory = ChatHistory.slice(0, index);
            await db.setUserData(user, "history", ChatHistory);

            makeRequestToLocal({ "function": "chatMsg", "arguments": { msg: ChatHistory, username: req.session.user.username } });
            res.status(200).send("Message removed");
        } else {
            res.send("Chat is disabled");
        }

    }
    else {
        res.send("Unauthorized");
    }
});

app.post('/load-conversation', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (req.body.username) {
            user = req.body.username;
        } else {
            user = req.session.user.username;
        }
        ChatHistory = await db.getUserData(user, "history");
        if (ChatHistory == null) {
            ChatHistory = [];
        }
        res.status(200).send(ChatHistory);
    }
    else {
        res.status(401).send("Unauthorized");
    }

});

app.post('/add-to-history', async (req, res) => {
    token = req.headers['authorization'];
    if (token == compute_token) {
        username = req.body.user;
        fullmsg = req.body.msg;

        Jsonmsg = {
            "role": "assistant",
            "content": fullmsg
        }

        ChatHistory = await db.getUserData(username, "history");
        if (ChatHistory == null) {
            ChatHistory = [];
        }
        ChatHistory.push(Jsonmsg);

        await db.setUserData(username, "history", ChatHistory);

        res.status(200).send("History updated");
    }
    else {
        res.send("Unauthorized");
    }

});

app.post('/delete-history', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.getSetting("chatEnabled")) {
            await db.setUserData(req.session.user.username, "history", []);
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
        bitsize = req.body.bitsize;
        command = req.body.command;
        console.log(msg);
        sendChatUpdateToClient(user, msg, end, bitsize, command);
        res.status(200).send("Chat message sent");
    }
    else {
        res.send("Unauthorized");
    }

});

app.get('/sd', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        lastrequest = await db.getUserData(req.session.user.username, "lastrequest")
        if (lastrequest != null) {
            proprompt = lastrequest.prompt;
            negprompt = lastrequest.negprompt;
        }
        else {
            proprompt = null;
            negprompt = null;

        }

        lastimg = await db.getUserData(req.session.user.username, "lastimg")
        if (lastimg == null) {
            lastimg = "images/stable_diffusion_logo.png";
        } else {
            lastimg = "uploads/" + lastimg;
        }

        res.render("sd.ejs", { username: req.session.user.username, prompt: proprompt, negprompt: negprompt, lastimg: lastimg, instant: await db.getUserData(req.session.user.username, "instant") });
    }
    else {
        res.redirect('/');
    }

});

app.post('/sd-submit', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        const prompt = req.body.prompt;
        const negprompt = req.body.negprompt;
        const user = req.session.user.username;
        const model = req.body['model-names'];
        console.log(req.body);
        console.log(prompt, negprompt, user, model);
        makeRequestToLocal({ "function": "generate_img", "arguments": { prompt: prompt, negprompt: negprompt, model: model, user: user } });
        await db.setUserData(user, "lastrequest", { prompt: prompt, negprompt: negprompt });
        res.redirect('/sd');
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
                await sendImageUpdateToClient(user, req.file.originalname);
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

app.get('/sd-events', function async(req, res) {
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

app.post('/setInstant', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        const instant = req.body.state;
        await db.setUserData(req.session.user.username, "instant", instant);
        res.status(200).send("Instant set to " + instant);
    }

});

app.post('/instant-prompt', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        const prompt = req.body.prompt;
        const negprompt = req.body.negprompt;
        const user = req.session.user.username;
        console.log(prompt, negprompt, user);
        await db.setUserData(user, "lastrequest", { prompt: prompt, negprompt: negprompt });
        makeRequestToLocal({ "function": "generate_img", "arguments": { prompt: prompt, negprompt: negprompt, model: "sd_xl_turbo_1.0_fp16", user: user } });
        res.status(200).send("Prompt set");
    }

});

app.post('/userDataUpdate', async (req, res) => {
    const token = req.headers['authorization'];
    if (token == compute_token) {
        global.userdata = req.body;
        console.log("Userdata updated");
        res.status(200).send("Userdata updated");
    } else {
        res.status(401).send("Unauthorized");
    }

});

app.post('/chat-setModel', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        if (await db.checkAdmin(req.session.user.username)) {
            const model = req.body.model;
            await db.setSetting("model", model);
            res.status(200).send("Model set");
        }
    }

});

app.get('/chat-getModel', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.send({ model: await db.getSetting("model") });
    }
});



app.post('/sync-keys', async (req, res) => {
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

app.post('/sync-settings', async (req, res) => {
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

app.post('/init', async (req, res) => {
    const token = req.headers['authorization'];
    if (token == compute_token) {
        global.debug = req.body.debug;
        console.log("Initialized");
        console.log(global.debug);
        res.status(200).send("Initialized");
    }
    else {
        res.status(401).send("Unauthorized");
    }
});


app.get('/getSockets', async (req, res) => {
    if (await db.checkUser(req.session.user)) {
        res.send(Object.keys(Socketclients));
    }
    else {
        res.send("Unauthorized");
    }
});


app.get('/healthCheck', async (req, res) => {
    res.status(200).send("OK");
});

app.get('/speedtest', async (req, res) => {
    res.status(200).send("OK");
});

async function getGif(tag) {
    const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=YvA91J6U5kt2iQgoNtIyVEiJ6T97iyQ7&tag=${tag}&rating=g`, {
        method: 'GET'
    })
    if (!response.ok) {
        console.log(response.statusText);
        return response;
    }
    const data = await response.json();
    return data.data.embed_url;
}

app.get('/gif/:tag', async (req, res) => {
    getGif(req.params.tag)
        .then((data) => {
            res.send(data);
        })

});

function sendChatUpdateToClient(username, msg, end, bitsize, command) {
    const client = Chatclients.get(username);
    if (client) {
        client.res.write(`data: ${JSON.stringify({ msg, end, bitsize, command })}\n\n`);
    }
}

async function sendImageUpdateToClient(username, imagepath) {
    const client = SDclients.get(username);
    if (client) {
        client.res.write(`data: ${JSON.stringify({ imagepath })}\n\n`);
        client.lastimg = imagepath;
        await db.setUserData(username, "lastimg", imagepath);
    }
}

function stopChat() {
    makeRequestToLocal({ "function": "stopChat", "arguments": "{}" });
}

const server = http.createServer(app);

const peerServerOptions = {
    allow_discovery: true,
    path: '/p2pserver',
    proxied: true,
};

const peerServer = ExpressPeerServer(server, peerServerOptions);
app.use(peerServer);

const { Server } = require("socket.io");
const { type } = require('os');
const io = new Server(server);
const backEndIO = io.of('/backend');
const secure = io.of('/secure');


server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

keepAlive = setInterval(() => {
    fetch('https://google.com')
}, 10000);

function generateID(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ""
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result
}

var Socketclients = {};
secure.on('connection', (socket) => {
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
        return;
    }
    base64 = cookies.split(';')[0].split('=')[1];
    const session = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    const username = session.user.username;

    console.log(username + ' connected');

    Socketclients[username] = socket;

    socket.on('disconnect', () => {
        console.log(username + " disconnected");
        delete Socketclients[username];
    });

    socket.on('chat message', (data) => {
        msg = data.message;
        room = data.id;
        socket.to(room).emit('chat message', msg);
        console.log('message: ' + msg + " to " + room);
    });

    socket.on('comm join', (user) => {
        if (user in Socketclients) {
            console.log("Comm join request from " + username + " to " + user);
            id = generateID(8);
            Socketclients[user].emit('comm join', { id: id, user: username });

            Socketclients[user].on('comm accept', function (accept) {
                console.log(accept)
                if (accept) {
                    Socketclients[user].join(id);
                    socket.join(id);
                    socket.emit('comm join', { id: id, user: username });
                }
            }.bind(this));
        }
    });

    socket.on('comm typing', (typing) => {
        console.log("Typing: " + typing);
        rooms = Array.from(socket.rooms);
        socket.to(rooms[1]).emit('comm typing', typing);
    });
});

//TODO: verify token
backEndIO.on('connection', (socket) => {
    console.log("Backend connected");
    global.backendConnected = true;
    makeRequestToLocal({ "function": "init", "arguments": "{}" });
    socket.on('backend', (data) => {
        if (data.auth != compute_token) {
            return;
        }
        console.log("Data from backEnd: " + data.msg);
    });
});

backEndIO.on('disconnect', () => {
    console.log("Backend disconnected");
    global.backendConnected = false;
});


function makeRequestToLocal(reqJson) {
    backEndIO.emit('backend', reqJson);
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session')
const multer = require('multer');
const Jimp = require('jimp');
const e = require('express');
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
    secret: 'pius',
    resave: false,
    saveUninitialized: false
  }));


keyfile = null;
keysynced = false;
userdata = {};

console.log("Starting");

var requeststack = [];
const compute_token = "testtoken";

app.get('/', (req, res) => {
    if (req.session.views) {
      req.session.views++
    } else {
      req.session.views = 1
    }
    if (req.session.user) {
        res.redirect('/home');
        return;
    }
    else {
        res.render("login.ejs", {views: req.session.views});
        return;
    }
  });


app.post('/login', (req, res) => {
    const user = req.body.username;
    const password = req.body.password;

    if (validate_password(user, password)) {
        req.session.user = {username: user, password: password};
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
    if (req.session.user) {
        res.render("home.ejs", {username: req.session.user.username});
    }
    else {
        res.redirect('/');
    }

});

app.get('/sd', (req, res) => {
    if (req.session.user) {
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

        res.render("sd.ejs", {username: req.session.user.username, prompt: proprompt, negprompt: negprompt, lastimg: lastimg});
    }
    else {
        res.redirect('/');
    }

});

app.post('/sd-submit', (req, res) => {
    if (req.session.user) {
        const prompt = req.body.prompt;
        const negprompt = req.body.negprompt;
        const user = req.session.user.username;
        requeststack.push({"function":"generate_img", "arguments": {prompt: prompt, negprompt: negprompt, user: user}});
        addUserdata(user, "lastrequest", {prompt: prompt, negprompt: negprompt});
        res.redirect('/sd');
    }
});

app.get('/compute-endpoint', (req, res) => {
    token = req.headers['authorization'];
    type = req.headers['type'];
    if(token == "testtoken"){
        if(type == "request"){
            if(requeststack.length == 0){
                res.send(null);
            }
            else{
                prompt = requeststack.pop();
                res.send(prompt);
            }
        } else {
            res.status(400).send('Unsupported type');
        }
    }
    else{
        res.send("Unauthorized");
    }

    });

var nextdel = null;

app.post('/compute-endpoint', upload.single('file'), async (req, res) => {
    const token = req.headers['authorization'];
    const type = req.headers['type'];
    if(token == compute_token){
        if(type == "image"){
            user = req.headers['user'];
            try {
                // Use a different image processing library instead of Sharp
                // For example, you can try using Jimp
                const image = await Jimp.read(req.file.path);
                await image.writeAsync(req.file.path);
                res.status(201).send('Image uploaded and processed successfully')
                console.log("Image processed");
                //console.log(nextdel)
                sendImageUpdateToClient(user, req.file.originalname);
                if(nextdel != null){
                    //console.log("Deleting " + nextdel);
                    fs.unlink(nextdel, (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                    });
                }
                //console.log(req.headers['temp']);
                if(req.headers['temp'] === "true"){
                    nextdel = req.file.path;
                }
                else{
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
    else{
        res.status(401).send("Unauthorized");
    }
});
    

const clients = new Map();

app.get('/sd-events', function(req, res) {
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

    clients.set(username, newClient);

    req.on('close', () => {
        clients.delete(username);
    });
});

app.post('/sync-keys', (req, res) => {
    const token = req.headers['authorization'];
    if(token == compute_token) {
        global.keyfile = req.body;
        global.keysynced = true;
        console.log("Keys synced");
        res.status(200).send("Keys synced");
    }
    else{
        res.status(401).send("Unauthorized");
    }

});

app.post('/setModel', (req, res) => {
    if (req.session.user) {
        const model = req.body.option;
        requeststack.push({"function":"setModel", "arguments": {model: model}});
        res.status(200).send("Model set");
    }

});

app.post('/userDataUpdate', (req, res) => {
    const token = req.headers['authorization'];
    if(token == compute_token) {
        global.userdata = req.body;
        console.log("Userdata updated");
        res.status(200).send("Userdata updated");
    }else{
        res.status(401).send("Unauthorized");
    }
    
});

function addUserdata(user, key, data) {
    if (!global.userdata[user]) {
        global.userdata[user] = {};
    }
    global.userdata[user][key] = data;
    requeststack.push({"function":"setUserdata", "arguments": {user: user, key: key, value: data}});
}

function getUserdata(user, key) {
    if (global.userdata[user] && global.userdata[user][key]){
        return global.userdata[user][key];
    }else{
        return null;
    }
}

function sendImageUpdateToClient(username, imagepath) {
    const client = clients.get(username);
    if (client) {
        client.res.write(`data: ${JSON.stringify({ imagepath })}\n\n`);
        client.lastimg = imagepath;
        addUserdata(username, "lastimg", imagepath);
    }
}

function validate_password(username, key) {
    if (global.keysynced == true) {
        if (!global.keyfile[username]) {
            return false;
        }
        else {
            return keyfile[username] == key;
        }
    } else {
        return false;
    }
}

requeststack.push({"function":"getKeys", "arguments": "{}"});
requeststack.push({"function":"updateUserData", "arguments": "{}"});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session')
const multer = require('multer');
const { url } = require('inspector');
const { Console } = require('console');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const app = express();

if (fs.existsSync('/etc/secrets/keys.json'))
{
    const keyfile = JSON.parse(fs.readFileSync('/etc/secrets/keys.json', 'utf8'));
    global.keyfile = keyfile;
    global.baseurl = "https://superladens.onrender.com/"
}
else
{
    const keyfile = JSON.parse(fs.readFileSync('./testkeys.json', 'utf8'));
    global.keyfile = keyfile;
    global.baseurl = "https://superladens.onrender.com/"
}

console.log("Starting");

var sdrequeststack = [];

//app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.set('view engine', 'ejs')
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: 'pius',
    resave: false,
    saveUninitialized: false
  }));

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
        if(req.session.lastrequest == null){
            var prompt = "";
            var negprompt = "";
        }
        else{
            var prompt = req.session.lastrequest.prompt;
            var negprompt = req.session.lastrequest.negprompt;
        }
        res.render("sd.ejs", {username: req.session.user.username, prompt: prompt, negprompt: negprompt});
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
        sdrequeststack.push({prompt: prompt, negprompt: negprompt, user: user});
        req.session.lastrequest = {prompt: prompt, negprompt: negprompt};
        res.redirect('/sd');
    }
});

app.get('/compute-endpoint', (req, res) => {
    token = req.headers['authorization'];
    type = req.headers['type'];
    if(token == "testtoken"){
        if(type == "request"){
            if(sdrequeststack.length == 0){
                res.send(null);
            }
            else{
                prompt = sdrequeststack.pop();
                console.log(prompt);
                res.send(prompt);
            }
        }else if(type == "image"){
            user = req.headers['user'];
            var image = request.body
            //a function which gemerates a unique name for the image with the user name at the front like user-sjhdgafkjsg with at least 10 characters
            var imagepath = "images/" + user + "-" + Math.random().toString(36).substring(7) + ".jpg";

            fs.writeFile(imagepath, image, function(err){
                if (err) throw err
                    console.log('File saved.');
                      });
            res.send(null);
        }
    }
    else{
        res.send("Unauthorized");
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

function sendImageUpdateToClient(username, imagepath) {
    const client = clients.get(username);
    if (client) {
        client.res.write(`data: ${JSON.stringify({ imagepath })}\n\n`);
    }
}

function validate_password(username, key) {
    if (!keyfile[username]) {
        return false;
    }
    else {
        return keyfile[username] == key;
    }
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
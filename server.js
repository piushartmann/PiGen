const express = require('express');
const path = require('path');
const fs = require('fs');
var crypto = require('crypto');
const cookieParser = require('cookie-parser');
const session = require('cookie-session')
const app = express();

if (fs.existsSync('/etc/secrets/keys.json'))
{
    const keyfile = JSON.parse(fs.readFileSync('/etc/secrets/keys.json', 'utf8'));
    global.keyfile = keyfile;
}
else
{
    const keyfile = JSON.parse(fs.readFileSync('./testkeys.json', 'utf8'));
    global.keyfile = keyfile;
}

console.log("Starting");

//app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs')
app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'pius',
    resave: false,
    saveUninitialized: false
  }));

app.get('/cookies', (req, res) => {
    if (Object.keys(req.cookies).length > 0) {
        res.send('You have cookies!');
        console.log(req.cookies);
    } else {
        res.send('You have no cookies.');
        console.log(req.cookies);
    }
});

app.get('/', (req, res) => {
    if (req.session.views) {
      req.session.views++
    } else {
      req.session.views = 1
    }
    if (req.session.user) {
        res.redirect('/upscale');
        return;
    }
    else {
        res.render("index.ejs", {views: req.session.views});
        return;
    }
  });


app.post('/login', (req, res) => {
    const user = req.body.username;
    const password = req.body.password;

    if (validate_password(user, password)) {
        req.session.user = {username: user, password: password};
        res.redirect('/upscale');
    }
    else {
        res.redirect('/');
    }
});

app.post('/logout', (req, res) => {
    req.session.user = null;
    res.redirect('/');
});

app.get('/upscale', (req, res) => {
    if (req.session.user) {
        res.render("content.ejs", {username: req.session.user.username});
    }
    else {
        res.redirect('/');
    }

});

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
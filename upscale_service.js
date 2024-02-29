const express = require('express');
const path = require('path');
const fs = require('fs');
var crypto = require('crypto');
const cookieParser = require('cookie-parser');
const session = require('express-session')
const app = express();

if (fs.existsSync('/etc/secrets/keys.json'))
{
    const keyfile = JSON.parse(fs.readFileSync('/etc/secrets/keys.json', 'utf8'));
    global.keyfile = keyfile;
}
else
{
    const keyfile = JSON.parse(fs.readFileSync('./keys.json', 'utf8'));
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
    res.render("index.ejs", {views: req.session.views});
    return;
  });


app.post('/login', (req, res) => {
    const user = req.body.username;
    const password = req.body.password;

    if (validate_password(user, password)) {
        res.cookie("id", makeID(user, password), {maxAge: 900000, httpOnly: true});
        res.sendFile(path.join(__dirname, 'private', 'content.html'));
    } else {
        res.redirect('not-allowed.html');
    }
});

function makeID(user, password) {
    var hash = crypto.createHash('sha256').update(user+password).digest('hex');
    return hash
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
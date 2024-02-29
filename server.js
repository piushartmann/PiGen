const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('cookie-session')
const multer = require('multer');
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

app.get('/upscale', (req, res) => {
    var img = req.session.img;
    if (req.session.user) {
        if (img) {
            res.render("upscale.ejs", { file: img });
        }
        else {
            res.render("upscale.ejs", { file: null });
        }
    }
    else {
        res.redirect('/');
    }

});

app.post('/upscale_upload', (req, res) => {
    if (req.session.user) {
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, 'public/uploads');
            },
            filename: function (req, file, cb) {
                const randomString = Math.random().toString(36).substring(7);
                const originalFilename = file.originalname;
                const fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                const newFilename = randomString + fileExtension;
                cb(null, newFilename);
            }
        });

        const upload = multer({ storage: storage }).single('image');

        upload(req, res, function (err) {
            if (err) {
                // Handle error
                return;
            }
            // File uploaded successfully
            req.session.img = req.file.filename;
            res.redirect('/upscale')
        });
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
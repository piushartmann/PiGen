const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

//const keyfile = JSON.parse(fs.readFileSync('./keys.json', 'utf8'));

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


app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.post('/login', (req, res) => {
    const password = req.body.password;
    const correctPassword = process.env.password;

    if (password === correctPassword) {
        res.sendFile(path.join(__dirname, 'private', 'content.html'));
    } else {
        res.redirect('not-allowed.html');
    }
});

app.get('/testkeyfile', (req, res) => {
    res.send(keyfile);
});


function validate_api_key(username, key) {
    return keyfile[username] == key;
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
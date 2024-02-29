const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get('/login', (req, res) => {
    res.redirect('/');
});

app.post('/login', (req, res) => {
    const password = req.body.password;
    const correctPassword = process.env.password;

    if (password === correctPassword) {
        res.sendFile(path.join(__dirname, 'private', 'content.html'));
    } else {
        res.redirect('not-allowed.html');
    }
});

const keyfile = JSON.parse(fs.readFileSync('keys.json', 'utf8'));


function validate_api_key(username, key) {
    return keyfile[username] == key;
}



app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
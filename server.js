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

app.get('/upscale-start', (req, res) => {
    var img = req.session.img;
    if (req.session.user) {
        upscaleRequest(img);
    }
    else {
        res.redirect('/');
    }

});

function upscaleRequest(img) {
    var imgurl = baseurl + "uploads/" + img;
    console.log(imgurl);
    var body = {
        "version": "1302b550b4f7681da87ed0e405016d443fe1fafd64dabce6673401855a5039b5",
        "input": {
          "image": imgurl,
          "s_cfg": 7.5,
          "s_churn": 5,
          "s_noise": 1.003,
          "upscale": 1,
          "a_prompt": "Cinematic, High Contrast, highly detailed, taken using a Canon EOS R camera, hyper detailed photo - realistic maximum detail, 32k, Color Grading, ultra HD, extreme meticulous detailing, skin pore detailing, hyper sharpness, perfect without deformations.",
          "min_size": 1024,
          "n_prompt": "painting, oil painting, illustration, drawing, art, sketch, oil painting, cartoon, CG Style, 3D render, unreal engine, blurring, dirty, messy, worst quality, low quality, frames, watermark, signature, jpeg artifacts, deformed, lowres, over-smooth",
          "s_stage1": -1,
          "s_stage2": 1,
          "edm_steps": 50,
          "use_llava": true,
          "linear_CFG": false,
          "model_name": "SUPIR-v0Q",
          "color_fix_type": "Wavelet",
          "spt_linear_CFG": 1,
          "linear_s_stage2": false,
          "spt_linear_s_stage2": 0
        }
      }
    const Http = new XMLHttpRequest();
    const requrl='https://api.replicate.com/v1/predictions';
    Http.responseType = 'json';
    Http.open("POST", requrl);
    Http.setRequestHeader("Authorization", "Token r8_XrHhWVWFDqQGhWZLnHV8RC743kCfhBt2xvObE")
    Http.send(JSON.stringify(body));
    
    Http.onreadystatechange = function() {
        if (this.readyState === 4) {
            console.log("Response status code:", Http.status);
            console.log("Response body:", Http.response);
        }
    };
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

app.post('/sd_upload', (req, res) => {
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
            res.redirect('/sd')
        });
    }
});
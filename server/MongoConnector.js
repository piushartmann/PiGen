module.exports.MongoDB = class MongoDB {
    constructor() {
        this.mongoose = require('mongoose');
        const Schema = this.mongoose.Schema;

        const userDataSchema = new Schema({
            key: { type: String, required: true },
            value: { type: Object, required: true }
        });

        const userSchema = new Schema({
            username: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            admin: { type: Boolean, required: true },
            userData: [userDataSchema]
        });

        this.user = this.mongoose.model('User', userSchema);

        const settingsSchema = new Schema({
            settingName: { type: String, required: true },
            settingValue: { type: String, required: true }
        });

        this.setting = this.mongoose.model('Setting', settingsSchema);

        const uri = process.env.MONGODB_URI;


        this.mongoose.connect(uri)
            .then(() => console.log('MongoDB connection successful'))
            .catch(err => console.error('MongoDB connection error:', err));
    }

    async checkAdmin(username) {
        const user = await this.user.findOne({ username: username });
        return user ? user.admin : false;
    }

    async checkUser(user) {
        if (!user) {
            return false;
        }
        const dbUser = await this.user.findOne({ username: user.username });
        if (!dbUser) {
            return false;
        }
        return this.validate_password(user.username, user.password, false);
    }

    async userExists(username) {
        const user = await this.user.findOne({ username: username });
        return user != null;
    }

    async getUserPassword(username) {
        const user = await this.user.findOne({ username: username });
        return user ? user.password : null;
    }

    async getUserAdmin(username) {
        const user = await this.user.findOne({ username: username });
        return user ? user.admin : false;
    }

    async deleteUser(username) {
        await this.user.deleteOne({ username: username });
    }

    async createUser(username, password, admin) {
        const hashedPassword = this.hashPassword(password);
        const existingUser = await this.user.findOne({ username: username });
        if (existingUser) {
            existingUser.password = hashedPassword;
            existingUser.admin = admin;
            await existingUser.save();
        } else {
            const newUser = new this.user({ username, password: hashedPassword, admin });
            await newUser.save();
        }
    }

    async listUsers() {
        return await this.user.find({}, 'username -_id').then(users => users.map(user => user.username));
    }

    async validate_password(username, key, log = true) {
        const hashedPassword = this.hashPassword(key);
        const password = await this.getUserPassword(username);
        if (password) {
            if (password == hashedPassword) {
                if (log)
                    console.log("MongoConnector: User '" + username + "' is authenticated.");
                return true;
            }
            else {
                if (log)
                    console.log("MongoConnector: Password is incorrect");
                return false;
            }
        }
        else {
            if (log)
                console.log("MongoConnector: User does not exist (name " + username + " Pass: " + hashedPassword + ")");
            return false;
        }
    }

    async setSetting(setting, value) {
        const existingSetting = await this.setting.findOne({ settingName: setting });
        if (existingSetting) {
            existingSetting.settingValue = value;
            await existingSetting.save();
        } else {
            const newSetting = new this.setting({ settingName: setting, settingValue: value });
            await newSetting.save();
        }
    }

    async getSetting(setting) {
        const foundSetting = await this.setting.findOne({ settingName: setting });
        return foundSetting ? foundSetting.settingValue : null;
    }



    async setUserData(username, key, value) {
        const user = await this.user.findOne({ username: username });
        if (!user) {
            const newUser = new this.user({ username: username });
            newUser.userData.push({ key: key, value: value });
            await newUser.save();
        } else {
            if (!user.userData) {
                user.userData = [];
            }
            const userData = user.userData.find(data => data.key === key);
            if (!userData) {
                user.userData.push({ key: key, value: value });
                await user.save();
            } else {
                userData.value = value;
                await user.save();
            }
        }
    }
    
    async getUserData(username, key) {
        const user = await this.user.findOne({ username: username });
        if (user.userData) {
            const userData = user.userData.find(data => data.key === key);
            return userData ? userData.value : null;
        }
        return null;
    }

    async checkConnection() {
        return this.mongoose.connection.readyState;
    }

    hashPassword(password) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(password);
        return hash.digest('hex');
    }
    
}
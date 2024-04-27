import pymongo
import os

class MongoDB:
    def __init__(self):
        
        uri = os.environ["MONGODB_URI"]
        self.client = pymongo.MongoClient(uri)
        print("MongoConnector: Connected to MongoDB")
        self.db = self.client["PiGen"]
        self.user_collection = self.db["users"]
        self.setting_collection = self.db["settings"]

    def check_admin(self, username):
        user = self.user_collection.find_one({"username": username})
        return user["admin"] if user else False

    def check_user(self, user):
        if not user:
            return False
        db_user = self.user_collection.find_one({"username": user["username"]})
        if not db_user:
            return False
        return self.validate_password(user["username"], user["password"], False)

    def user_exists(self, username):
        user = self.user_collection.find_one({"username": username})
        return user is not None

    def get_user_password(self, username):
        user = self.user_collection.find_one({"username": username})
        return user["password"] if user else None

    def get_user_admin(self, username):
        user = self.user_collection.find_one({"username": username})
        return user["admin"] if user else False

    def delete_user(self, username):
        self.user_collection.delete_one({"username": username})

    def create_user(self, username, password, admin):
        new_user = {"username": username, "password": password, "admin": admin}
        self.user_collection.insert_one(new_user)

    def list_users(self):
        users = self.user_collection.find({}, {"username": 1, "_id": 0})
        return [user["username"] for user in users]

    def validate_password(self, username, key, log=True):
        password = self.get_user_password(username)
        if password:
            if password == key:
                if log:
                    print(f"MongoConnector: User '{username}' is authenticated.")
                return True
            else:
                if log:
                    print("MongoConnector: Password is incorrect")
                return f"Invalid password (name {username} Pass: {key})"
        else:
            if log:
                print(f"MongoConnector: User does not exist (name {username} Pass: {key})")
            return "This User does not exist."

    def set_setting(self, setting, value):
        existing_setting = self.setting_collection.find_one({"settingName": setting})
        if existing_setting:
            existing_setting["settingValue"] = value
            self.setting_collection.update_one({"_id": existing_setting["_id"]}, {"$set": existing_setting})
        else:
            new_setting = {"settingName": setting, "settingValue": value}
            self.setting_collection.insert_one(new_setting)

    def get_setting(self, setting):
        found_setting = self.setting_collection.find_one({"settingName": setting})
        return found_setting["settingValue"] if found_setting else None

    def set_user_data(self, username, key, value):
        user = self.user_collection.find_one({"username": username})
        if not user:
            new_user = {"username": username, "userData": [{"key": key, "value": value}]}
            self.user_collection.insert_one(new_user)
        else:
            user_data = next((data for data in user["userData"] if data["key"] == key), None)
            if not user_data:
                user["userData"].append({"key": key, "value": value})
                self.user_collection.update_one({"_id": user["_id"]}, {"$set": user})
            else:
                user_data["value"] = value
                self.user_collection.update_one({"_id": user["_id"], "userData.key": key}, {"$set": {"userData.$": user_data}})

    def get_user_data(self, username, key):
        user = self.user_collection.find_one({"username": username})
        if user:
            user_data = next((data for data in user["userData"] if data["key"] == key), None)
            return user_data["value"] if user_data else None
        return None
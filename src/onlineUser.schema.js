import mongoose from "mongoose";
import { type } from "os";

const onlineUserSchema = new mongoose.Schema({
  user: { type: String, require: [true, "User is required"] },
  email: {
    type: String,
    unique: [true, "This email is already listed"],
    required: [true, "Email is required"],
  },
  room: { type: Number, required: [true, "Room number is required"] },
  profilePhoto: { type: String },
});

const onlineUserModel = mongoose.model("OnlineUser", onlineUserSchema);

export default onlineUserModel;

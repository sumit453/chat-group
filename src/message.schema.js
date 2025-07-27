import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  user: { type: String, required: [true, "User is required"] },
  room: { type: Number, required: [true, "Room number is required"] },
  email: { type: String },
  message: { type: String, required: [true, "Message is required"] },
  profilePhoto: { type: String },
  createAt: {
    type: Date,
    required: [true, "Message is required"],
    default: Date.now,
  },
});

const messageModel = mongoose.model("Message", messageSchema);

export default messageModel;

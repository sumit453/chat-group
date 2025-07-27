import "./env.js";
import express from "express";
import http from "http";
import path from "path";
import connectThroughMongoose from "./config/mongoose.config.js";
import { Server } from "socket.io";
import messageModel from "./src/message.schema.js";
import { ObjectId } from "mongodb";
import onlineUserModel from "./src/onlineUser.schema.js";
import uploadFile from "./src/middleware/fileupload.middleware.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", ["POST"]],
  },
});

io.on("connection", (socket) => {
  console.log("New connection is created", socket.id);

  let saveUserData;

  // join user listener
  socket.on("join", async (data) => {
    try {
      socket.user = data.user;
      socket.room = data.room;
      socket.email = data.email;

      // finding the user is already login or not
      const user = await onlineUserModel.findOne({
        email: data.email,
        user: data.user,
        room: data.room,
      });
      if (user) {
        socket.emit("userUpdate", { status: true });
        // emit welcome messege to user
        socket.emit("broadcast_message", {
          message: `Welcome to the server room ${user.room} ${user.user}`,
          profilePhoto: user.profilePhoto,
        });

        // emit user join notification to other users in the room
        socket.broadcast.to(data.room).emit("broadcast_message", {
          message: `<strong>${user.user}</strong> is joined`,
          profilePhoto: user.profilePhoto,
        });

        saveUserData = user;

        io.emit("online_user", user);

        // load all old data
        await messageModel
          .find({ room: data.room })
          .sort({ createAt: 1 })
          .limit(50)
          .then((message) => {
            socket.emit("load_message", message);
          });

        // user join to the room
        socket.join(data.room);
      } else {
        socket.emit("userUpdate", { status: false });
      }
    } catch (err) {
      console.error("Joining error is: ", err.message);
    }
  });

  socket.on("addPofilePic", async (data) => {
    // emit welcome messege to user
    socket.emit("broadcast_message", {
      message: `Welcome to the server room ${data.room} ${data.user}`,
      profilePhoto: data.profilePhoto,
    });

    // emit user join notification to other users in the room
    socket.broadcast.to(data.room).emit("broadcast_message", {
      message: `<strong>${data.user}</strong> is joined`,
      profilePhoto: data.profilePhoto,
    });

    // create a new user
    const newUser = new onlineUserModel({
      user: data.user,
      email: data.email,
      room: data.room,
      profilePhoto: data.profilePhoto,
    });

    const saveUser = await newUser.save();
    saveUserData = saveUser;
    io.emit("online_user", saveUser);

    // load all old data
    await messageModel
      .find({ room: data.room })
      .sort({ createAt: 1 })
      .limit(50)
      .then((message) => {
        socket.emit("load_message", message);
      });

    // user join to the room
    socket.join(data.room);
  });

  // delete account listener
  socket.on("delete_account", async (data) => {
    try {
      // delete the user
      await onlineUserModel.deleteOne({ _id: data.id });
      //delete all the message from the user
      await messageModel.deleteMany({
        user: data.user,
        room: data.room,
        email: data.email,
      });
      //leave the room
      socket.leave(data.room);

      io.emit("logout_user", data);
    } catch (err) {
      console.error("delete account error is: ", err.message);
    }
  });

  //logout user listener
  socket.on("logout", async (data) => {
    try {
      //leave the room
      socket.leave(data.room);

      io.emit("logout_user", data);
    } catch (err) {
      console.error("logout user error is: ", err.message);
    }
  });

  // delete message listener
  socket.on("delete", async (data) => {
    try {
      await messageModel.deleteOne({ _id: new ObjectId(data.id) });
      io.emit("delete_message", data);
    } catch (err) {
      console.error("Delete message error is: ", err.message);
    }
  });

  // user message listener for the server
  socket.on("user_message", async (data) => {
    try {
      const newMessage = new messageModel({
        message: data.message,
        user: data.user,
        room: data.room,
        profilePhoto: saveUserData.profilePhoto,
      });
      const saveMessage = await newMessage.save();
      // broadcast this recived message to the all users includeing user
      io.to(data.room).emit("broadcast_message", saveMessage);
    } catch (err) {
      console.error("Message broadcast error is: ", err.message);
    }
  });

  let typingUsers = {}; // Track typing users per room

  socket.on("typing", (data) => {
    //Add user to typing list
    if (!typingUsers[data.room]) {
      typingUsers[data.room] = {};
    }
    typingUsers[data.room][data.user] = true;

    // Broadcast to others in the room
    socket.broadcast
      .to(data.room)
      .emit("typing_update", { user: data.user, typing: true });
  });

  socket.on("stop_typing", (data) => {
    // Remove user from typing list
    if (typingUsers[data.room] && typingUsers[data.room][data.user]) {
      delete typingUsers[data.room][data.user];
    }

    // Broadcast to others in room
    socket.broadcast
      .to(data.room)
      .emit("typing_update", { user: data.user, typing: false });
  });

  socket.on("disconnect", async () => {
    try {
      //Remove user from typing list
      if (socket.user && socket.room) {
        if (typingUsers[socket.room] && typingUsers[socket.room][socket.user]) {
          delete typingUsers[socket.room][socket.user];
          socket.broadcast
            .to(socket.room)
            .emit("typing_update", { user: socket.user, typing: false });
        }
      }
      // Notify about disconnection
      io.to(socket.room).emit("broadcast_message", {
        message: `<strong>${socket.user}</strong> has logout`,
        profilePhoto: saveUserData.profilePhoto,
      });
      io.emit("logout_user", { id: saveUserData._id });
      console.log("Connection is disconected");
    } catch (err) {
      console.error("logout error is: ", err.message);
    }
  });
});

app.use(express.static(path.resolve("./public")));

app.get("/", uploadFile.single("profilePhoto"), (req, res) => {
  return res.status(200).sendFile(path.resolve("./public/client.html"));
});

server.listen(3000, () => {
  console.log("Server is listining on 3000");
  connectThroughMongoose();
});

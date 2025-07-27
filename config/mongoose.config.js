import mongoose from "mongoose";

const connectThroughMongoose = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Mongodb is connected using mongoose");
  } catch (err) {
    console.error("Mongoose connection error is: ", err.message);
  }
};

export default connectThroughMongoose;

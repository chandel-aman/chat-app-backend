const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const User = require("./user");

const messageSchema = new Schema({
  message: [
    {
      text: {
        type: String,
        required: true,
      },
      sender: {
        name: { type: String, required: true },
        phone: { type: Number, required: true },
      },
      tnd: {
        //tnd stands for time and date
        type: Date,
        required: true,
      },
      read: { status: { type: Boolean, required: true }, time: { type: Date } },
      reactions: [
        {
          reaction: { type: String },
          by: { type: Schema.Types.ObjectId, ref: "User" },
        },
      ],
    },
  ],
  updatedDate: { type: Date, required: true },
});

module.exports = mongoose.model("Message", messageSchema);

const mongoose = require("mongoose");
const Conversation = require("./conversation");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  test: {
    type: String,
  },
  username: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  contacts: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  chats: [
    {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
    },
  ],
  is2FA: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const Message = require("./message");
const User = require("./user");

const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  messages: {
    type: Schema.Types.ObjectId,
    ref: "Message",
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  creationDate: { type: Date, required: true },
  name: { type: String },
});

module.exports = mongoose.model("Conversation", conversationSchema);

const mongoose = require("mongoose");

const Joi = require("joi");

//logger
const logger = require("../utils/logger");

//models
const HttpError = require("../models/http-error");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const User = require("../models/user");

//messages validation schema
const messagesSchema = Joi.object({
  text: Joi.string().min(1).required(),
  participants: Joi.array().min(2).required(),
  name: Joi.string().min(2),
});

//function to get all the messages of a conversation
const getConversation = async (req, res, next) => {
  //extracting the conversation id from the params
  const conversationId = req.params.convId;

  //searching the database for the conversation
  let conversation;
  try {
    conversation = await Conversation.findById(conversationId)
      .populate("participants", "username phone")
      .populate("messages")
      .exec();
  } catch (error) {
    logger.error(error);
    return next(new HttpError("Something went wrong, please try again.", 500));
  }

  if (conversation) {
    res.status(200).json({ conversation });
  } else {
    res
      .status(404)
      .json({ message: `No conversation found with id ${conversationId}` });
  }
};

//function to create new conversation
const createConversation = async (req, res, next) => {
  //extracting the user id from the params
  const userId = req.params.userId;

  //finding the user
  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError(
        "Something went wrong in finding the user, please try again.",
        500
      )
    );
  }

  if (!user) {
    res.status(404).json({ message: `No user found with id ${userId}` });
  }

  //extracting from the request body
  const { message, participants } = req.body;

  //validating the data received via request body
  // const {error} = await messagesSchema.validateAsync({text: message.message.text, participants});
  // if(error){
  //   res.status(403).json({error: "Could not validate the user inputs."})
  // }

  let participantsId = [];
  try {
    for (const phone of participants) {
      const user = await User.findOne({ phone: phone });
      participantsId.push(user.id);
    }
  } catch (error) {
    logger.error(error);
  }

  /*
    name is for the group name and is not a required field
    *only for groups
  */
  //creating a new conversation
  const newConversation = new Conversation({
    messages: null,
    participants: participantsId,
    creationDate: new Date(),
  });

  //creating a new message
  const messages = new Message({
    message: [message.message],
    updatedDate: new Date(),
  });

  try {
    //creating a session
    const session = await mongoose.startSession();
    //starting the transaction
    session.startTransaction();

    //saving the conversation
    await newConversation.save({ session });

    //saving the conversation id to the user's chats array
    participantsId.forEach(async (participantId) => {
      const participant = await User.findById(participantId);
      participant.chats.push(newConversation._id);
      await participant.save({ session });
    });

    //saving the new message
    await messages.save({ session });

    //setting the value of messages property in conversation with the object id of messages
    newConversation.messages = messages._id;
    await newConversation.save({ session });

    // Populate the conversation with participants and messages data
    // await newConversation
    //   .populate("participants", "username phone")
    //   .populate("messages")
    //   .exec();

    //committing the transaction
    session.commitTransaction();

    //sending the response
    // return next(new HttpError("error", 500));
    res.status(201).json({
      newConversation: {
        _id: newConversation._id,
        participants: newConversation.participants,
      },
    });
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError("Something went wrong in creating a new conversation!", 500)
    );
  }
};

//function to add new messages
const addMessage = async (req, res) => {
  //extracting the conversation id from the params
  const conversationId = req.params.convId;

  //searching for the conversation
  let conversation;
  try {
    conversation = await Conversation.findById(conversationId)
      .populate("messages")
      .exec();
  } catch (error) {
    logger.error(error);
    return next(new HttpError("Something went wrong, please try again.", 500));
  }

  if (!conversation) {
    return next(
      new HttpError(
        `No conversation found for the provided id ${conversationId}`,
        404
      )
    );
  }

  /*
  If we found a conversation the proceed with ;adding new message to the existing conversation
  */
  //extracting the payload from the request body
  const { message } = req.body;

  //pushing teh new message to the message array of message collection via populated conversation collection
  try {
    conversation.messages.message.push(message);
    conversation.messages.updatedDate = new Date();
    await conversation.messages.save();
    res
      .status(201)
      .json({ message: "Message sent successfully", conversation });
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError("Something went wrong in adding new message!", 500)
    );
  }
};

//function to create a group

/*
we are getting the phone number of the participants for the new group in the request body
we are searching the phone number in users collection of our database to create a list of user ids for those users
then creating a new conversation with these users as the participants just like we did for createConversation function
*/
const createGroup = async (req, res) => {
  const { participants, name } = req.body;

  const newParticipants = participants.map((participant) =>
    parseInt(participant)
  );

  //finding the users with the phone numbers
  const users = await User.find({
    phone: { $in: newParticipants },
  }).select("_id");

  if (users.length !== newParticipants.length) {
    res
      .status(404)
      .json({ error: "No user found with the given phone number." });
  }

  //extracting the user id from the users array
  const participantsId = users.map((user) => user._id);

  //creating a new conversation
  const newConversation = new Conversation({
    messages: null,
    participants: participantsId,
    creationDate: new Date(),
    name,
  });

  //creating a new message
  const messages = new Message({
    message: [],
    updatedDate: new Date(),
  });

  try {
    //invoking the helper function to create a session and save the changes
    await createConversationHelper(newConversation, messages, participantsId);

    //sending the response
    res.status(201).json({
      newConversation: {
        _id: newConversation._id,
        participants: newConversation.participants,
      },
    });
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError("Something went wrong in creating a new conversation!", 500)
    );
  }
};

//helper function to create a new conversation or a group
const createConversationHelper = async (
  newConversation,
  messages,
  participantsId
) => {
  //creating a session
  const session = await mongoose.startSession();
  //starting the transaction
  session.startTransaction();

  //saving the conversation
  await newConversation.save({ session });

  //saving the conversation id to the user's chats array
  participantsId.forEach(async (participantId) => {
    const participant = await User.findById(participantId);
    participant.chats.push(newConversation._id);
    await participant.save({ session });
  });

  //saving the new message
  await messages.save({ session });

  //setting the value of messages property in conversation with the object id of messages
  newConversation.messages = messages._id;
  await newConversation.save({ session });

  //committing the transaction
  session.commitTransaction();
};

//adding reactions to a messages
const addReaction = async (req, res, next) => {
  //extracting for the params
  const conversationId = req.params.convId;

  //finding the conversation in the database using the conversation id
  let conversation;
  try {
    conversation = await Conversation.findById(conversationId)
      .populate("messages")
      .exec();
  } catch (error) {
    logger.error(error);
    return next(new HttpError("Something went wrong, please try again.", 500));
  }

  if (!conversation) {
    return next(
      new HttpError(
        `No conversation found for the provided id ${conversationId}`,
        404
      )
    );
  }

  /*
   If we found a conversation the proceed with adding new message to the existing conversation
   */

  //extracting the payload from the request body
  const { messageId, senderId, reaction } = req.body;

  //finding the text for which the reactions was send
  let index;
  conversation.messages.message.forEach((msg, i) => {
    if (msg._id.toString() === messageId) {
      index = i;
    }
  });

  if (!index) {
    return next(
      new HttpError(
        "Could not find the message for which the reaction was send.",
        404
      )
    );
  }

  //if there is already a reaction from the sender then don't add a new on but change the existing reacition with the new one
  const existingReaction = conversation.messages.message[index].reactions.some(
    (reaction) => reaction.by.toString() === senderId
  );
  //if there is no existing reaction
  let newReaction;
  if (!existingReaction) {
    newReaction = { reaction: reaction, by: senderId };
  }

  try {
    if (existingReaction) {
      conversation.messages.message[index].reactions.forEach((obj) => {
        if (obj.by.toString() === senderId) {
          Object.assign(obj, { reaction: reaction });
        }
      });
    } else {
      conversation.messages.message[index].reactions.push(newReaction);
    }
    conversation.messages.updatedDate = new Date();
    await conversation.messages.save();

    res.status(200).json({ message: "Reaction was added successfully." });
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError("Something went wrong in adding the reaction.", 500)
    );
  }
};

exports.getConversation = getConversation;
exports.createConversation = createConversation;
exports.addMessage = addMessage;
exports.createGroup = createGroup;
exports.addReaction = addReaction;

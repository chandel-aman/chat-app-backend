//mongoose
const { default: mongoose } = require("mongoose");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { joiPasswordExtendCore } = require("joi-password");
const joiPassword = Joi.extend(joiPasswordExtendCore);

//logger
const logger = require("../utils/logger");

//models
const User = require("../models/user");
const HttpError = require("../models/http-error");
const OTP = require("../models/OTP");

//utils
const { generateOTP, verifyOTP } = require("../utils/twoFactorAuth");
const sendEmail = require("../utils/nodemailer");

//sign-up validation schema for JOI
const registerSchema = Joi.object({
  username: Joi.string().min(3).required(),
  phone: Joi.number().min(1000000000).max(9999999999).required(),
  email: Joi.string()
    .min(6)
    .required()
    .email({ tlds: { allow: false } }),
  password: joiPassword
    .string()
    .minOfSpecialCharacters(1)
    .minOfLowercase(1)
    .minOfUppercase(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .required(),
});

//login validation schema for JOI
const loginSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .required()
    .email({ tlds: { allow: false } }),
  password: joiPassword
    .string()
    .minOfSpecialCharacters(1)
    .minOfLowercase(1)
    .minOfUppercase(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .required(),
});

//contact validation schema for JOI
const contactSchema = Joi.object({
  name: Joi.string().min(3).required(),
  phone: Joi.number().integer().min(100000000).max(9999999999).required(),
});

//SignUp User
const signup = async (req, res) => {
  //CHECK IF Email ID ALREADY EXISTS
  delete req.body.confirmPassword;

  const { username, phone, email, password } = req.body;

  //validating email
  const emailExist = await User.findOne({ email: email });
  if (emailExist) {
    res.status(400).send({ message: "Email Already Exists" });
    return;
  }

  //validating existing username
  const usernameExist = await User.findOne({ username: username });
  if (usernameExist) {
    res.status(400).send({ message: "Username Already Exists" });
    return;
  }

  //validating existing phone
  const phoneExist = await User.findOne({ phone: phone });
  if (phoneExist) {
    return res.status(400).send({ message: "Phone Already Exists" });
  }

  //HASHING THE PASSWORD

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({
    username,
    phone,
    email,
    password: hashedPassword,
    contacts: [],
  });

  try {
    //VALIDATION OF USER INPUTS
    const { error } = await registerSchema.validateAsync(req.body);
    if (error) {
      res.status(500).send({ message: error });
    } else {
      //THE USER IS ADDED
      await user.save();
      //CREATE TOKEN
      const token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.JWT_PRIVATE_KEY,
        {
          expiresIn: "1h",
        }
      );
      res.status(200).send({
        token: token,
        userId: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error });
  }
};

//SIGNIN USER
const login = async (req, res, next) => {
  //CHECKING IF EMAIL EXISTS
  let user;
  try {
    user = await User.findOne({ email: req.body.email });
  } catch (error) {
    logger.error(error);
  }
  if (!user) {
    res.status(400).send({ message: "Email does not exist" });
    return;
  }
  //Validating User Password
  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword) {
    res.status(400).send({ message: "Wrong credentials!!!" });
    return;
  }

  try {
    const { error } = await loginSchema.validateAsync(req.body);

    if (error) {
      res.status(400).send({ message: error });
      return;
    } else {
      //check if the two-factor authentication
      if (user.is2FA) {
        //generate the otp
        const { otp, secret } = generateOTP();

        const sendOTPResponse = await sendEmail(user.email, otp);
        // const sendOTPResponse = true;
        if (sendOTPResponse) {
          try {
            //save the otp to the database
            await OTP({
              secret,
              email: user.email,
            }).save();

          } catch (error) {
            logger.error("Error while saving the otp to the DB", error);
            return res.status(500).json({ error: "Internal server error" });
          }
          return res.status(200).json({ is2FA: user.is2FA, email: user.email });
        } else {
          logger.error("No OTP response!");
          return res.status(500).json({ error: "Error in sending OTP" });
        }
      }
      //CREATE TOKEN
      const token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.JWT_PRIVATE_KEY,
        {
          expiresIn: "1h",
        }
      );
      return res.status(200).send({
        token: token,
        userId: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      });
    }
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).send({ message: err });
    }
  }
};

//2FA
const verifyOtp = async (req, res, next) => {
  //extracting the email and otp from the body
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new Error("Missing dependencies");
    }
    
    //find the user
    const user = await User.findOne({ email: email });
    if (!user) {
      res.status(400).send({ message: "User not found" });
    }
    
    //if the user exists then find the otp
    const savedOTP = await OTP.findOne({ email: email });
    
    if (!savedOTP) {
      logger.error(`OTP was not found for the email ${email}`);
      return res.status(400).json({ error: "OTP not found" });
    }

    //if present verify the otp
    const isOTPValid = verifyOTP(savedOTP.secret, otp);
    if (!isOTPValid) {
      return res.status(401).json({ message: "OTP did not match" });
    }

    //if the otp matches then delete the otp and generate the token
    await OTP.deleteOne({ email: email });
    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_PRIVATE_KEY,
      {
        expiresIn: "1h",
      }
    );
    return res.status(200).send({
      token: token,
      userId: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
    });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//adding new contact to the user
const addContact = async (req, res, next) => {
  //validating the payload
  try {
    const { error } = await contactSchema.validateAsync(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }
  } catch (error) {
    logger.error("Error in validating new contact! ", error);
  }

  //payload
  const { name, phone } = req.body;

  //extracting the userid from the param
  const userId = req.params.userId;

  //searching the user in the database using the userId
  let user;
  try {
    user = await User.findById(userId).populate({
      path: "contacts",
      select: "phone",
    });
  } catch (error) {
    return next(new HttpError("Adding contact failed, please try again.", 500));
  }

  //if we do not find any user with the given id
  if (!user) {
    return next(
      new HttpError("Could not find any user with the given id.", 404)
    );
  }

  let doesContactExists = false;
  if (user.contacts.length !== 0) {
    user.contacts.forEach((contact) => {
      if (contact.phone === phone || phone === user.phone) {
        doesContactExists = true;
        return;
      }
    });
  } else if (user.phone === phone) {
    return res
      .status(403)
      .json({ message: "You can not add your own contact." });
  }

  // if contact already exists, return an error response
  if (doesContactExists) {
    return res.status(400).json({ message: "Contact already exists" });
  }

  //if we do find a valid user with the user id and no existing contact add the userId/objectid of that user to the contacts array
  let newContact;
  try {
    const user = await User.findOne({ phone: phone }, "_id").exec();
    if (user) {
      newContact = user._id;
    } else {
      newContact = null;
      res
        .status(404)
        .json({ message: `No user found with phone number ${phone}` });
    }
  } catch (err) {
    logger.error(err);
    return next(
      new HttpError(
        "Something went wrong in finding the user with given phone",
        500
      )
    );
  }

  if (newContact) {
    try {
      // adding the new contact to the user's contacts array
      user.contacts.push(newContact);
      await user.save();
      res.status(201).json({
        message: `${name} was added successfully to the contact list.`,
        contacts: user.contacts,
      });
    } catch (error) {
      logger.error(error);
      return next(
        new HttpError("Something went wrong, could not save contact!", 500)
      );
    }
  }
};

//fetching all the contacts of the user
const getContacts = async (req, res, next) => {
  //extracting the user id from the param
  const userId = req.params.userId;

  //searching the user in the database using the user id
  let user;
  try {
    user = await User.findById(userId)
      .populate({ path: "contacts", select: "username phone" })
      .exec();
  } catch (error) {
    logger.error(error);
    return next(new HttpError("Something went wrong, please try again", 500));
  }

  //no user found
  if (!user) {
    return next(
      new HttpError("Could not find the user with the provided id.", 404)
    );
  }

  //if the user exists get all their contacts and send as response
  res.status(200).json({ contacts: user.contacts });
};

//function to get all the conversation for a user using their userId
const getAllChats = async (req, res, next) => {
  //extracting the userId from the params
  const userId = req.params.userId;

  //searching for the user
  let user;
  try {
    user = await User.findById(userId).populate({
      path: "chats",
      populate: {
        path: "participants",
        select: "username phone",
      },
      select: "name",
    });
    // logger.log("chats: ", user.chats);
    res.status(200).json({ chats: user.chats });
  } catch (error) {
    logger.error(error);
    return next(
      new HttpError(
        `Something went wrong in finding the user with id ${userId}`,
        500
      )
    );
  }

  if (!user) {
    return next(
      new HttpError(`Could not find the user with id ${userId}`, 404)
    );
  }
};

// exports.getUser = getUser;
// exports.updateUser = updateUser;
exports.signup = signup;
exports.login = login;
exports.addContact = addContact;
exports.getContacts = getContacts;
exports.getAllChats = getAllChats;
exports.verifyOtp = verifyOtp;

const router = require("express").Router();

const usersController = require("../controller/user-controller");
// const checkAuth = require("../middleware/check-auth");

/**GET*/

//GET contact API
router.get("/:userId/get-contacts", usersController.getContacts);

//GET all chats API
router.get("/:userId/chats", usersController.getAllChats);

//Get User Details API
// router.get("/:userId/dashboard", usersController.getUser);

/**POST*/

//SignUp API
router.post("/signup", usersController.signup);

//Login API
router.post("/login", usersController.login);

//two-factor otp verification
router.post("/login/verify-otp", usersController.verifyOtp);

//Add contact API
router.post("/:userId/add-new-contact", usersController.addContact);

module.exports = router;

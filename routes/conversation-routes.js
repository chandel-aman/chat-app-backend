const router = require("express").Router();

//message controller
const conversationController = require("../controller/conversation-controller");

//get conversation API
router.get("/:userId/:convId", conversationController.getConversation);

//create conversation API
router.post("/:userId/newConv", conversationController.createConversation);

//add new message API
router.post("/:userId/:convId/sendMsg", conversationController.addMessage);

//create new group API
router.post("/:userId/createGroup", conversationController.createGroup);

//add reaction to message API
router.post("/:userId/:convId/addReaction", conversationController.addReaction);

module.exports = router;

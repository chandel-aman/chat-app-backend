const express = require("express");
const path = require("path");

const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

const morganMiddleware = require("./middlewares/morgan.middleware");
const logger = require("./utils/logger");

//routes
const usersRoutes = require("./routes/user-routes");
const conversationRoute = require("./routes/conversation-routes");

const app = express();

const PORT = 8000;

//middlewares
app.use(bodyParser.json(), cors());
app.use(morganMiddleware);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

//routes middleware
app.use("/api/user/", usersRoutes);
app.use("/api/chats/", conversationRoute);

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

app.get("/", (req, res) => {
  res.send(`<h3>Hey! Code Backend is up !</h3>`);
});

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port: ${PORT}`);
});

mongoose
  .connect(process.env.ATLAS_URI, { useNewUrlParser: true })
  .then(() => {
    logger.info("Connected to the database!");
  })
  .catch((err) => {
    logger.error("Error connecting to the database:", err.message);
  });

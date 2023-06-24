const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Define the path to the logs directory
const logsDir = path.join(path.resolve(__dirname, ".."), "logs");

// Check if the logs directory exists, and create it if it doesn't
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define the path to the error log file
const errorLogPath = path.join(logsDir, "error.log");

// Check if the error log file exists, and create it if it doesn't
if (!fs.existsSync(errorLogPath)) {
  fs.writeFileSync(errorLogPath, "");
}

// Define the path to the all log file
const allLogPath = path.join(logsDir, "all.log");

// Check if the all log file exists, and create it if it doesn't
if (!fs.existsSync(allLogPath)) {
  fs.writeFileSync(allLogPath, "");
}

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "warn";
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console(),
  // new winston.transports.File({
  //   filename: errorLogPath,
  //   level: "error",
  //   append: true,
  // }),
  // new winston.transports.File({ filename: allLogPath, append: true }),
];

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;

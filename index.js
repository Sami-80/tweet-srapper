
var crona = require("./cron/cron-a");
const common = require("./common");
const con = require("./db").db;
var express = require("express");
var app = express();
var cors = require("cors");
app.use(cors());
app.options("*", cors());
app.use(function (req, res, next) {
  //allow cross origin requests
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, PUT, OPTIONS, DELETE, GET"
  );
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/api/health", (req, res) => {
  res.send({
    status: "OK",
    message: "Server is listening on port 3000 with SSL false",
  });
});

app.get("/api/notification", (req, res) => {
  con.query(
    "SELECT link,time,data, SUM(isnew) as unread FROM `tweets_replies` GROUP BY link ORDER by Date(time) desc;",
    async (error, results, fields) => {
      if (error) console.log(error);
      else {
        res
          .status(200)
          .json(
            common.BaseResponse(
              true,
              "notifications fetched successfully",
              results
            )
          );
      }
    }
  );
});

app.post("/api/readnotification/:id", (req, res) => {
  con.query(
    "UPDATE `tweets_replies` set isnew=0 where link='" + req.params.id + "'",
    async (error, results, fields) => {
      if (error) console.log(error);
      else {
        res
          .status(200)
          .json(
            common.BaseResponse(
              true,
              "notifications read successfully",
              results
            )
          );
      }
    }
  );
});

app.get("/api/notification/:id", (req, res) => {
  con.query(
    `SELECT link,time,data FROM tweets_replies where link like '%${req.params.id}%'  ORDER by Date(time) desc`,
    async (error, results, fields) => {
      if (error) console.log(error);
      else {
        res
          .status(200)
          .json(
            common.BaseResponse(
              true,
              "notifications fetched successfully",
              results
            )
          );
      }
    }
  );
});
// Start the http server
var httpServer;
var http = require("http");
const { setTimeout } = require("timers/promises");
httpServer = http.createServer(app);

//create socket server
// var io = require("socket.io").listen(httpServer, { origins: "*:*" });
// require(__dirname + "/socket")(io);

// Make the server listen
httpServer.listen(3000);
console.log("Listening on port 3000 with SSL false");

module.exports = app;
// module.exports.io = io;

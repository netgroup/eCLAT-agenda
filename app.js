require("dotenv").config();
var { verify } = require("./jobs/verify");

// DB connection
var MONGODB_URL = process.env.MONGODB_URL;
var mongoose = require("mongoose");
mongoose
  .connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    //don't show the log when it is test
    if (process.env.NODE_ENV !== "test") {
      console.log("Connected to %s", MONGODB_URL);
      console.log("App is running ... \n");
    }
  })
  .catch((err) => {
    console.error("App starting error:", err.message);
    process.exit(1);
  });
var db = mongoose.connection;

const Agenda = require("agenda");
const agenda = new Agenda({
  db: {
    address: MONGODB_URL,
    collection: "agendaJobs",
  },
  maxConcurrency: 1,
});
//Define the background task to verify the package
agenda.define("verify package", verify.packageVerification);

(async function () {
  // IIFE to give access to async/await
  await agenda.start();
})();

// agenda.define("get package programs", programs.getPrograms);
// const job = agenda.create("get package programs", package);
// await job.save();

var shell = require("shelljs");
const fs = require("fs");
require("dotenv").config();

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
const PackageModel = require("./models/PackageModel");

// Extract the repo name from the url
function extractGitHubRepoName(url) {
  if (!url) return null;
  const match = url.match(
    /^https?:\/\/(www\.)?github.com\/(?<owner>[\w.-]+)\/(?<name>[\w.-]+)/
  );
  if (!match || !(match.groups?.owner && match.groups?.name)) return null;
  return `${match.groups.name}`;
}

// //Function that does the verification
async function ls(folderName) {
  const path = __dirname + "/PackageToVerify/" + folderName;
  const dir = await fs.promises.opendir(path);

  await new Promise((r) => setTimeout(r, 60000));

  //Condition: all files have this type of extensions or are directories
  const conditionArray = ["js", "json", "md"];
  var status = "verified";

  for await (const dirent of dir) {
    if (dirent.name === ".gitignore" || dirent.isDirectory()) {
      continue;
    }

    if (conditionArray.indexOf(dirent.name.split(".").pop()) === -1) {
      //Release did not pass the test
      status = "error";
    }
    //Release passed the test
  }
  return status;
}

//Function to update status
function updateStatus(release, newStatus) {
  PackageModel.findById(release.packageId, async function (err, doc) {
    if (err) {
      console.log(err, release);
    } else {
      doc.releases = doc.releases.map((r) => {
        if (r.commit === release.commit) {
          r.status = newStatus;
          return r;
        }
        return r;
      });

      await doc.save(function (err, result) {
        if (err) {
          //Error in saving new status
          console.log("Error.");
        } else {
          //New status saved succesfully
          console.log("Verified with success.");
        }
      });
    }
  });
}

//Define the background task to verify the package
agenda.define("verify package", async (job) => {
  console.log("inside job");
  console.log(job.attrs.data);

  shell.exec(`rm -r PackageToVerify/*`);

  const release = job.attrs.data;
  const repo = release.packageUrl;
  const folderName = extractGitHubRepoName(repo);
  const commit = release.commit;

  shell.cd(__dirname + `/PackageToVerify`);

  //Clone the repository locally
  if (shell.exec(`git clone ${repo}`).code !== 0) {
    console.log("Error: Git clone failed");
    updateStatus(release, "error");
  } else {
    shell.cd(`${folderName}`);
    shell.exec(`git checkout ${commit}`);

    //Call the function to do the verification and access the database to do the release update
    const newStatus = await ls(folderName, release).catch(console.error);

    //Update the status of the package
    updateStatus(release, newStatus);

    //Delete the package after it has been used
    shell.cd(`..`);
    shell.exec(`rm -r ${folderName}`);
  }
  job.remove();
});

(async function () {
  // IIFE to give access to async/await
  await agenda.start();
})();

const fs = require("fs");
const readline = require("readline");
const PackageModel = require("../models/PackageModel");

// Extract the repo name from the url
function extractGitHubRepoName(url) {
  if (!url) return null;
  const match = url.match(
    /^https?:\/\/(www\.)?github.com\/(?<owner>[\w.-]+)\/(?<name>[\w.-]+)/
  );
  if (!match || !(match.groups?.owner && match.groups?.name)) return null;
  return `${match.groups.name}`;
}

// Function to get the program description
async function getDescription(fileName) {
  const fileStream = fs.createReadStream(fileName);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    if (line.includes("//!")) {
      const description = line.substring(line.indexOf("//!") + 3);
      return description;
    }
  }
  return "-";
}

//Function that does the verification
async function ls(folderName) {
  const path = __dirname + "/PackageToVerify/" + folderName;
  const dir = await fs.promises.opendir(path);

  //Counts the directories necessary to be in the repository (2): python, scripts
  var directories = 0;
  var status = "verified";
  var programsToAdd = {};

  for await (const dirent of dir) {
    if (
      dirent.name === ".gitignore" ||
      dirent.name === ".git" ||
      dirent.name.split(".").pop() === "md" ||
      dirent.name === "LICENSE"
    ) {
      continue;
    }

    if (dirent.name.split(".").slice(1).join(".") === "bpf.c") {
      const key = dirent.name.split(".")[0];
      programsToAdd[key] = await getDescription(dirent.name);
    } else if (
      dirent.name.split(".").slice(1).join(".") !== "bpf.c" &&
      dirent.name.split(".").pop() !== "h" &&
      !dirent.isDirectory()
    ) {
      status = "error";
    }

    if (dirent.isDirectory()) {
      const folder = await fs.promises.opendir(path + "/" + dirent.name);

      switch (dirent.name) {
        case "python":
          // directories++;
          for await (const file of folder) {
            if (file.name.split(".").pop() !== "py") {
              status = "error";
            }
          }
          break;
        case "scripts":
          // directories++;
          for await (const file of folder) {
            if (file.name.split(".").pop() !== "sh") {
              status = "error";
            }
          }
          break;
        default:
          for await (const file of folder) {
          }
      }
    }

    if (status === "error") {
      return [status, undefined];
    }
  }
  // return status === "verified" && directories === 2 ? "verified" : "error";  USE THIS IF THE FOLDERS PYTHON, SCRIPTS ETC ARE NECESSARY
  return [status, programsToAdd];
}

//Function to update status
function updateStatus(release, newStatus, newPrograms) {
  PackageModel.findById(release.packageId, async function (err, doc) {
    if (err) {
      console.log(err);
    } else {
      doc.releases = doc.releases.map((r) => {
        if (r.version === release.version) {
          r.status = newStatus;
          return r;
        }
        return r;
      });

      if (newPrograms !== undefined) {
        doc.programs = newPrograms;
      }

      await doc.save(function (err, result) {
        if (err) {
          //Error in saving new status
          console.log("Error in the saving of the package.");
        } else {
          //Package saved succesfully
          console.log("Package saved and verified with success.");
        }
      });
    }
  });
}

module.exports = {
  extractGitHubRepoName,
  getDescription,
  ls,
  updateStatus,
};

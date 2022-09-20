var shell = require("shelljs");
const fs = require("fs");
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

// //Function that does the verification
async function ls(folderName) {
  const path = __dirname + "/PackageToVerify/" + folderName;
  const dir = await fs.promises.opendir(path);

  //   await new Promise((r) => setTimeout(r, 60000));

  //Counts the directories necessary to be in the repository (2): python, scripts
  var directories = 0;
  var status = "verified";

  for await (const dirent of dir) {
    if (
      dirent.name === ".gitignore" ||
      dirent.name === ".git" ||
      dirent.name.split(".").pop() === "md" ||
      dirent.name === "LICENSE"
    ) {
      continue;
    }

    if (
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
          directories++;
          for await (const file of folder) {
            if (file.name.split(".").pop() !== "py") {
              status = "error";
            }
          }
          break;
        case "scripts":
          directories++;
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

    if (status === "error") break;
  }
  return status === "verified" && directories === 2 ? "verified" : "error";
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

const verify = {
  packageVerification: async (job) => {
    console.log("inside job");
    console.log(job.attrs.data);

    // shell.exec(`rm -r PackageToVerify/*`);

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

      if (shell.exec(`git checkout ${commit}`).code !== 0) {
        updateStatus(release, "error");
      } else {
        //Call the function to do the verification: returns true or false
        const newStatus = await ls(folderName, release).catch(console.error);

        //Update the status of the package
        updateStatus(release, newStatus);
      }
      //Delete the package after it has been used
      shell.cd(`..`);
      shell.exec(`rm -r ${folderName}`);
    }
    job.remove();
  },
  // .... more methods that shedule tasks at the different intervals.
};

module.exports = { verify };

// fs.readFile(dirent.name, "utf8", (err, data) => {
//     if (err) {
//       console.error(err);
//       return;
//     }
//     console.log(data);
//   });

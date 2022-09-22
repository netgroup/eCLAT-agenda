var shell = require("shelljs");
const {
  extractGitHubRepoName,
  getDescription,
  ls,
  updateStatus,
} = require("./utility");

const verify = {
  packageVerification: async (job) => {
    console.log(">> Inside job: Verify ");

    // shell.exec(`rm -r PackageToVerify/*`);

    const release = job.attrs.data;
    const repo = release.packageUrl;
    const folderName = extractGitHubRepoName(repo);
    const commit = release.commit;

    shell.cd(__dirname + `/PackageToVerify`);

    //Clone the repository locally
    if (shell.exec(`git clone ${repo}`).code !== 0) {
      console.log("Error: Git clone failed");
      updateStatus(release, "error", undefined);
    } else {
      shell.cd(`${folderName}`);

      if (shell.exec(`git checkout ${commit}`).code !== 0) {
        updateStatus(release, "error", undefined);
      } else {
        //Call the function to do the verification
        const [newStatus, newPrograms] = await ls(folderName, release).catch(
          console.error
        );

        //Update the status of the package
        updateStatus(release, newStatus, newPrograms);
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

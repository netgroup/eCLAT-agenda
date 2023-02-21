# eCLAT-agenda

## This repository defines an asynchronous Job Scheduler written in JavaScript using Agenda for the packages of the eCLAT framework. It works like this:

1. The Job Scheduler gets the next job from its MongoDB Queue containing data about the package to verify. The job gets removed from the queue.
1. The Job Scheduler uses the job to download the 'package' locally from Github. 
2. For each downloaded package folder, it makes sure that its content respects these rules:
  - Files can have the extension '.bpf.c'.
  - Files can have the extension '.h'.
  - Folders containing files with the extension '.py' are named 'python'.
  - Folders containing files with the extension '.h' are named 'scripts'.
  If a file or folder doesn't check ANY of these rules, the package is not verified.
3. The downloaded folder contatining files get deleted.
4. The package status and data in MongoDB gets updated.


## How to install

### Using Git (recommended)

1.  Clone the project from github. Change "myproject" to your project name.

```bash
https://github.com/netgroup/eCLAT-agenda.git
```

### Using manual download ZIP

1.  Download repository
2.  Uncompress to your desired directory

### Install npm dependencies after installing (Git or manual download)

```bash
cd myproject
npm install
```

### Setting up environments

1.  Create a file named `.env` on root directory of project.
2.  The file `.env` is already ignored, so you never commit your credentials.
4.  Add the values to the file of your environment. 

## Project structure

```sh
.
├── app.js
├── package.json
├── jobs
│   ├── utility.js
│   └── verify.js
└── models
    ├── PackageModel.js
    └── ReleaseModel.js

```

## How to run

### Running API server locally

```bash
npm run start
```

## Bugs or improvements

Every project needs improvements, Feel free to report any bugs or improvements. Pull requests are always welcome.


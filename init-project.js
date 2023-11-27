const fs = require('fs');
const path = require('path');

const projectFolderPath = path.basename(__dirname);
const moduleId = 'module-id';
const replacement = projectFolderPath;

function replaceInFile(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file: ${filePath}`);
      return;
    }

    let updatedContent = data.replace(new RegExp(moduleId, 'g'), replacement);

    if (filePath.includes("module.json")) {
      updatedContent = updatedContent.replace(new RegExp("module-name", 'g'), convertToTitleCase(replacement));
    }

    fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing to file: ${filePath}`);
        return;
      }

      console.log(`Replaced "${moduleId}" with "${replacement}" in ${filePath}`);
    });
  });
}

const filesToReplaceIn = [
  'languages/en.json',
  'scripts/main.js',
  'module.json',
  // Add more file paths as needed
];

filesToReplaceIn.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);
  replaceInFile(fullPath);
  deleteInitScript();
  selfDestruct();
});

function deleteInitScript() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  fs.readFile(packageJsonPath, 'utf8', (err, packageData) => {
    if (err) {
      console.error(`Error reading package.json: ${err}`);
      return;
    }

    try {
      const packageInfo = JSON.parse(packageData);
      if (packageInfo.scripts && packageInfo.scripts.init) {
        delete packageInfo.scripts.init;
        fs.writeFile(packageJsonPath, JSON.stringify(packageInfo, null, 2), 'utf8', (err) => {
          if (err) {
            console.error(`Error writing to package.json: ${err}`);
          }
        });
      }
    } catch (parseError) {
      console.error(`Error parsing package.json: ${parseError}`);
    }
  });
}

function selfDestruct() {
  const scriptPath = path.join(__dirname, 'init-project.js');

fs.unlink(scriptPath, (err) => {
  if (err) {
    console.error(`Error deleting script: ${err}`);
  } else {
    console.log('Script deleted successfully.');
  }
});
}

function convertToTitleCase(inputString) {
  return inputString
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
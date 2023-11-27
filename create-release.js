const fs = require('fs');
const path = require('path');
const zip = require('zip-dir');

const moduleJsonPath = path.join(__dirname, 'module.json');

fs.readFile(moduleJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading module.json: ${err}`);
    return;
  }

  try {
    const moduleInfo = JSON.parse(data);
    const version = moduleInfo.version;
    const id = moduleInfo.id;

    const zipFileName = `${id}-${version}.zip`;
    const distFolderPath = path.join(__dirname, 'dist');

    const filesToInclude = [
      "module.json","styles", "index.js", "index.js.map", "templates", "languages", "assets"
    ];

    const options = {
      saveTo: path.join(distFolderPath, zipFileName),
      filter: (path) => filesToInclude.some((item) => path.includes(item)),
    };

    zip(__dirname, options, (err) => {
      if (err) {
        console.error(`Error creating zip: ${err}`);
        return;
      }

      console.log(`Release zip "${zipFileName}" created in "dist" folder.`);
    });
  } catch (parseError) {
    console.error(`Error parsing module.json: ${parseError}`);
  }
});

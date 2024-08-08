const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const imagesFolder = path.join(__dirname, 'Images');
const completedFolder = path.join(__dirname, 'Completed');
const csvFile = path.join(__dirname, 'c1employees.csv'); // Replace with your CSV file name

const renameMap = {};

function currentTimestamp() {
  return new Date().toLocaleTimeString();
}

if (!fs.existsSync(completedFolder)) {
  fs.mkdirSync(completedFolder);
}

fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (row) => {
    const filename = row['Filename'];
    const newFilename = row['newfilename'];

    if (filename && newFilename) {
      renameMap[filename] = newFilename;
      console.log(`[${currentTimestamp()}] Validated: ${filename} -> ${newFilename}`);
    } else {
      console.log(`[${currentTimestamp()}] Skipping row due to missing filename or newfilename`);
    }
  })
  .on('end', () => {
    console.log(`[${currentTimestamp()}] Success! CSV file has been processed.`);
    const totalImages = Object.keys(renameMap).length;
    let startIndex = 0;

    fs.readdir(imagesFolder, (err, files) => {
      if (err) throw err;

      files.forEach((file, i) => {
        const originalImageName = file;
        const newImageName = renameMap[file];

        if (newImageName) {
          const oldPath = path.join(imagesFolder, file);
          const newPath = path.join(completedFolder, newImageName);

          fs.rename(oldPath, newPath, (err) => {
            if (err) throw err;
            console.log(
              `[${currentTimestamp()}] (${startIndex + i + 1}/${totalImages}) Renamed ${originalImageName} to ${newImageName} and moved to Completed`
            );
          });
        } else {
          console.log(`[${currentTimestamp()}] Uh oh! No match for ${originalImageName}`);
        }
      });
    });
  });

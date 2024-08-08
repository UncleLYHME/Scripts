const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const yaml = require('js-yaml');
const glob = require('glob');

function getCurrentTimestamp() {
  const now = new Date();
  return `[${now.toLocaleTimeString()}]`;
}

console.log(`${getCurrentTimestamp()} ${'Loaded imageCompressor v1.1'}`);

async function findAvailableFilename(filename, destinationDir) {
  let index = 2;
  const [basename, ext] = filename.split('.');
  let newFilename = `${basename}_${index}.${ext}`;

  while (await fs.access(path.join(destinationDir, newFilename)).then((_) => true).catch((_) => false)) {
    index++;
    newFilename = `${basename}_${index}.${ext}`;
  }

  return newFilename;
}

async function compressAndMoveImage(file, sourceDir, destinationDir) {
  try {
    const sourceFile = path.join(sourceDir, file);

    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const sourceStats = await fs.stat(sourceFile);
      let image = sharp(sourceFile);

      if (file.match(/\.(jpg|jpeg)$/i)) {
        image = image.jpeg({ quality: 60 });
      } else if (file.match(/\.(png)$/i)) {
        image = image.png({ compressionLevel: 6 });
      }

      let destinationFile = path.join(destinationDir, file);

      if (await fs.access(destinationFile).then((_) => true).catch((_) => false)) {
        const newFilename = await findAvailableFilename(file, destinationDir);
        destinationFile = path.join(destinationDir, newFilename);
      }

      const { size: originalSize } = sourceStats;
      await image.toFile(destinationFile);

      const destinationStats = await fs.stat(destinationFile);
      const { size: compressedSize } = destinationStats;
      const reductionPercentage = ((originalSize - compressedSize) / originalSize) * 100;

      const fileName = path.basename(destinationFile);

      console.log(`${getCurrentTimestamp()} Compressed and Moved ${fileName} (${reductionPercentage.toFixed(2)}% File Size Reduced)`);
      await fs.unlink(sourceFile);
    } else {
      const destinationFile = path.join(destinationDir, file);
      await fs.copyFile(sourceFile, destinationFile);
      const fileName = path.basename(sourceFile);

      console.log(`${getCurrentTimestamp()} Moved ${fileName}`);
      await fs.unlink(sourceFile);
    }
  } catch (err) {
    console.error(`${getCurrentTimestamp()} Could not process ${file}, ${err.message}`);
  }
}

async function processFiles() {
  try {
    const settingsFile = await fs.readFile('settings.yml', 'utf8');
    const settings = yaml.load(settingsFile);
    const { directories, files } = settings;

    if (files.remove && Array.isArray(files.remove)) {
      for (const pattern of files.remove) {
        const filesToRemove = await glob.sync(path.join(directories.source, pattern));
        for (const fileToRemove of filesToRemove) {
          await fs.unlink(fileToRemove);
          const fileName = path.basename(fileToRemove);
          console.log(`${getCurrentTimestamp()} ${`Removed, ${fileName}`}`);
        }
      }
    }

    const filesToProcess = await fs.readdir(directories.source);
    if (filesToProcess.length === 0) {
      console.log(`${getCurrentTimestamp()} ${'No files to process...'}`);
      return;
    }
    for (const file of filesToProcess) {
      await compressAndMoveImage(file, directories.source, directories.destination);
    }
  } catch (err) {
    console.error(`${getCurrentTimestamp()} ${'Could not read the source directory,', err}`);
  }
}

processFiles();
const axios = require('axios');
const fs = require('fs').promises;

function currentTimestamp() {
  return new Date().toLocaleTimeString();
}

async function checkImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    if (response.headers['content-type'].startsWith('image/')) {
      return 'valid';
    }
  } catch (error) {
    return 'invalid';
  }
}

async function processBatch(urls, startIndex, totalUrls) {
  const results = { valid: [], invalid: [] };

  for (let i = 0; i < urls.length; i++) {
    const status = await checkImage(urls[i]);
    console.log(`[${currentTimestamp()}] (${startIndex + i + 1}/${totalUrls}) ${status === 'valid' ? '✔︎' : '⨯'}: ${urls[i]}`);
    if (status === 'valid') {
      results.valid.push(urls[i]);
    } else {
      results.invalid.push(urls[i]);
    }
  }

  await fs.appendFile('goodURLs.txt', results.valid.join('\n') + '\n', 'utf8');
  await fs.appendFile('badURLs.txt', results.invalid.join('\n') + '\n', 'utf8');
  return results;
}

async function readUrlsFromFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error(`[${currentTimestamp()}] Uh oh! Unable to read the urls.txt file, ${error.message}`);
    return [];
  }
}

async function countdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    console.log(`Cooldown, ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function checkUrlsInBatches(filePath) {
  let urls = await readUrlsFromFile(filePath);
  const totalUrls = urls.length;
  
  while (urls.length > 0) {
    const batch = urls.splice(0, 25);
    await processBatch(batch, totalUrls - urls.length - batch.length, totalUrls);
    
    if (urls.length > 0) {
      await countdown(5);
    }
  }
  
  console.log('Success! URLs Have all been reviewed.');
  await fs.writeFile(filePath, urls.join('\n'), 'utf8');
}

const filePath = 'urls.txt';
checkUrlsInBatches(filePath);
const fs = require('fs');
const pdfParse = require('pdf-parse');
async function run() {
  try {
    const data = await pdfParse(fs.readFileSync('package.json')); // Just passing garbage to see error, wait no I need a real PDF
  } catch (err) {
    console.error("EXPECTED ERROR:", err);
  }
}
run();

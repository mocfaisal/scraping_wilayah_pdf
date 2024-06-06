const fs = require('fs');
const pdf = require('pdf-parse');
const tabula = require('tabula-js');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const { promisify } = require('util');
const regex = require('regex');

const inputPath = './raw.pdf';
const outputPath = './dist/base.csv';

async function findRelevantPages(pathToPdf) {
  const pdfData = await pdf(pathToPdf);
  const pages = pdfData.text.split('\f');

  let temp = 0;
  const ranges = [];

  for (let i = 1; i <= pages.length; i++) {
    const page = pages[i - 1];
    if (page.includes('b. Kode Dan Data Wilayah Administrasi')) {
      temp = i;
    } else if (page.includes('c. Rekapitulasi') && temp!== 0) {
      ranges.push({ from: temp, to: i });
      temp = 0;
    }
  }

  return ranges;
}

async function extractTables(inputPath, pages) {
  const areaHead = [142, 36, 568, 602];
  const areaTail = [90, 35, 568, 601];

  const pageHead = pages[0];
  const pagesTail = pages.slice(1);

  const tabulaOptions = {
    silent: true,
    lattice: true,
    pandasOptions: {
      header: null,
      dtype: 'string', // empty cells will be pandas.NA
    },
  };

  const headFrames = await tabula.extract(inputPath, {
    area: areaHead,
    pages: [pageHead],
   ...tabulaOptions,
  });

  const tailFrames = await tabula.extract(inputPath, {
    area: areaTail,
    pages: pagesTail,
   ...tabulaOptions,
  });

  return [...headFrames,...tailFrames];
}

async function parseFrame(frame) {
  const output = [];

  for (const row of frame.data) {
    const cells = row.filter((cell) => cell!== '');
    if (cells.length >= 2 && isCode(cells[0]) && typeof cells[1] === 'string') {
      const code = cells[0];
      const rawName = cells[1];
      output.push([code, rawName]);
    }
  }

  return output;
}

function isCode(txt) {
  return regex.test(txt, '^[0-9]{2}(\\.[0-9]{2}(\\.[0-9]{2}(\\.[1-2][0-9]{3})?)?)?$');
}

async function main() {
  const relevantRanges = await findRelevantPages(inputPath);
  const relevantPages = relevantRanges.reduce((acc, range) => [...acc,...Array(range.to - range.from + 1).keys()].map((i) => i + range.from), []);

  const frames = await extractTables(inputPath, relevantPages);

  const codeToRawName = await Promise.all(frames.map(parseFrame)).then((frames) => frames.flat());

  const csvOutput = codeToRawName.map(([code, rawName]) => {
    const [ctr, ctx] = parseCode(code);
    let name = rawName;

    if (ctx === 'provinsi') {
      name = name.replace(/\r/g, '');
    } else if (ctx === 'kabkota') {
      name = name.replace(/\r/g, '');
      name = name.replace(/[0-9]+/g, '');
      name = name.trim();
    } else if (regex.test(name, '\\r' + ctr)) {
      name = name.replace(new RegExp('\\r(' + ctr + ')?', 'g'), '');
    } else {
      name = name.replace(/^[0-9]+\s+/g, '');
      name = name.replace(/\r/g, '');
    }

    name = name.replace(/\s+/g, '');
    name = name.trim();

    if (regex.test(name, '^([A-Za-z] )+[A-Za-z]$')) {
      name = name.replace(/\s/g, '');
    } else if (name.endsWith('elatan.')) {
      name = name.slice(0, -1);
    }

    name = name.replace(/"/g, "'");

    return [code, name, rawName];
  });

  const stringifier = stringify({
    header: true,
    columns: ['code', 'name', 'raw_name'],
  });

  csvOutput.forEach((row) => stringifier.write(row));
  stringifier.end();

  fs.writeFileSync(outputPath, stringifier.read());

  console.log('Coordinates:', [90, 35, 568, 601]);
}

function parseCode(code) {
  let counterKec= 0;
  let counterKel = 0;
  let counterDes = 0;

  if (code.length === 2) { // provinsi
    counterKec = 0;
    counterKel = 0;
    counterDes = 0;
    return ['', 'provinsi'];
  } else if (code.length === 5) { // kab/kota
    counterKec = 0;
    counterKel = 0;
    counterDes = 0;
    return ['', 'kabkota'];
  } else if (code.length === 8) { // kecamatan
    counterKec += 1;
    counterKel = 0;
    counterDes = 0;
    return [counterKec.toString(), 'kecamatan'];
  } else if (code.length === 13) {
    if (code[9] === '1') { // kelurahan
      counterKel += 1;
      return [counterKel.toString(), 'kelurahan'];
    } else if (code[9] === '2') {
      counterDes += 1;
      return [counterDes.toString(), 'desa'];
    }
  }

  return ['', ''];
}

main();
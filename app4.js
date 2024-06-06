const fs = require('fs');
const Papa = require('papaparse');
const pdfTableExtractor = require('pdf-table-extractor');
const mysql = require('mysql');
require('dotenv').config();

// Path ke file input dan output
const inputPdfPath = './raw4.pdf';
const outputCsvPath = './output.csv';

// Fungsi untuk mengecek apakah string adalah kode wilayah yang valid
function isValidCode(txt) {
    return /^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[1-2][0-9]{3})?)?)?$/.test(txt);
}

// Fungsi untuk mengekstrak data dari PDF
async function extractDataFromPdf(pdfPath) {
    try {
        pdfTableExtractor(pdfPath, handleExtractionSuccess, handleExtractionError, false);
    } catch (err) {
        console.error("Error saat mengekstrak data dari PDF:", err);
    }
}

// Fungsi yang dijalankan saat ekstraksi PDF berhasil
function handleExtractionSuccess(result) {
    let extractedData = [];
    const data = result.pageTables;

    data.forEach(value => {
        let tableData = value.tables;
        tableData.forEach(row => {
            let code = row[0];
            if (row.length === 9 && isValidCode(code)) {
                let rawName = [row[1], row[4], row[5], row[6]];
                let sanitizedName = sanitizeName(code, rawName);
                let codeDetails = identifyCodeType(code);
                extractedData.push([code, sanitizedName, codeDetails.level, codeDetails.type]);
            }
        });
    });

    // Hapus duplikat berdasarkan kode wilayah
    let uniqueData = removeDuplicates(extractedData);

    saveToCsv(uniqueData, outputCsvPath);
    saveToDatabasePrompt(uniqueData);
}

// Fungsi yang dijalankan saat ekstraksi PDF gagal
function handleExtractionError(err) {
    console.error('Error: ' + err);
}

// Fungsi untuk menghapus duplikat berdasarkan kode wilayah
function removeDuplicates(data) {
    let seen = new Set();
    return data.filter(item => {
        if (!seen.has(item[0])) {
            seen.add(item[0]);
            return true;
        }
        return false;
    });
}

// Fungsi untuk mensanitasi nama wilayah
function sanitizeName(code, rawName) {
    let name = rawName;

    if (code.length === 2) {
        name = rawName[0].replace(/\r/g, '');
    } else if (code.length === 5) {
        name = rawName[0].replace(/\r/g, '').replace(/[0-9]+/g, '').trim();
    } else if (code.length === 8) {
        name = rawName[1].replace(/^[-\d\s]*/, "");
    } else if (code.length === 13) {
        name = [rawName[2], rawName[3]].join(' ').replace(/^[-\d\s]*/, "");
    } else if (/^[-\d\s]*/.test(rawName)) {
        name = [rawName[2], rawName[3]].join(' ').replace(/^[-\d\s]*/, "");
    } else {
        return null;
    }

    name = name.replace(/\s+/g, ' ').trim();

    // Sanitasi kasus seperti `P A P U A`
    if (/^([A-Za-z] )+[A-Za-z]$/.test(name)) {
        name = name.replace(/\s/g, '');
    } else if (name.endsWith('elatan.')) {
        name = name.slice(0, -1);
    }

    return name.replace(/"/g, "'").trim() ? name : null;
}

// Fungsi untuk identifikasi kode wilayah
function identifyCodeType(code) {
    let type = null;
    let level = 1;

    if (code.length === 2) {
        level = 1;
    } else if (code.length === 5) {
        level = 2;
        type = (code[3] >= '0' && code[3] <= '6') ? 1 : (code[3] >= '7' && code[3] <= '9') ? 2 : null;
    } else if (code.length === 8) {
        level = 3;
    } else if (code.length === 13) {
        level = 4;
        type = (code[9] == '1') ? 1 : (code[9] == '2') ? 2 : null;
    }

    return { level: level, type: type };
}

// Fungsi untuk menyimpan data ke CSV menggunakan PapaParse
function saveToCsv(data, csvPath) {
    let csvContent = Papa.unparse(data, {
        header: true,
        skipEmptyLines: true,
        columns: ['Code', 'Name', 'Level', 'Type']
    });
    fs.writeFileSync(csvPath, csvContent);
    console.log(`Data berhasil disimpan ke ${csvPath}`);
}

// Fungsi untuk menyimpan data ke database MySQL
function saveToDatabase(data) {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    connection.connect();
    console.log('Connected to database');

    const query = `INSERT INTO ${process.env.DB_TABLE} (code, name, level, type) VALUES ?`;
    const values = data.map(row => [row[0], row[1], row[2], row[3]]);

    connection.query(query, [values], (error, results) => {
        if (error) {
            return console.error('Error saat menyimpan data ke database:', error);
        }
        console.log('Data berhasil disimpan ke database');
    });

    connection.end();
    console.log('Disconnected from database');
}

// Fungsi untuk prompt menyimpan data ke database MySQL
function saveToDatabasePrompt(data) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Apakah Anda ingin menyimpan data ke database MySQL? (y/n) ', answer => {
        if (answer.toLowerCase() === 'y') {
            saveToDatabase(data);
        }
        readline.close();
    });
}

// Jalankan ekstraksi
extractDataFromPdf(inputPdfPath);

const fs = require('fs');
const tabula = require('tabula-js');
const Papa = require('papaparse');

// Path ke file input dan output
const inputPath = './raw2.pdf';
const outputPath = './output.csv';

// Fungsi untuk mengecek apakah string adalah kode wilayah yang valid
function isCode(txt) {
    return /^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[1-2][0-9]{3})?)?)?$/.test(txt);
}

// Fungsi untuk mensanitasi nama wilayah
function sanitizeName(code, rawName) {
    let name = rawName;

    if (code.length == 2) { // provinsi
        name = rawName.replace(/\r/g, '');
    } else if (code.length == 5) { // kab/kota
        name = rawName.replace(/\r/g, '');
        name = name.replace(/[0-9]+/g, '');
        name = name.trim();
    } else if (code.length == 8) { // kecamatan
        name = rawName.replace(/^[-\d\s]*/, "");
    } else if (code.length == 13) { // desa
        name = rawName.replace(/^[-\d\s]*/, "");
    } else if (/^[-\d\s]*/.test(rawName)) {
        name = rawName.replace(/^[-\d\s]*/, "");
    } else {
        return null;
    }

    name = name.replace(/\s+/g, ' ').trim();

    // sanitasi kasus seperti `P A P U A`
    if (/^([A-Za-z] )+[A-Za-z]$/.test(name)) {
        name = name.replace(/\s/g, '');
    } else if (name.endsWith('elatan.')) {
        name = name.slice(0, -1);
    }

    name = name.replace(/"/g, "'");

    // Return the sanitized name only if it's not empty
    return name.trim() ? name : null;
}

// Fungsi untuk menyimpan data ke CSV menggunakan PapaParse
function saveToCsv(data, csvPath) {
    let csvContent = Papa.unparse(data, {
        header: true,
        columns: ['Code', 'Name']
    });
    fs.writeFileSync(csvPath, csvContent);
}

// Fungsi untuk mengekstrak data dari PDF
function extractDataFromPdf(inputPath, outputPath) {
    tabula(inputPath, { pages: 'all' }).extractCsv((err, data) => {
        if (err) {
            return console.error("Error saat mengekstrak data dari PDF:", err);
        }

        let dataRows = [];
        data.forEach((table) => {
            table.forEach((row) => {
                let columns = row.split(',');

                if (columns.length > 0 && isCode(columns[0])) {
                    let code = columns[0];
                    let rawName = columns.slice(1).join(' ');
                    let sanitizedName = sanitizeName(code, rawName);
                    if (sanitizedName) {
                        dataRows.push({ Code: code, Name: sanitizedName });
                    }
                }
            });
        });

        saveToCsv(dataRows, outputPath);
        console.log(`Data berhasil diekstrak dan disimpan ke ${outputPath}`);
    });
}

// Jalankan ekstraksi
extractDataFromPdf(inputPath, outputPath);

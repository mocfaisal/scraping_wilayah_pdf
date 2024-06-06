const fs = require('fs');
const pdf = require('pdf-parse');
const Papa = require('papaparse');
var pdf_table_extractor = require("pdf-table-extractor");

// Path ke file input dan output
const inputPath = './raw4.pdf';
const outputPath = './output.csv';

// PDFJS = require('pdfjs-dist');
// // PDFJS.cMapUrl = './pdf.js/build/generic/web/cmaps/';
// PDFJS.cMapPacked = true;

// Fungsi untuk mengecek apakah string adalah kode wilayah yang valid
function isCode(txt) {
    return /^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[1-2][0-9]{3})?)?)?$/.test(txt);
}

// Fungsi untuk mengekstrak data dari PDF
async function extractDataFromPdf(inputPath, outputPath) {
    try {
        // let dataBuffer = fs.readFileSync(inputPath);
        // var dataBuffer = new Uint8Array(fs.readFileSync(inputPath));
        // let data = await pdf(dataBuffer);
        // let pages = data.text.split('\n\n');

        // console.log(dataBuffer)

        // var data = new Uint8Array(fs.readFileSync(inputPath));
        // pdf_table_extractor(dataBuffer, success, error,false);
        pdf_table_extractor(inputPath, success, error, false);



        // var data = new Uint8Array(fs.readFileSync(inputPath));
        // PDFJS.getDocument(data).then(pdf_table_extractor).then(function (result) {
        //     console.log(JSON.stringify(result));
        // }, function (err) {
        //     console.error('Error: ' + err);
        // });


        return false;

        let relevantRanges = findRelevantRanges(pages);
        let relevantPages = getRelevantPages(pages, relevantRanges);

        let dataRows = [];
        for (let page of relevantPages) {
            let rows = page.split('\n');

            for (let row of rows) {
                let columns = row.split(/\s+/).filter(column => column.trim().length > 0); // Filter out empty columns

                // console.log(columns);

                for (let i = 0; i <= columns.length; i++) {
                    if (isCode(columns[0])) {
                        let code = columns[0];
                        if (code.length >= 2 && columns.length <= 6) {

                            console.log(columns)
                            let rawName = columns.slice(i + 1).join(' '); // Join the rest of the columns as name
                            let sanitizedName = sanitizeName(code, rawName);
                            if (sanitizedName) { // Only add if sanitizedName is not empty
                                dataRows.push([code, sanitizedName]);
                            }
                            break; // Break the loop after finding the valid code
                        }
                    }
                }
            }
        }

        saveToCsv(dataRows, outputPath);
        console.log(`Data berhasil diekstrak dan disimpan ke ${outputPath}`);
    } catch (err) {
        console.error("Error saat mengekstrak data dari PDF:", err);
    }
}

// Fungsi untuk menemukan halaman yang relevan dari PDF
function findRelevantRanges(pages) {
    let ranges = [];
    let temp = 0;

    for (let i = 0; i < pages.length; i++) {
        let page = pages[i];
        if (page.includes('B.B. RINCIAN KODE DAN DATA WILAYAH ADMINISTRASI')) {
            temp = i;
        } else if (page.includes('B. RINCIAN KODE DAN DATA WILAYAH ADMINISTRASI') && temp != 0) {
            ranges.push([temp, i]);
        }
    }

    return ranges;
}

// Fungsi untuk mendapatkan halaman yang relevan dari PDF berdasarkan rentang yang ditemukan
function getRelevantPages(pages, ranges) {
    let relevantPages = [];

    for (let range of ranges) {
        for (let i = range[0]; i < range[1]; i++) {
            relevantPages.push(pages[i]);
        }
    }

    return relevantPages;
}

//PDF parsed
function success(result) {
    //    console.log(JSON.stringify(result));
    // console.log(result.pageTables);
    var list_ = [];

    const data = result.pageTables;
    data.forEach(value => {
        let table_data = value.tables;
        // console.log(value.tables)
        table_data.forEach((col, j) => {

            let code = col[0];
            if (col.length == 9 && isCode(code)) {

                let rawName = [col[1], col[4], col[5], col[6]];
                let wil_name = sanitizeName2(code, rawName);
                // list_.push([j, [code, wil_name]
                    // // .filter(column => column.trim().length > 0)
                // ]);

                list_.push([code, wil_name]);
            }
        });


    });

    saveToCsv(list_, outputPath);

    // console.log(table_data)
    // console.log(list_)
}

//Error
function error(err) {
    console.error('Error: ' + err);
}

// Fungsi untuk mensanitasi nama wilayah
function sanitizeName(code, rawName) {
    let name = rawName;

    // console.log(code)
    if (code.length == 2) {
        // Provinsi
        name = rawName.replace(/\r/g, '');
    } else if (code.length == 5) {
        // Kab/kota
        name = rawName.replace(/\r/g, '');
        name = name.replace(/[0-9]+/g, '');
        name = name.trim();
    } else if (code.length == 8) {
        // Kecamatan
        name = rawName.replace(/^[-\d\s]*/, "");
    } else if (code.length == 13) {
        // Desa
        name = rawName.replace(/^[-\d\s]*/, "");
    } else if (/^[-\d\s]*/.test(rawName)) {
        name = rawName.replace(/^[-\d\s]*/, "");
    } else {
        // name = rawName.replace(/^[0-9]+\s+/, '');
        // name = name.replace(/^/g, ' ');
        return false;
    }

    name = name.replace(/\s+/g, ' ').trim();

    // sanitasi kasus seperti `P A P U A`
    if (/^([A-Za-z] )+[A-Za-z]$/.test(name)) {
        name = name.replace(/\s/g, '');
    } else if (name.endsWith('elatan.')) {
        name = name.slice(0, -1);
    }

    name = name.replace(/"/g, "'");
    // console.log(name)


    // Return the sanitized name only if it's not empty
    return name.trim() ? name : null;
}

function sanitizeName2(code, rawName) {
    let name = rawName;

    // console.log(code)
    if (code.length == 2) {
        // Provinsi
        name = rawName[0].replace(/\r/g, '');
    } else if (code.length == 5) {
        // Kab/kota
        name = rawName[0].replace(/\r/g, '');
        name = name.replace(/[0-9]+/g, '');
        name = name.trim();
    } else if (code.length == 8) {
        // Kecamatan
        name = rawName[1].replace(/^[-\d\s]*/, "");
    } else if (code.length == 13) {
        // Desa
        let rawNameVal = [rawName[2], rawName[3]].join(' ');
        name = rawNameVal.replace(/^[-\d\s]*/, "");

    } else if (/^[-\d\s]*/.test(rawName)) {
        let rawNameVal = [rawName[2], rawName[3]].join(' ');
        name = rawNameVal.replace(/^[-\d\s]*/, "");
    } else {
        // name = rawName.replace(/^[0-9]+\s+/, '');
        // name = name.replace(/^/g, ' ');
        return false;
    }

    name = name.replace(/\s+/g, ' ').trim();

    // sanitasi kasus seperti `P A P U A`
    if (/^([A-Za-z] )+[A-Za-z]$/.test(name)) {
        name = name.replace(/\s/g, '');
    } else if (name.endsWith('elatan.')) {
        name = name.slice(0, -1);
    }

    name = name.replace(/"/g, "'");
    // console.log(name)


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

// Jalankan ekstraksi
extractDataFromPdf(inputPath, outputPath);

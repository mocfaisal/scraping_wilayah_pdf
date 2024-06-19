
# Scraping Region PDF

Scraping Region from PDF with node.js

## Features

Export to

- CSV file
- Direct insert into MySQL database

## Installation

Clone the project

```bash
  git clone https://github.com/mocfaisal/scraping_wilayah_pdf.git
```

Go to the project directory

```bash
  cd scraping_wilayah_pdf
```

Copy `.env` file

```bash
  cp .env.example .env
```

### Environment Variables

To run this project, you will need to add the following environment variables to your .env file

```bash
DB_USER=YOUR_DB_USERNAME
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_DATABASE
DB_TABLE=YOUR_DB_TABLE
```

Install dependencies

```bash
  npm install
```

Start the project

```bash
  npm run test
```

## Note

- [Raw.pdf](/src/raw.pdf) is an extracted version of the original file, only pages with tables are used
- Please check folder `dist` is exists, if there's some error.

## Related

Here are some related projects

[Scraping Permendagri 72/2019 - Python](https://github.com/kodewilayah/permendagri-72-2019)

# Known Bugs
- [x] Kurang 1 Kabupaten/Kota - Fixed
- [ ] Jumlah Kelurahan/Desa tidak sama (83.749) seharusnya (83.763), kurang 14 data desa provinsi Papua

## Changelog

- [x] 2024-06-06 | v1.0 | Scrapping Data | Data Wilayah Kemendagri - Kepmen 100.1.1-6117 Tahun 2022

<?php

require_once 'vendor/autoload.php';

use Smalot\PdfParser\Parser;

ini_set('memory_limit', '-1');

// Set the path
$input_path = './raw.pdf';
$output_path = './dist/base.csv';

// Find relevant pages
$relevant_ranges = find_relevant_pages($input_path);

// Extract tables
$frames = extract_tables($input_path, $relevant_ranges);

// Process each frame
$code_to_raw_name = [];
$counter_kec = 0;
$counter_kel = 0;
$counter_des = 0;
foreach ($frames as $frame) {
    $tuples = parse_frame($frame);
    $code_to_raw_name = array_merge($code_to_raw_name, $tuples);
}

// Write to CSV
$csv_output = [];
foreach ($code_to_raw_name as $row) {
    list($code, $raw_name) = $row;
    list($ctr, $ctx) = parse_code($code, $counter_kec, $counter_kel, $counter_des);
    $name = sanitize_name($raw_name, $code, $ctx);
    $csv_output[] = [$code, $name];
}

$fp = fopen($output_path, 'w');
foreach ($csv_output as $fields) {
    fputcsv($fp, $fields);
}
fclose($fp);

echo "Data has been extracted and written to $output_path\n";

// Find relevant pages from PDF
function find_relevant_pages($path_to_pdf)
{
    $parser = new Parser();
    $pdf = $parser->parseFile($path_to_pdf);
    $text = $pdf->getText();

    $ranges = [];
    $temp = 0;
    $pages = explode("\n", $text);

    foreach ($pages as $i => $page) {
        if (strpos($page, 'b. Kode Dan Data Wilayah Administrasi') !== false) {
            $temp = $i + 1;
        } elseif (strpos($page, 'c. Rekapitulasi') !== false && $temp != 0) {
            $ranges[] = range($temp, $i + 1);
            $temp = 0;
        }
    }

    return $ranges;
}

// Extract tables from PDF
function extract_tables($input_path, $ranges)
{
    $parser = new Parser();
    $frames = [];

    foreach ($ranges as $range) {
        foreach ($range as $page) {
            $pdf = $parser->parseFile($input_path, $page);
            $text = $pdf->getText();
            $lines = explode("\n", $text);
            foreach ($lines as $line) {
                $cells = preg_split('/\s+/', $line, -1, PREG_SPLIT_NO_EMPTY);
                $frames[] = $cells;
            }
        }
    }

    return $frames;
}

// Check if the string is a valid code
function is_code($txt)
{
    return preg_match('/^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[1-2][0-9]{3})?)?)?$/', $txt);
}

// Parse code and update counters
function parse_code($code, &$counter_kec, &$counter_kel, &$counter_des)
{
    if (strlen($code) == 2) {
        $counter_kec = 0;
        $counter_kel = 0;
        $counter_des = 0;
        return ['', 'provinsi'];
    } elseif (strlen($code) == 5) {
        $counter_kec = 0;
        $counter_kel = 0;
        $counter_des = 0;
        return ['', 'kabkota'];
    } elseif (strlen($code) == 8) {
        $counter_kec += 1;
        $counter_kel = 0;
        $counter_des = 0;
        return [$counter_kec, 'kecamatan'];
    } elseif (strlen($code) == 13) {
        if ($code[9] == '1') {
            $counter_kel += 1;
            return [$counter_kel, 'kelurahan'];
        } elseif ($code[9] == '2') {
            $counter_des += 1;
            return [$counter_des, 'desa'];
        }
    }
    return ['', ''];
}

// Parse each frame
function parse_frame($frame)
{
    $output = [];
    foreach ($frame as $row) {
        $cells = array_filter($row);
        if (count($cells) >= 2 && is_code($cells[0])) {
            $code = $cells[0];
            $raw_name = implode(' ', array_slice($cells, 1));
            $output[] = [$code, $raw_name];
        }
    }
    return $output;
}

// Sanitize name
function sanitize_name($name, $code, $ctx)
{
    if ($ctx == 'provinsi') {
        return str_replace("\r", "", $name);
    } elseif ($ctx == 'kabkota') {
        $name = str_replace("\r", "", $name);
        $name = preg_replace('/[0-9]+/', '', $name);
        return trim($name);
    } elseif (preg_match('/\r[0-9]/', $name)) {
        return preg_replace('/\r[0-9]?/', ' ', $name);
    } else {
        $name = preg_replace('/^[0-9]+\s+/', '', $name);
        return str_replace("\r", ' ', $name);
    }
}

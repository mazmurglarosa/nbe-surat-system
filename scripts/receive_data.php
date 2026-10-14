<?php
/**
 * ============================================================================
 * REST API ENDPOINT - PENERIMAAN DATA SATU ARAH
 * Backend Script (PHP Native + PDO MySQL)
 * PT Nirwana Bhumi Energi (NBE)
 * ============================================================================
 * 
 * Fitur Keamanan & Validasi:
 * 1. Hanya mengizinkan HTTP Method: POST
 * 2. Autentikasi ketat via HTTP Header 'X-API-KEY' atau 'API-KEY'
 * 3. Sanitasi & validasi input JSON body (nama, tanggal, keterangan)
 * 4. PDO Prepared Statement anti SQL Injection
 * 5. Standar response HTTP Status Code & format JSON konsisten
 */

// 1. Set Header Response & CORS
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, API-KEY, X-API-KEY, Authorization');

// Tangani HTTP Preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Validasi HTTP Method (Wajib POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status'  => 'error',
        'code'    => 405,
        'pesan'   => 'Metode request tidak diizinkan. Gunakan metode POST.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

// 3. Konfigurasi Kunci Rahasia API Key
define('VALID_API_KEY', 'DRX-998877-SEC');

// Fungsi pembantu untuk mengambil HTTP Header secara konsisten di berbagai web server (Apache/Nginx/LiteSpeed)
function getHeaderValue($headerName) {
    $normalizedName = strtoupper(str_replace('-', '_', $headerName));
    
    // Cek di $_SERVER
    if (isset($_SERVER['HTTP_' . $normalizedName])) {
        return $_SERVER['HTTP_' . $normalizedName];
    }
    if (isset($_SERVER[$normalizedName])) {
        return $_SERVER[$normalizedName];
    }
    
    // Fallback jika menggunakan apache_request_headers
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strcasecmp($key, $headerName) === 0) {
                return $value;
            }
        }
    }
    
    return null;
}

// 4. Verifikasi Keberadaan & Validitas API Key
$incomingApiKey = getHeaderValue('API-KEY') ?? getHeaderValue('X-API-KEY');

if (!$incomingApiKey || trim($incomingApiKey) !== VALID_API_KEY) {
    http_response_code(401);
    echo json_encode([
        'status'  => 'error',
        'code'    => 401,
        'pesan'   => 'Unauthorized: API-KEY tidak valid atau tidak ditemukan dalam HTTP Headers.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

// 5. Membaca & Mem-parsing Raw JSON Payload Body
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// Jika bukan JSON, cek apakah dikirim via Form URL-Encoded / FormData
if (!is_array($data)) {
    $data = $_POST;
}

// 6. Validasi Parameter Standar Pendataan (nama, tanggal, keterangan)
$nama       = isset($data['nama']) ? trim((string)$data['nama']) : '';
$tanggal    = isset($data['tanggal']) ? trim((string)$data['tanggal']) : '';
$keterangan = isset($data['keterangan']) ? trim((string)$data['keterangan']) : '';

// Validasi kelengkapan field wajib
$errors = [];
if (empty($nama)) {
    $errors[] = "Parameter 'nama' wajib diisi.";
}

if (empty($tanggal)) {
    $errors[] = "Parameter 'tanggal' wajib diisi (format: YYYY-MM-DD).";
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
    $errors[] = "Format 'tanggal' tidak valid. Gunakan format YYYY-MM-DD (contoh: " . date('Y-m-d') . ").";
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'code'    => 400,
        'pesan'   => 'Validasi input gagal.',
        'detail'  => $errors
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

// 7. Konfigurasi & Koneksi Database Lokal (MySQL PDO)
$dbHost = 'localhost';
$dbName = 'db_nbe_pendataan';
$dbUser = 'root';
$dbPass = '';

try {
    // Inisialisasi koneksi PDO
    $pdo = new PDO(
        "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );

    // Otomatis buat tabel jika belum ada (Simulasi Schema DDL)
    $createTableQuery = "
        CREATE TABLE IF NOT EXISTS data_direksi (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            tanggal DATE NOT NULL,
            keterangan TEXT NULL,
            ip_pengirim VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    $pdo->exec($createTableQuery);

    // 8. Eksekusi Insert Data menggunakan Prepared Statement
    $ipPengirim = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';

    $insertSql = "INSERT INTO data_direksi (nama, tanggal, keterangan, ip_pengirim) VALUES (:nama, :tanggal, :keterangan, :ip)";
    $stmt = $pdo->prepare($insertSql);
    $stmt->execute([
        ':nama'       => $nama,
        ':tanggal'    => $tanggal,
        ':keterangan' => $keterangan ?: null,
        ':ip'         => $ipPengirim
    ]);

    $insertedId = $pdo->lastInsertId();

    // 9. Response Sukses Baku (HTTP 201 Created)
    http_response_code(201);
    echo json_encode([
        'status' => 'sukses',
        'code'   => 201,
        'pesan'  => 'Data berhasil diterima dan disimpan ke sistem database lokal.',
        'data'   => [
            'id'         => (int)$insertedId,
            'nama'       => $nama,
            'tanggal'    => $tanggal,
            'keterangan' => $keterangan,
            'waktu_simpan' => date('Y-m-d H:i:s')
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    // 10. Tangani Kesalahan Database (HTTP 500 Internal Server Error)
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'code'   => 500,
        'pesan'  => 'Terjadi kesalahan sistem saat menyimpan ke database lokal.',
        // Untuk production, sembunyikan $e->getMessage() dari user eksternal
        'debug'  => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

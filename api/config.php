<?php
// AltF4 Gaming Center — cấu hình API lưu dữ liệu bằng tệp (không cần MySQL).
// Toàn bộ dữ liệu nằm trong thư mục ../data nên commit lên Git là người khác lấy về vẫn còn nguyên.
define('DATA_DIR', realpath(__DIR__ . '/../data') ?: (__DIR__ . '/../data'));
define('STATE_FILE', DATA_DIR . '/state.json');
define('LOCK_FILE', DATA_DIR . '/.state.lock');
define('UPLOAD_DIR', DATA_DIR . '/uploads');
define('MAX_STATE_BYTES', 12 * 1024 * 1024);
define('MAX_IMAGE_BYTES', 6 * 1024 * 1024);

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensure_dirs(): void {
    foreach ([DATA_DIR, UPLOAD_DIR] as $d) {
        if (!is_dir($d)) @mkdir($d, 0775, true);
    }
}

/** Đọc số phiên bản (rev) ở đầu tệp state.json: {"rev":N,... */
function read_rev(string $raw): int {
    return preg_match('/^\s*\{\s*"rev"\s*:\s*(\d+)/', $raw, $m) ? (int)$m[1] : 0;
}

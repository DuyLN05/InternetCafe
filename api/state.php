<?php
require __DIR__ . '/config.php';
ensure_dirs();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!is_file(STATE_FILE)) json_out(['empty' => true, 'rev' => 0]);
    $raw = file_get_contents(STATE_FILE);
    if ($raw === false || $raw === '') json_out(['empty' => true, 'rev' => 0]);
    $rev = read_rev($raw);
    if (isset($_GET['rev']) && (int)$_GET['rev'] === $rev) json_out(['unchanged' => true, 'rev' => $rev]);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo $raw;
    exit;
}

if ($method === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === false || $body === '' || strlen($body) > MAX_STATE_BYTES) json_out(['error' => 'Dữ liệu rỗng hoặc quá lớn.'], 413);
    $decoded = json_decode($body, true);
    if (!is_array($decoded) || !isset($decoded['machines'], $decoded['products'])) json_out(['error' => 'Dữ liệu không hợp lệ.'], 422);
    $clientRev = (int)($_GET['rev'] ?? 0);

    $lock = fopen(LOCK_FILE, 'c');
    if (!$lock || !flock($lock, LOCK_EX)) json_out(['error' => 'Không khóa được tệp dữ liệu.'], 500);
    $current = is_file(STATE_FILE) ? read_rev((string)file_get_contents(STATE_FILE)) : 0;
    if ($current !== $clientRev) {
        flock($lock, LOCK_UN); fclose($lock);
        json_out(['conflict' => true, 'rev' => $current], 409);
    }
    $next = $current + 1;
    // Ghi nguyên văn JSON của client (không decode/encode lại để giữ nguyên {} và []) + rev đứng đầu.
    $doc = '{"rev":' . $next . ',"savedAt":"' . date('c') . '","state":' . $body . "}\n";
    $tmp = STATE_FILE . '.tmp';
    if (file_put_contents($tmp, $doc) === false || !@rename($tmp, STATE_FILE)) {
        // Windows đôi khi không rename đè được → ghi trực tiếp
        if (file_put_contents(STATE_FILE, $doc) === false) {
            flock($lock, LOCK_UN); fclose($lock);
            json_out(['error' => 'Không ghi được data/state.json — kiểm tra quyền ghi thư mục data.'], 500);
        }
        @unlink($tmp);
    }
    flock($lock, LOCK_UN); fclose($lock);
    json_out(['ok' => true, 'rev' => $next]);
}

json_out(['error' => 'Phương thức không được hỗ trợ.'], 405);

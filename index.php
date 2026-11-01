<?php
// Trang vào khi mở http://localhost/<thư-mục>/ trong XAMPP:
// tự chuyển sang bản đã build (dist/) hoặc hướng dẫn build nếu chưa có.
$dist = __DIR__ . '/dist/index.html';
$problem = null;
if (!is_file($dist)) {
    $problem = 'missing';
} else {
    $html = (string)file_get_contents($dist);
    if (preg_match('#(src|href)="/assets/#', $html)) $problem = 'absolute';
}
if ($problem === null) { header('Location: dist/'); exit; }
http_response_code(200);
?><!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AltF4 Gaming Center · Cần build</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090b12;color:#e8ecf6;font:15px/1.6 system-ui,Segoe UI,sans-serif}
  main{max-width:640px;padding:32px;border:1px solid #243049;background:#10162a}
  h1{margin:0 0 6px;font-size:22px;color:#00e5ff} code{background:#0b0e1a;padding:2px 8px;border:1px solid #243049;color:#7cf2ff}
  ol{padding-left:20px} li{margin:8px 0} .warn{color:#ffb300}
</style></head><body><main>
<h1>AltF4 Gaming Center</h1>
<?php if ($problem === 'absolute'): ?>
<p class="warn">Thư mục <code>dist/</code> được build sai kiểu (đường dẫn tuyệt đối) nên trang sẽ trắng.</p>
<?php else: ?>
<p>Dự án chưa được build nên chưa có giao diện để hiển thị.</p>
<?php endif; ?>
<ol>
  <li>Mở terminal trong thư mục dự án và chạy <code>npm install</code></li>
  <li>Chạy <code>npm run build:xampp</code></li>
  <li>Tải lại trang này — web sẽ tự mở bản build.</li>
</ol>
<p>Lưu ý: không mở trực tiếp <code>index.html</code> ở thư mục gốc (đó là mã nguồn Vite, sẽ ra trang trắng).</p>
</main></body></html>

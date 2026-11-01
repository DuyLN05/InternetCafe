<?php
require __DIR__ . '/config.php';
ensure_dirs();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['error' => 'Chỉ nhận POST.'], 405);
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) json_out(['error' => 'Không nhận được tệp ảnh.'], 400);

$f = $_FILES['file'];
if ($f['size'] > MAX_IMAGE_BYTES) json_out(['error' => 'Ảnh quá lớn (tối đa 6 MB).'], 413);

$info = @getimagesize($f['tmp_name']);
$map = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
if (!$info || !isset($map[$info[2]])) json_out(['error' => 'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.'], 415);

$ext = $map[$info[2]];
$name = substr(sha1_file($f['tmp_name']), 0, 20) . '.' . $ext;   // cùng nội dung → cùng tên, không trùng lặp
$dest = UPLOAD_DIR . '/' . $name;
if (!is_file($dest) && !move_uploaded_file($f['tmp_name'], $dest)) json_out(['error' => 'Không lưu được ảnh — kiểm tra quyền ghi data/uploads.'], 500);

json_out(['ok' => true, 'name' => 'uploads/' . $name]);

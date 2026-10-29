<?php
$A=p('a');
if($A==='cfg')tx(function(){foreach(['min_minutes','low_balance','default_rate'] as $k){$v=max(0,(int)p($k));q('UPDATE settings SET v=? WHERE k=?',[$v,$k]);}audit('settings.save');},'Đã lưu cấu hình');
if($A==='backup'){audit('backup.download');header('Content-Type: application/sql');header('Content-Disposition: attachment; filename=quannet_'.date('Ymd_His').'.sql');echo dump_sql();exit;}
if($A==='restore')tx(function(){
 $f=$_FILES['sql']??null;if(!$f||$f['error']||!str_ends_with(strtolower($f['name']),'.sql'))throw new Exception('Chọn file .sql hợp lệ.');
 if(p('confirm')!=='PHUCHOI')throw new Exception('Gõ PHUCHOI để xác nhận.');
 db()->commit();db()->exec('SET FOREIGN_KEY_CHECKS=0');
 foreach(array_filter(array_map('trim',explode(";\n",file_get_contents($f['tmp_name'])))) as $s)db()->exec($s);
 db()->exec('SET FOREIGN_KEY_CHECKS=1');db()->beginTransaction();audit('backup.restore',$f['name']);},'Đã phục hồi dữ liệu');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=system');
$log=all('SELECT a.*,u.username FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 200');
head('Hệ thống: cấu hình, nhật ký, sao lưu');?>
<div class="cols"><section class="card"><h2>Quy tắc tính phí & cấu hình</h2><form method="post"><?=field()?><input type="hidden" name="a" value="cfg"><label>Phút tính phí tối thiểu<input type="number" name="min_minutes" value="<?=(int)cfg('min_minutes')?>"></label><label>Ngưỡng cảnh báo số dư thấp (₫)<input type="number" name="low_balance" value="<?=(int)cfg('low_balance')?>"></label><label>Đơn giá mặc định máy mới (₫/giờ)<input type="number" name="default_rate" value="<?=(int)cfg('default_rate')?>"></label><button>Lưu cấu hình</button></form></section>
<section class="card"><h2>Sao lưu & phục hồi</h2><form method="post"><?=field()?><input type="hidden" name="a" value="backup"><button>Tải bản sao lưu (.sql)</button></form><hr><form method="post" enctype="multipart/form-data"><?=field()?><input type="hidden" name="a" value="restore"><input type="file" name="sql" accept=".sql" required><input name="confirm" placeholder="Gõ PHUCHOI để xác nhận" required><button class="danger">Phục hồi</button></form><p class="mut">Sao lưu định kỳ: lên lịch <code>php cron_backup.php</code>.</p></section></div>
<h2>Nhật ký thao tác (200 gần nhất)</h2><table><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Chi tiết</th><th>IP</th></tr><?php foreach($log as $l)echo '<tr><td>'.dt($l['created_at']).'</td><td>'.h($l['username']).'</td><td>'.h($l['action']).'</td><td>'.h($l['detail']).'</td><td>'.h($l['ip']).'</td></tr>';?></table>
<?php foot();

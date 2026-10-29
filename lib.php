<?php
require __DIR__.'/config.php';
date_default_timezone_set('Asia/Ho_Chi_Minh');
session_start();
const LV=['cashier'=>1,'manager'=>2,'admin'=>3];
function db(){static $d;if(!$d){$d=new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',DB_USER,DB_PASS,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);$d->exec("SET time_zone='+07:00'");}return $d;}
function q($s,$p=[]){$t=db()->prepare($s);$t->execute($p);return $t;}
function all($s,$p=[]){return q($s,$p)->fetchAll();}
function one($s,$p=[]){return q($s,$p)->fetch()?:null;}
function h($s){return htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');}
function vnd($n){return number_format((float)$n,0,',','.').' ₫';}
function dt($s){return $s?date('d/m/Y H:i',strtotime($s)):'—';}
function p($k){return trim($_POST[$k]??'');}
function cfg($k){static $c;if($c===null)$c=array_column(all('SELECT k,v FROM settings'),'v','k');return $c[$k]??null;}
function user(){return $_SESSION['u']??null;}
function uid(){return $_SESSION['u']['id']??null;}
function lvl(){return LV[$_SESSION['u']['role']??'']??0;}
function go($u){header('Location: '.$u);exit;}
function need($l){if(!user())go('login.php');if(lvl()<$l){http_response_code(403);exit('403 - Bạn không đủ quyền thực hiện chức năng này.');}}
function tok(){return $_SESSION['t']??=bin2hex(random_bytes(16));}
function field(){return '<input type="hidden" name="_t" value="'.tok().'">';}
function chk(){if(!hash_equals(tok(),$_POST['_t']??'')){http_response_code(400);exit('CSRF token không hợp lệ.');}}
function flash($m,$t='ok'){$_SESSION['f'][]=[$m,$t];}
function audit($a,$d=''){q('INSERT INTO audit_log(user_id,action,detail,ip) VALUES(?,?,?,?)',[uid(),$a,$d,$_SERVER['REMOTE_ADDR']??'cli']);}
// Chạy trong transaction; lỗi nghiệp vụ -> rollback + báo lỗi
function tx($f,$ok='Đã lưu'){try{db()->beginTransaction();$f();db()->commit();flash($ok);}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();flash($e instanceof PDOException?'Dữ liệu không hợp lệ hoặc bị trùng.':$e->getMessage(),'err');}}
// Quy tắc tính phí: tối thiểu min_minutes, làm tròn lên phút, tiền làm tròn lên 100đ, đơn giá lưu lúc mở phiên
function fee($sec,$rate){$m=max((int)cfg('min_minutes'),(int)ceil($sec/60));return [$m,(int)(ceil($m*$rate/60/100)*100)];}
function release($mid){$t=one("SELECT COUNT(*) c FROM maintenance WHERE machine_id=? AND status<>'done'",[$mid])['c'];q('UPDATE machines SET status=? WHERE id=?',[$t?'maintenance':'available',$mid]);}
// Tạo hóa đơn + thanh toán (gọi trong transaction)
function pay($kind,$ref,$mid,$total,$method){
 if(!in_array($method,['cash','wallet','transfer'],true))throw new Exception('Phương thức thanh toán không hợp lệ.');
 if($method==='wallet'){
  if(!$mid)throw new Exception('Cần chọn hội viên để trừ ví.');
  $m=one('SELECT balance FROM members WHERE id=? FOR UPDATE',[$mid]);
  if(!$m||$m['balance']<$total)throw new Exception('Số dư ví không đủ để thanh toán.');
  $nb=$m['balance']-$total;q('UPDATE members SET balance=? WHERE id=?',[$nb,$mid]);
  q("INSERT INTO wallet_tx(member_id,type,amount,balance_after,note,user_id) VALUES(?,'pay',?,?,?,?)",[$mid,-$total,$nb,"$kind #$ref",uid()]);
 }
 $sh=one("SELECT id FROM shifts WHERE user_id=? AND status='open'",[uid()]);
 q('INSERT INTO invoices(code,kind,ref_id,member_id,user_id,total,shift_id) VALUES(?,?,?,?,?,?,?)',['HD'.date('ymdHis').random_int(100,999),$kind,$ref,$mid?:null,uid(),$total,$sh['id']??null]);
 $id=db()->lastInsertId();q('INSERT INTO payments(invoice_id,method,amount) VALUES(?,?,?)',[$id,$method,$total]);return $id;}
function dump_sql(){$o="SET FOREIGN_KEY_CHECKS=0;\n";foreach(db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t){$o.="DROP TABLE IF EXISTS `$t`;\n".db()->query("SHOW CREATE TABLE `$t`")->fetch(PDO::FETCH_NUM)[1].";\n";foreach(db()->query("SELECT * FROM `$t`") as $r){$o.="INSERT INTO `$t` VALUES(".implode(',',array_map(fn($v)=>$v===null?'NULL':db()->quote($v),array_values($r))).");\n";}}return $o."SET FOREIGN_KEY_CHECKS=1;\n";}
function head($title){
 $nav=[['dashboard','Tổng quan',1],['machines','Máy & phiên',1],['members','Hội viên & ví',1],['orders','Gọi món',1],['invoices','Hóa đơn',1],['maintenance','Bảo trì',1],['shifts','Ca làm việc',1],['inventory','Kho & sản phẩm',2],['reports','Báo cáo',2],['staff','Nhân viên',2],['system','Hệ thống',3]];
 $cur=$_GET['p']??'dashboard';$u=user();
 echo '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.h($title).' · Quản lý quán net</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="assets/style.css"></head><body><aside><div class="brand">Alt F4<small>Quản lý quán net</small></div><nav>';
 foreach($nav as $n)if(lvl()>=$n[2])echo '<a href="?p='.$n[0].'"'.($cur===$n[0]?' class="on"':'').'>'.$n[1].'</a>';
 echo '</nav><div class="me">'.h($u['fullname']).'<small>'.h($u['role']).'</small><a href="?p=password">Đổi mật khẩu</a><a href="login.php?out=1">Đăng xuất</a></div></aside><main><h1>'.h($title).'</h1>';
 foreach($_SESSION['f']??[] as $f)echo '<div class="msg '.$f[1].'">'.h($f[0]).'</div>';unset($_SESSION['f']);}
function foot(){echo '</main></body></html>';}

<?php
function shift_cash($s){
 $end=$s['close_at'];
 $c=one("SELECT COALESCE(SUM(p.amount),0) v FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.shift_id=? AND p.method='cash' AND i.status='paid'",[$s['id']])['v'];
 $t=one("SELECT COALESCE(SUM(amount),0) v FROM wallet_tx WHERE user_id=? AND type='topup' AND note='cash' AND created_at BETWEEN ? AND COALESCE(?,NOW())",[$s['user_id'],$s['open_at'],$end])['v'];
 return (int)$s['open_cash']+$c+$t;}
$A=p('a');
if($A==='open')tx(function(){
 if(one("SELECT id FROM shifts WHERE user_id=? AND status='open'",[uid()]))throw new Exception('Bạn đang có ca mở.');
 q("INSERT INTO shifts(user_id,open_at,open_cash) VALUES(?,NOW(),?)",[uid(),max(0,(int)p('cash'))]);audit('shift.open');},'Đã mở ca');
if($A==='close')tx(function(){
 $s=one("SELECT * FROM shifts WHERE user_id=? AND status='open' FOR UPDATE",[uid()]);if(!$s)throw new Exception('Không có ca đang mở.');
 $e=shift_cash($s);$c=max(0,(int)p('cash'));q("UPDATE shifts SET status='closed',close_at=NOW(),expected_cash=?,counted_cash=? WHERE id=?",[$e,$c,$s['id']]);audit('shift.close',"lệch ".($c-$e));},'Đã kết ca');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=shifts');
$cur=one("SELECT * FROM shifts WHERE user_id=? AND status='open'",[uid()]);
$hist=all('SELECT s.*,u.fullname FROM shifts s JOIN users u ON u.id=s.user_id '.(lvl()>=2?'':'WHERE s.user_id='.(int)uid()).' ORDER BY s.id DESC LIMIT 30');
head('Ca làm việc');?>
<section class="card"><?php if($cur):$e=shift_cash($cur);?><h2>Ca đang mở từ <?=dt($cur['open_at'])?></h2><p>Tiền đầu ca <?=vnd($cur['open_cash'])?> · Tiền mặt dự kiến trong két: <b><?=vnd($e)?></b></p>
<form method="post" class="row"><?=field()?><input type="hidden" name="a" value="close"><input type="number" name="cash" min="0" placeholder="Tiền mặt kiểm đếm thực tế" required><button>Kết ca & đối chiếu</button></form>
<?php else:?><h2>Mở ca mới</h2><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="open"><input type="number" name="cash" min="0" value="0" placeholder="Tiền đầu ca"><button>Mở ca</button></form><?php endif;?></section>
<table><tr><th>Nhân viên</th><th>Mở</th><th>Kết</th><th>Đầu ca</th><th>Dự kiến</th><th>Thực đếm</th><th>Chênh lệch</th></tr>
<?php foreach($hist as $s){$d=$s['status']==='closed'?$s['counted_cash']-$s['expected_cash']:null;echo '<tr><td>'.h($s['fullname']).'</td><td>'.dt($s['open_at']).'</td><td>'.dt($s['close_at']).'</td><td>'.vnd($s['open_cash']).'</td><td>'.($s['status']==='closed'?vnd($s['expected_cash']):'—').'</td><td>'.($s['status']==='closed'?vnd($s['counted_cash']):'—').'</td><td class="'.($d?'warn':'').'">'.($d===null?'Đang mở':vnd($d)).'</td></tr>';}?></table>
<?php foot();

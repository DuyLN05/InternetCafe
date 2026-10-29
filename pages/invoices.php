<?php
// Hóa đơn không bao giờ bị xóa; chỉ quản lý được hoàn tiền (đánh dấu hoàn).
if(p('a')==='refund'&&lvl()>=2)tx(function(){
 $i=one('SELECT i.*,p.method FROM invoices i JOIN payments p ON p.invoice_id=i.id WHERE i.id=? FOR UPDATE',[(int)p('id')]);
 if(!$i||$i['status']!=='paid')throw new Exception('Hóa đơn không thể hoàn.');if(strlen(p('reason'))<3)throw new Exception('Phải nhập lý do hoàn tiền.');
 q("UPDATE invoices SET status='refunded',refund_reason=? WHERE id=?",[p('reason'),$i['id']]);
 if($i['method']==='wallet'&&$i['member_id']){$m=one('SELECT balance FROM members WHERE id=? FOR UPDATE',[$i['member_id']]);$nb=$m['balance']+$i['total'];
  q('UPDATE members SET balance=? WHERE id=?',[$nb,$i['member_id']]);q("INSERT INTO wallet_tx(member_id,type,amount,balance_after,note,user_id) VALUES(?,'refund',?,?,?,?)",[$i['member_id'],$i['total'],$nb,'Hoàn '.$i['code'],uid()]);}
 if($i['kind']==='order')foreach(all('SELECT * FROM order_items WHERE order_id=?',[$i['ref_id']]) as $it){q('UPDATE products SET stock=stock+? WHERE id=?',[$it['qty'],$it['product_id']]);q("INSERT INTO stock_moves(product_id,type,qty,note,user_id) VALUES(?,'refund',?,?,?)",[$it['product_id'],$it['qty'],'Hoàn '.$i['code'],uid()]);}
 audit('invoice.refund',$i['code'].' | '.p('reason'));},'Đã hoàn tiền hóa đơn');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=invoices&id='.(int)p('id'));
$id=(int)($_GET['id']??0);head('Hóa đơn & thanh toán');
if($id){$i=one('SELECT i.*,p.method,m.name mname,u.fullname uname FROM invoices i JOIN payments p ON p.invoice_id=i.id LEFT JOIN members m ON m.id=i.member_id JOIN users u ON u.id=i.user_id WHERE i.id=?',[$id]);
 if($i){$mt=['cash'=>'Tiền mặt','wallet'=>'Trừ ví','transfer'=>'Chuyển khoản'];?>
<section class="card"><h2>Hóa đơn <?=h($i['code'])?> <span class="tag"><?=$i['status']==='paid'?'Đã thanh toán':'Đã hoàn'?></span></h2><p><?=dt($i['created_at'])?> · Thu ngân: <?=h($i['uname'])?> · Hội viên: <?=h($i['mname']?:'Khách vãng lai')?> · <?=$mt[$i['method']]?></p>
<table><tr><th>Nội dung</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
<?php if($i['kind']==='order')foreach(all('SELECT * FROM order_items WHERE order_id=?',[$i['ref_id']]) as $t)echo '<tr><td>'.h($t['name']).'</td><td>'.$t['qty'].'</td><td>'.vnd($t['price']).'</td><td>'.vnd($t['price']*$t['qty']).'</td></tr>';
else{$s=one('SELECT s.*,m.name mn FROM sessions s JOIN machines m ON m.id=s.machine_id WHERE s.id=?',[$i['ref_id']]);echo '<tr><td>Giờ chơi '.h($s['mn']).' ('.dt($s['start_at']).' → '.dt($s['end_at']).')</td><td>'.$s['minutes'].' phút</td><td>'.vnd($s['rate_hour']).'/giờ</td><td>'.vnd($i['total']).'</td></tr>';}?></table>
<h3>Tổng: <?=vnd($i['total'])?></h3><?php if($i['refund_reason'])echo '<p class="warn">Lý do hoàn: '.h($i['refund_reason']).'</p>';?>
<button onclick="print()" class="alt">In hóa đơn</button>
<?php if($i['status']==='paid'&&lvl()>=2):?><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="refund"><input type="hidden" name="id" value="<?=$i['id']?>"><input name="reason" placeholder="Lý do hoàn tiền" required><button class="danger">Hoàn tiền</button></form><?php endif;?></section><?php }}
$f=$_GET['d']??date('Y-m-d');$rows=all('SELECT i.*,p.method,m.name mname FROM invoices i JOIN payments p ON p.invoice_id=i.id LEFT JOIN members m ON m.id=i.member_id WHERE DATE(i.created_at)=? ORDER BY i.id DESC',[$f]);?>
<form class="row"><input type="hidden" name="p" value="invoices"><input type="date" name="d" value="<?=h($f)?>"><button>Xem</button></form>
<table><tr><th>Mã</th><th>Thời gian</th><th>Loại</th><th>Hội viên</th><th>Phương thức</th><th>Tổng</th><th>Trạng thái</th><th></th></tr><?php foreach($rows as $r)echo '<tr><td>'.h($r['code']).'</td><td>'.dt($r['created_at']).'</td><td>'.($r['kind']==='order'?'Đồ ăn/uống':'Giờ chơi').'</td><td>'.h($r['mname']?:'—').'</td><td>'.h($r['method']).'</td><td>'.vnd($r['total']).'</td><td>'.($r['status']==='paid'?'Đã thanh toán':'Đã hoàn').'</td><td><a href="?p=invoices&id='.$r['id'].'">Chi tiết</a></td></tr>';?></table>
<?php foot();

<?php
$A=p('a');
if($A==='reg')tx(function(){
 if(strlen(p('name'))<2)throw new Exception('Nhập tên hội viên.');
 q('INSERT INTO members(code,name,phone) VALUES(?,?,?)',[uniqid('T'),p('name'),p('phone')]);$id=db()->lastInsertId();
 q('UPDATE members SET code=? WHERE id=?',['HV'.str_pad($id,4,'0',STR_PAD_LEFT),$id]);audit('member.reg',p('name'));},'Đã đăng ký hội viên');
if($A==='topup')tx(function(){
 $a=(int)p('amount');if($a<1000||$a>50000000)throw new Exception('Số tiền nạp phải từ 1.000 đến 50.000.000.');
 $m=one('SELECT balance FROM members WHERE id=? FOR UPDATE',[(int)p('id')]);if(!$m)throw new Exception('Không tìm thấy hội viên.');
 $nb=$m['balance']+$a;q('UPDATE members SET balance=? WHERE id=?',[$nb,(int)p('id')]);
 q("INSERT INTO wallet_tx(member_id,type,amount,balance_after,note,user_id) VALUES(?,'topup',?,?,?,?)",[(int)p('id'),$a,$nb,p('method')==='transfer'?'transfer':'cash',uid()]);audit('wallet.topup',p('id').": $a");},'Đã nạp tiền vào ví');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=members'.(p('id')&&$A==='topup'?'&id='.(int)p('id'):''));
$s=trim($_GET['s']??'');$id=(int)($_GET['id']??0);
$ms=all('SELECT * FROM members WHERE name LIKE ? OR code LIKE ? OR phone LIKE ? ORDER BY id DESC LIMIT 100',["%$s%","%$s%","%$s%"]);
head('Hội viên & ví');$low=(int)cfg('low_balance');?>
<div class="cols"><section class="card"><h2>Đăng ký hội viên</h2><form method="post"><?=field()?><input type="hidden" name="a" value="reg"><input name="name" placeholder="Họ tên" required><input name="phone" placeholder="Số điện thoại"><button>Đăng ký</button></form></section>
<section class="card"><h2>Tìm hội viên</h2><form class="row"><input type="hidden" name="p" value="members"><input name="s" value="<?=h($s)?>" placeholder="Tên, mã hoặc SĐT"><button>Tìm</button></form></section></div>
<table><tr><th>Mã</th><th>Họ tên</th><th>SĐT</th><th>Số dư</th><th>Nạp tiền</th><th></th></tr>
<?php foreach($ms as $m):?><tr><td><?=h($m['code'])?></td><td><?=h($m['name'])?></td><td><?=h($m['phone'])?></td><td class="<?=$m['balance']<$low?'warn':''?>"><?=vnd($m['balance'])?><?=$m['balance']<$low?' (thấp)':''?></td>
<td><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="topup"><input type="hidden" name="id" value="<?=$m['id']?>"><input type="number" name="amount" min="1000" step="1000" placeholder="Số tiền" required><select name="method"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select><button>Nạp</button></form></td><td><a href="?p=members&id=<?=$m['id']?>">Lịch sử ví</a></td></tr><?php endforeach;?></table>
<?php if($id){$tx=all('SELECT * FROM wallet_tx WHERE member_id=? ORDER BY id DESC LIMIT 100',[$id]);$mb=one('SELECT * FROM members WHERE id=?',[$id]);?>
<section class="card"><h2>Lịch sử ví: <?=h($mb['name']??'')?></h2><table><tr><th>Thời gian</th><th>Loại</th><th>Số tiền</th><th>Số dư sau</th><th>Ghi chú</th></tr><?php foreach($tx as $t)echo '<tr><td>'.dt($t['created_at']).'</td><td>'.h($t['type']).'</td><td>'.vnd($t['amount']).'</td><td>'.vnd($t['balance_after']).'</td><td>'.h($t['note']).'</td></tr>';?></table></section><?php }
foot();

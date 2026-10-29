<?php
$A=p('a');
if($A==='open')tx(function(){
 $m=one('SELECT * FROM machines WHERE id=? FOR UPDATE',[(int)p('id')]);
 if(!$m||$m['status']!=='available')throw new Exception('Máy không sẵn sàng (đang dùng hoặc đang bảo trì).');
 q('INSERT INTO sessions(machine_id,member_id,user_id,start_at,rate_hour) VALUES(?,?,?,NOW(),?)',[$m['id'],p('member_id')?:null,uid(),$m['rate_hour']]);
 q("UPDATE machines SET status='busy' WHERE id=?",[$m['id']]);audit('session.open',$m['name']);},'Đã mở phiên');
if($A==='close')tx(function(){
 $s=one("SELECT s.*,TIMESTAMPDIFF(SECOND,start_at,NOW()) sec FROM sessions s WHERE id=? AND status='open' FOR UPDATE",[(int)p('id')]);
 if(!$s)throw new Exception('Phiên không tồn tại hoặc đã kết thúc.');
 [$min,$f]=fee($s['sec'],$s['rate_hour']);$iv=pay('session',$s['id'],$s['member_id'],$f,p('method'));
 q("UPDATE sessions SET end_at=NOW(),minutes=?,fee=?,status='closed',invoice_id=? WHERE id=?",[$min,$f,$iv,$s['id']]);
 release($s['machine_id']);audit('session.close',"#{$s['id']}: $min phút, $f đ");},'Đã kết thúc phiên & thanh toán');
if($A==='move')tx(function(){
 $s=one("SELECT * FROM sessions WHERE id=? AND status='open' FOR UPDATE",[(int)p('id')]);
 $n=one('SELECT * FROM machines WHERE id=? FOR UPDATE',[(int)p('to')]);
 if(!$s||!$n||$n['status']!=='available')throw new Exception('Máy đích không sẵn sàng.');
 q('UPDATE sessions SET machine_id=? WHERE id=?',[$n['id'],$s['id']]);q("UPDATE machines SET status='busy' WHERE id=?",[$n['id']]);release($s['machine_id']);audit('session.move',"#{$s['id']} -> {$n['name']}");},'Đã chuyển máy');
if($A==='fixtime'&&lvl()>=2)tx(function(){
 if(strlen(p('reason'))<3)throw new Exception('Phải nhập lý do sửa giờ.');
 $c=q("UPDATE sessions SET start_at=? WHERE id=? AND status='open' AND ?<=NOW()",[str_replace('T',' ',p('start')),(int)p('id'),str_replace('T',' ',p('start'))])->rowCount();
 if(!$c)throw new Exception('Giờ không hợp lệ (không được ở tương lai).');audit('session.fixtime',"#".p('id').' -> '.p('start').' | '.p('reason'));},'Đã sửa giờ bắt đầu');
if($A==='save'&&lvl()>=2)tx(function(){
 $r=max(1000,(int)p('rate'));if(strlen(p('name'))<1)throw new Exception('Thiếu tên máy.');
 if(p('id'))q('UPDATE machines SET name=?,zone=?,rate_hour=? WHERE id=?',[p('name'),p('zone'),$r,(int)p('id')]);
 else q('INSERT INTO machines(name,zone,rate_hour) VALUES(?,?,?)',[p('name'),p('zone'),$r]);audit('machine.save',p('name'));});
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=machines');
$ms=all("SELECT m.*,s.id sid,s.start_at,s.rate_hour srate,s.member_id,mb.name mname,TIMESTAMPDIFF(SECOND,s.start_at,NOW()) sec FROM machines m LEFT JOIN sessions s ON s.machine_id=m.id AND s.status='open' LEFT JOIN members mb ON mb.id=s.member_id ORDER BY m.name");
$mem=all('SELECT id,code,name,balance FROM members ORDER BY name');
$free=array_filter($ms,fn($m)=>$m['status']==='available');
$st=['available'=>'Trống','busy'=>'Đang dùng','maintenance'=>'Bảo trì'];
head('Máy & phiên sử dụng');?>
<div class="grid"><?php foreach($ms as $m):?><div class="card pc <?=$m['status']?>"><h3><?=h($m['name'])?> <span class="tag"><?=$st[$m['status']]?></span></h3><p class="mut"><?=h($m['zone'])?> · <?=vnd($m['rate_hour'])?>/giờ</p>
<?php if($m['status']==='available'):?><form method="post"><?=field()?><input type="hidden" name="a" value="open"><input type="hidden" name="id" value="<?=$m['id']?>"><select name="member_id"><option value="">Khách vãng lai</option><?php foreach($mem as $b)echo '<option value="'.$b['id'].'">'.h($b['code'].' · '.$b['name']).'</option>';?></select><button>Mở phiên</button></form>
<?php elseif($m['status']==='busy'): [$mi,$f]=fee($m['sec'],$m['srate']);?><p>Bắt đầu <?=dt($m['start_at'])?> · <b><?=$mi?> phút</b><br>Tạm tính <b><?=vnd($f)?></b> · <?=h($m['mname']?:'Khách vãng lai')?></p>
<form method="post"><?=field()?><input type="hidden" name="a" value="close"><input type="hidden" name="id" value="<?=$m['sid']?>"><select name="method"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><?php if($m['member_id'])echo '<option value="wallet">Trừ ví</option>';?></select><button>Kết thúc & thanh toán</button></form>
<form method="post" class="row"><?=field()?><input type="hidden" name="a" value="move"><input type="hidden" name="id" value="<?=$m['sid']?>"><select name="to" required><option value="">Chuyển sang…</option><?php foreach($free as $x)echo '<option value="'.$x['id'].'">'.h($x['name']).'</option>';?></select><button class="alt">Chuyển máy</button></form>
<?php if(lvl()>=2):?><details><summary>Sửa giờ bắt đầu</summary><form method="post"><?=field()?><input type="hidden" name="a" value="fixtime"><input type="hidden" name="id" value="<?=$m['sid']?>"><input type="datetime-local" name="start" required><input name="reason" placeholder="Lý do (bắt buộc)" required><button class="alt">Lưu</button></form></details><?php endif;?>
<?php else:?><p class="mut">Đang có phiếu bảo trì chưa đóng.</p><?php endif;?>
<?php if(lvl()>=2):?><details><summary>Sửa máy / đơn giá</summary><form method="post"><?=field()?><input type="hidden" name="a" value="save"><input type="hidden" name="id" value="<?=$m['id']?>"><input name="name" value="<?=h($m['name'])?>" required><input name="zone" value="<?=h($m['zone'])?>"><input type="number" name="rate" value="<?=$m['rate_hour']?>" min="1000"><button class="alt">Lưu</button></form></details><?php endif;?></div><?php endforeach;?></div>
<?php if(lvl()>=2):?><section class="card"><h2>Thêm máy mới</h2><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="save"><input name="name" placeholder="Tên máy" required><input name="zone" placeholder="Khu vực" value="Thường"><input type="number" name="rate" value="<?=(int)cfg('default_rate')?>" min="1000"><button>Thêm máy</button></form></section><?php endif;?>
<p class="mut">Quy tắc phí: tối thiểu <?=(int)cfg('min_minutes')?> phút, làm tròn lên phút, tiền làm tròn lên 100đ; đơn giá lưu lúc mở phiên.</p>
<?php foot();

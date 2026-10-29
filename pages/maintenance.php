<?php
$A=p('a');
if($A==='report')tx(function(){
 if(strlen(p('issue'))<3)throw new Exception('Mô tả sự cố quá ngắn.');
 q('INSERT INTO maintenance(machine_id,reporter_id,issue) VALUES(?,?,?)',[(int)p('machine_id'),uid(),p('issue')]);
 q("UPDATE machines SET status='maintenance' WHERE id=? AND status='available'",[(int)p('machine_id')]);audit('maint.report',p('issue'));},'Đã báo sự cố');
if($A==='assign'&&lvl()>=2)tx(function(){q("UPDATE maintenance SET assignee_id=?,status='doing' WHERE id=? AND status<>'done'",[(int)p('who'),(int)p('id')]);audit('maint.assign',p('id'));},'Đã phân công');
if($A==='done'&&lvl()>=2)tx(function(){
 $t=one("SELECT * FROM maintenance WHERE id=? AND status<>'done' FOR UPDATE",[(int)p('id')]);if(!$t)throw new Exception('Phiếu không hợp lệ.');
 q("UPDATE maintenance SET status='done',result=?,closed_at=NOW() WHERE id=?",[p('result'),$t['id']]);
 $busy=one("SELECT COUNT(*) c FROM sessions WHERE machine_id=? AND status='open'",[$t['machine_id']])['c'];if(!$busy)release($t['machine_id']);audit('maint.done',p('id'));},'Đã đóng phiếu');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=maintenance');
$ms=all('SELECT id,name FROM machines ORDER BY name');$us=all("SELECT id,fullname FROM users WHERE active=1 ORDER BY fullname");
$ts=all('SELECT t.*,m.name mn,r.fullname rn,a.fullname an FROM maintenance t JOIN machines m ON m.id=t.machine_id JOIN users r ON r.id=t.reporter_id LEFT JOIN users a ON a.id=t.assignee_id ORDER BY t.status="done",t.id DESC LIMIT 60');
head('Bảo trì & sự cố máy');?>
<section class="card"><h2>Báo sự cố</h2><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="report"><select name="machine_id"><?php foreach($ms as $m)echo '<option value="'.$m['id'].'">'.h($m['name']).'</option>';?></select><input name="issue" placeholder="Mô tả sự cố" required style="flex:1"><button>Gửi phiếu</button></form></section>
<table><tr><th>#</th><th>Máy</th><th>Sự cố</th><th>Người báo</th><th>Phụ trách</th><th>Trạng thái</th><th>Xử lý</th></tr>
<?php foreach($ts as $t):?><tr><td><?=$t['id']?></td><td><?=h($t['mn'])?></td><td><?=h($t['issue'])?><br><small><?=dt($t['created_at'])?></small></td><td><?=h($t['rn'])?></td><td><?=h($t['an']?:'—')?></td><td><?=['open'=>'Mới','doing'=>'Đang xử lý','done'=>'Đã đóng'][$t['status']]?></td><td>
<?php if($t['status']!=='done'&&lvl()>=2):?><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="assign"><input type="hidden" name="id" value="<?=$t['id']?>"><select name="who"><?php foreach($us as $u)echo '<option value="'.$u['id'].'">'.h($u['fullname']).'</option>';?></select><button class="alt">Phân công</button></form>
<form method="post" class="row"><?=field()?><input type="hidden" name="a" value="done"><input type="hidden" name="id" value="<?=$t['id']?>"><input name="result" placeholder="Kết quả xử lý"><button>Đóng phiếu</button></form><?php else:echo h($t['result']);endif;?></td></tr><?php endforeach;?></table>
<?php foot();

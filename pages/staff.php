<?php
$A=p('a');$roles=lvl()>=3?['cashier','manager','admin']:['cashier'];
function can($t){return lvl()>=3||($t['role']==='cashier'&&$t['id']!=uid());}
if($A==='add')tx(function()use($roles){
 if(!preg_match('/^[a-z0-9_]{3,30}$/',p('username')))throw new Exception('Tên đăng nhập 3-30 ký tự a-z, 0-9, _.');
 if(strlen($_POST['password']??'')<8)throw new Exception('Mật khẩu tối thiểu 8 ký tự.');if(!in_array(p('role'),$roles,true))throw new Exception('Vai trò không được phép.');
 q('INSERT INTO users(username,pass,fullname,role) VALUES(?,?,?,?)',[p('username'),password_hash($_POST['password'],PASSWORD_DEFAULT),p('fullname'),p('role')]);audit('staff.add',p('username'));},'Đã thêm nhân viên');
if(in_array($A,['toggle','reset','role'],true))tx(function()use($A,$roles){
 $t=one('SELECT * FROM users WHERE id=?',[(int)p('id')]);if(!$t||!can($t))throw new Exception('Bạn không có quyền thao tác tài khoản này.');
 if($A==='toggle')q('UPDATE users SET active=1-active WHERE id=?',[$t['id']]);
 if($A==='reset'){if(strlen($_POST['password']??'')<8)throw new Exception('Mật khẩu tối thiểu 8 ký tự.');q('UPDATE users SET pass=? WHERE id=?',[password_hash($_POST['password'],PASSWORD_DEFAULT),$t['id']]);}
 if($A==='role'){if(!in_array(p('role'),$roles,true))throw new Exception('Vai trò không hợp lệ.');q('UPDATE users SET role=? WHERE id=?',[p('role'),$t['id']]);}
 audit("staff.$A",$t['username']);},'Đã cập nhật');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=staff');
$us=all('SELECT * FROM users ORDER BY id');head('Nhân viên & phân quyền');?>
<section class="card"><h2>Thêm nhân viên</h2><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="add"><input name="username" placeholder="Tên đăng nhập" required><input name="fullname" placeholder="Họ tên" required><input type="password" name="password" placeholder="Mật khẩu (≥8 ký tự)" required><select name="role"><?php foreach($roles as $r)echo "<option>$r</option>";?></select><button>Thêm</button></form></section>
<table><tr><th>Tài khoản</th><th>Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr><?php foreach($us as $u):?><tr><td><?=h($u['username'])?></td><td><?=h($u['fullname'])?></td><td><?=h($u['role'])?></td><td><?=$u['active']?'Hoạt động':'Đã khóa'?></td><td>
<?php if(can($u)):?><form method="post" class="row"><?=field()?><input type="hidden" name="id" value="<?=$u['id']?>"><button name="a" value="toggle" class="alt"><?=$u['active']?'Khóa':'Mở khóa'?></button><input type="password" name="password" placeholder="Mật khẩu mới"><button name="a" value="reset" class="alt">Đặt lại MK</button><?php if(lvl()>=3){?><select name="role"><?php foreach($roles as $r)echo '<option'.($r===$u['role']?' selected':'').'>'.$r.'</option>';?></select><button name="a" value="role" class="alt">Đổi vai trò</button><?php }?></form><?php else:echo '<span class="mut">—</span>';endif;?></td></tr><?php endforeach;?></table>
<p class="mut">Quyền kế thừa: Thu ngân → Quản lý → Quản trị viên. Mọi kiểm tra quyền thực hiện ở phía máy chủ.</p>
<?php foot();

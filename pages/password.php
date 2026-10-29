<?php
if(p('a')==='pw')tx(function(){
 $u=one('SELECT pass FROM users WHERE id=?',[uid()]);
 if(!password_verify($_POST['old']??'',$u['pass']))throw new Exception('Mật khẩu hiện tại không đúng.');
 if(strlen($_POST['new']??'')<8||$_POST['new']!==($_POST['new2']??''))throw new Exception('Mật khẩu mới tối thiểu 8 ký tự và phải nhập khớp.');
 q('UPDATE users SET pass=? WHERE id=?',[password_hash($_POST['new'],PASSWORD_DEFAULT),uid()]);audit('password.change');},'Đã đổi mật khẩu');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=password');
head('Đổi mật khẩu');?><form method="post" class="card" style="max-width:420px"><?=field()?><input type="hidden" name="a" value="pw"><label>Mật khẩu hiện tại<input type="password" name="old" required></label><label>Mật khẩu mới<input type="password" name="new" required></label><label>Nhập lại mật khẩu mới<input type="password" name="new2" required></label><button>Đổi mật khẩu</button></form><?php foot();

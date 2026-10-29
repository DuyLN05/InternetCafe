<?php
require __DIR__.'/lib.php';
if(isset($_GET['out'])){audit('logout');session_destroy();go('login.php');}
$err='';
if($_SERVER['REQUEST_METHOD']==='POST'){chk();
 $u=one('SELECT * FROM users WHERE username=? AND active=1',[p('username')]);
 if($u&&password_verify($_POST['password']??'',$u['pass'])){session_regenerate_id(true);$_SESSION['u']=['id'=>$u['id'],'fullname'=>$u['fullname'],'role'=>$u['role']];audit('login');go('app.php');}
 $err='Sai tên đăng nhập hoặc mật khẩu.';}
?><!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập</title><link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="assets/style.css"></head><body class="login"><form method="post" class="card"><h1>Alt F4 · Quản lý quán net</h1><?php if($err)echo '<div class="msg err">'.h($err).'</div>';echo field();?><label>Tên đăng nhập<input name="username" required autofocus></label><label>Mật khẩu<input type="password" name="password" required></label><button>Đăng nhập</button></form></body></html>

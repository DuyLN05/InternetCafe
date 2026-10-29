<?php
require __DIR__.'/lib.php';
$map=['dashboard'=>1,'machines'=>1,'members'=>1,'orders'=>1,'invoices'=>1,'maintenance'=>1,'shifts'=>1,'password'=>1,'inventory'=>2,'reports'=>2,'staff'=>2,'system'=>3];
$p=$_GET['p']??'dashboard';if(!isset($map[$p]))$p='dashboard';
need($map[$p]);
if($_SERVER['REQUEST_METHOD']==='POST')chk();
require __DIR__."/pages/$p.php";

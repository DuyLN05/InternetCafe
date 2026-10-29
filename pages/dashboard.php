<?php
$rev=one("SELECT COALESCE(SUM(total),0) v FROM invoices WHERE status='paid' AND DATE(created_at)=CURDATE()")['v'];
$st=array_column(all('SELECT status,COUNT(*) c FROM machines GROUP BY status'),'c','status');
$tk=one("SELECT COUNT(*) c FROM maintenance WHERE status<>'done'")['c'];
$low=all('SELECT name,stock FROM products WHERE active=1 AND stock<=min_stock ORDER BY stock');
$lb=all('SELECT name,code,balance FROM members WHERE balance<? ORDER BY balance LIMIT 10',[(int)cfg('low_balance')]);
head('Tổng quan');?>
<div class="stats"><div><b><?=vnd($rev)?></b>Doanh thu hôm nay</div><div><b><?=$st['busy']??0?></b>Máy đang dùng</div><div><b><?=$st['available']??0?></b>Máy trống</div><div><b><?=$st['maintenance']??0?></b>Máy bảo trì</div><div><b><?=$tk?></b>Phiếu sự cố đang mở</div></div>
<div class="cols"><section class="card"><h2>Hàng sắp hết</h2><?php if(!$low)echo '<p class="mut">Tồn kho ổn định.</p>';foreach($low as $r)echo '<p>'.h($r['name']).' — còn <b>'.$r['stock'].'</b></p>';?></section>
<section class="card"><h2>Hội viên số dư thấp</h2><?php if(!$lb)echo '<p class="mut">Không có hội viên nào số dư thấp.</p>';foreach($lb as $r)echo '<p>'.h($r['code'].' · '.$r['name']).' — <b>'.vnd($r['balance']).'</b></p>';?></section></div>
<?php foot();

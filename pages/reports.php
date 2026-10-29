<?php
$f=$_GET['from']??date('Y-m-01');$t=$_GET['to']??date('Y-m-d');$w="i.status='paid' AND DATE(i.created_at) BETWEEN ? AND ?";
$day=all("SELECT DATE(i.created_at) d,COUNT(*) n,SUM(i.total) v FROM invoices i WHERE $w GROUP BY d ORDER BY d",[$f,$t]);
if(isset($_GET['csv'])){header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename=doanhthu_'.$f.'_'.$t.'.csv');echo "\xEF\xBB\xBFNgày,Số hóa đơn,Doanh thu\n";foreach($day as $r)echo "{$r['d']},{$r['n']},{$r['v']}\n";exit;}
$mt=all("SELECT p.method,SUM(p.amount) v FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE $w GROUP BY p.method",[$f,$t]);
$kd=all("SELECT i.kind,SUM(i.total) v FROM invoices i WHERE $w GROUP BY i.kind",[$f,$t]);
$us=all("SELECT m.name,COUNT(s.id) n,COALESCE(SUM(s.minutes),0) mins,COALESCE(SUM(s.fee),0) v FROM machines m LEFT JOIN sessions s ON s.machine_id=m.id AND s.status='closed' AND DATE(s.end_at) BETWEEN ? AND ? GROUP BY m.id ORDER BY m.name",[$f,$t]);
$sk=all('SELECT name,stock,min_stock FROM products WHERE active=1 ORDER BY stock');
$sum=array_sum(array_column($day,'v'));head('Báo cáo');?>
<form class="row no-print"><input type="hidden" name="p" value="reports"><input type="date" name="from" value="<?=h($f)?>"><input type="date" name="to" value="<?=h($t)?>"><button>Xem</button><a class="btn alt" href="?p=reports&from=<?=h($f)?>&to=<?=h($t)?>&csv=1">Xuất CSV</a><button type="button" class="alt" onclick="print()">In báo cáo</button></form>
<div class="stats"><div><b><?=vnd($sum)?></b>Tổng doanh thu</div><?php foreach($mt as $r)echo '<div><b>'.vnd($r['v']).'</b>'.h(['cash'=>'Tiền mặt','wallet'=>'Trừ ví','transfer'=>'Chuyển khoản'][$r['method']]).'</div>';foreach($kd as $r)echo '<div><b>'.vnd($r['v']).'</b>'.($r['kind']==='order'?'Đồ ăn/uống':'Giờ chơi').'</div>';?></div>
<div class="cols"><section class="card"><h2>Doanh thu theo ngày</h2><table><tr><th>Ngày</th><th>Số HĐ</th><th>Doanh thu</th></tr><?php foreach($day as $r)echo '<tr><td>'.date('d/m/Y',strtotime($r['d'])).'</td><td>'.$r['n'].'</td><td>'.vnd($r['v']).'</td></tr>';?></table></section>
<section class="card"><h2>Lượt dùng máy</h2><table><tr><th>Máy</th><th>Lượt</th><th>Phút</th><th>Doanh thu</th></tr><?php foreach($us as $r)echo '<tr><td>'.h($r['name']).'</td><td>'.$r['n'].'</td><td>'.$r['mins'].'</td><td>'.vnd($r['v']).'</td></tr>';?></table></section></div>
<section class="card"><h2>Tồn kho hiện tại</h2><table><tr><th>Sản phẩm</th><th>Tồn</th><th>Tối thiểu</th></tr><?php foreach($sk as $r)echo '<tr class="'.($r['stock']<=$r['min_stock']?'lowrow':'').'"><td>'.h($r['name']).'</td><td>'.$r['stock'].'</td><td>'.$r['min_stock'].'</td></tr>';?></table></section>
<?php foot();

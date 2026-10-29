<?php
if(p('a')==='order')tx(function(){
 $items=[];foreach($_POST['qty']??[] as $pid=>$qt){$qt=(int)$qt;if($qt>0)$items[(int)$pid]=$qt;}
 if(!$items)throw new Exception('Chưa chọn món nào.');$total=0;$rows=[];ksort($items);
 foreach($items as $pid=>$qt){$r=one('SELECT * FROM products WHERE id=? AND active=1 FOR UPDATE',[$pid]);
  if(!$r)throw new Exception('Sản phẩm không tồn tại.');if($r['stock']<$qt)throw new Exception("Không đủ tồn kho: {$r['name']} (còn {$r['stock']}).");
  $rows[]=[$r,$qt];$total+=$r['price']*$qt;}
 $mid=p('member_id')?:null;
 q('INSERT INTO orders(member_id,user_id,total) VALUES(?,?,?)',[$mid,uid(),$total]);$oid=db()->lastInsertId();
 foreach($rows as [$r,$qt]){
  q('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES(?,?,?,?,?)',[$oid,$r['id'],$r['name'],$r['price'],$qt]); // giá lưu tại thời điểm bán
  q('UPDATE products SET stock=stock-? WHERE id=?',[$qt,$r['id']]);
  q("INSERT INTO stock_moves(product_id,type,qty,note,user_id) VALUES(?,'sale',?,?,?)",[$r['id'],-$qt,"Đơn #$oid",uid()]);}
 pay('order',$oid,$mid,$total,p('method'));audit('order.create',"#$oid $total đ");},'Đã tạo đơn & thanh toán');
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=orders');
$pr=all('SELECT * FROM products WHERE active=1 ORDER BY category,name');$mem=all('SELECT id,code,name FROM members ORDER BY name');
$rc=all('SELECT o.*,m.name mname FROM orders o LEFT JOIN members m ON m.id=o.member_id ORDER BY o.id DESC LIMIT 15');
head('Gọi món & đơn hàng');?>
<form method="post" class="card"><?=field()?><input type="hidden" name="a" value="order"><table><tr><th>Món</th><th>Nhóm</th><th>Giá</th><th>Tồn</th><th>Số lượng</th></tr>
<?php foreach($pr as $r)echo '<tr><td>'.h($r['name']).'</td><td>'.h($r['category']).'</td><td>'.vnd($r['price']).'</td><td class="'.($r['stock']<=$r['min_stock']?'warn':'').'">'.$r['stock'].'</td><td><input type="number" name="qty['.$r['id'].']" min="0" max="'.$r['stock'].'" value="0"></td></tr>';?></table>
<div class="row"><select name="member_id"><option value="">Khách vãng lai</option><?php foreach($mem as $b)echo '<option value="'.$b['id'].'">'.h($b['code'].' · '.$b['name']).'</option>';?></select><select name="method"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option><option value="wallet">Trừ ví hội viên</option></select><button>Tạo đơn & thanh toán</button></div></form>
<h2>Đơn gần đây</h2><table><tr><th>#</th><th>Thời gian</th><th>Hội viên</th><th>Tổng</th></tr><?php foreach($rc as $o)echo '<tr><td>'.$o['id'].'</td><td>'.dt($o['created_at']).'</td><td>'.h($o['mname']?:'Khách vãng lai').'</td><td>'.vnd($o['total']).'</td></tr>';?></table>
<?php foot();

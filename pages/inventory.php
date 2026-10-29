<?php
$A=p('a');
if($A==='prod')tx(function(){
 if(strlen(p('name'))<1||(int)p('price')<0)throw new Exception('Tên/giá không hợp lệ.');
 if(p('id'))q('UPDATE products SET name=?,category=?,price=?,min_stock=?,active=? WHERE id=?',[p('name'),p('category'),(int)p('price'),(int)p('min_stock'),isset($_POST['active'])?1:0,(int)p('id')]);
 else q('INSERT INTO products(name,category,price,min_stock) VALUES(?,?,?,?)',[p('name'),p('category'),(int)p('price'),(int)p('min_stock')]);audit('product.save',p('name'));});
if($A==='in')tx(function(){
 $n=(int)p('qty');if($n<1)throw new Exception('Số lượng nhập phải > 0.');
 q('UPDATE products SET stock=stock+? WHERE id=?',[$n,(int)p('id')]);q("INSERT INTO stock_moves(product_id,type,qty,supplier_id,note,user_id) VALUES(?,'in',?,?,?,?)",[(int)p('id'),$n,p('sup')?:null,p('note'),uid()]);audit('stock.in',p('id')." +$n");},'Đã nhập kho');
if($A==='count')tx(function(){
 $r=one('SELECT stock FROM products WHERE id=? FOR UPDATE',[(int)p('id')]);$real=(int)p('real');if($real<0)throw new Exception('Số kiểm kê không hợp lệ.');$d=$real-$r['stock'];
 q('UPDATE products SET stock=? WHERE id=?',[$real,(int)p('id')]);q("INSERT INTO stock_moves(product_id,type,qty,note,user_id) VALUES(?,'adjust',?,?,?)",[(int)p('id'),$d,'Kiểm kê, chênh lệch '.$d,uid()]);audit('stock.count',p('id')." diff $d");},'Đã cập nhật kiểm kê');
if($A==='sup')tx(function(){if(!p('name'))throw new Exception('Nhập tên nhà cung cấp.');q('INSERT INTO suppliers(name,phone) VALUES(?,?)',[p('name'),p('phone')]);});
if($_SERVER['REQUEST_METHOD']==='POST')go('?p=inventory');
$pr=all('SELECT * FROM products ORDER BY active DESC,category,name');$su=all('SELECT * FROM suppliers ORDER BY name');
$mv=all('SELECT s.*,p.name pn FROM stock_moves s JOIN products p ON p.id=s.product_id ORDER BY s.id DESC LIMIT 20');
head('Kho & sản phẩm');?>
<table><tr><th>Sản phẩm</th><th>Nhóm</th><th>Giá</th><th>Tồn</th><th>Mức tối thiểu</th><th>Hiện</th><th></th><th>Nhập kho</th><th>Kiểm kê</th></tr>
<?php foreach($pr as $r):?><tr class="<?=$r['stock']<=$r['min_stock']?'lowrow':''?>"><form method="post" id="f<?=$r['id']?>"><?=field()?><input type="hidden" name="a" value="prod"><input type="hidden" name="id" value="<?=$r['id']?>"></form>
<td><input form="f<?=$r['id']?>" name="name" value="<?=h($r['name'])?>"></td><td><input form="f<?=$r['id']?>" name="category" value="<?=h($r['category'])?>"></td><td><input form="f<?=$r['id']?>" type="number" name="price" value="<?=$r['price']?>"></td><td><b><?=$r['stock']?></b></td><td><input form="f<?=$r['id']?>" type="number" name="min_stock" value="<?=$r['min_stock']?>"></td><td><input form="f<?=$r['id']?>" type="checkbox" name="active" <?=$r['active']?'checked':''?>></td><td><button form="f<?=$r['id']?>" class="alt">Lưu</button></td>
<td><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="in"><input type="hidden" name="id" value="<?=$r['id']?>"><input type="number" name="qty" min="1" placeholder="SL" required><select name="sup"><option value="">NCC</option><?php foreach($su as $s)echo '<option value="'.$s['id'].'">'.h($s['name']).'</option>';?></select><button>Nhập</button></form></td>
<td><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="count"><input type="hidden" name="id" value="<?=$r['id']?>"><input type="number" name="real" min="0" placeholder="Thực tế" required><button class="alt">Kiểm kê</button></form></td></tr><?php endforeach;?></table>
<div class="cols"><section class="card"><h2>Thêm sản phẩm</h2><form method="post"><?=field()?><input type="hidden" name="a" value="prod"><input name="name" placeholder="Tên" required><input name="category" value="Đồ uống"><input type="number" name="price" placeholder="Giá bán" required><input type="number" name="min_stock" value="5"><button>Thêm</button></form></section>
<section class="card"><h2>Nhà cung cấp</h2><?php foreach($su as $s)echo '<p>'.h($s['name']).' · '.h($s['phone']).'</p>';?><form method="post" class="row"><?=field()?><input type="hidden" name="a" value="sup"><input name="name" placeholder="Tên NCC" required><input name="phone" placeholder="SĐT"><button>Thêm</button></form></section></div>
<h2>Lịch sử nhập/xuất gần đây</h2><table><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>SL</th><th>Ghi chú</th></tr><?php foreach($mv as $m)echo '<tr><td>'.dt($m['created_at']).'</td><td>'.h($m['pn']).'</td><td>'.h($m['type']).'</td><td>'.$m['qty'].'</td><td>'.h($m['note']).'</td></tr>';?></table>
<?php foot();

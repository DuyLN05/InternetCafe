-- ============================================================
-- CSDL: Website quản lý quán net (Nhóm Alt F4 - Lớp 242101TH001)
-- MySQL 5.7+ / MariaDB 10.2+ · utf8mb4 · InnoDB
-- Cách dùng: phpMyAdmin > Import, hoặc: mysql -u root < quannet.sql
-- Tài khoản mẫu: admin / quanly / thungan, mật khẩu: password  (ĐỔI NGAY sau khi đăng nhập)
-- ============================================================
CREATE DATABASE IF NOT EXISTS quannet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quannet;
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS audit_log,shifts,maintenance,payments,invoices,order_items,orders,stock_moves,suppliers,products,sessions,wallet_tx,members,machines,settings,users;
SET FOREIGN_KEY_CHECKS=1;

-- 1. Người dùng & phân quyền (cashier < manager < admin)
CREATE TABLE users(
 id INT AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(40) NOT NULL UNIQUE,
 pass VARCHAR(255) NOT NULL COMMENT 'password_hash()',
 fullname VARCHAR(100) NOT NULL,
 role ENUM('cashier','manager','admin') NOT NULL DEFAULT 'cashier',
 active TINYINT NOT NULL DEFAULT 1,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Cấu hình hệ thống / quy tắc tính phí
CREATE TABLE settings(
 k VARCHAR(40) PRIMARY KEY,
 v VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Máy tính
CREATE TABLE machines(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(40) NOT NULL UNIQUE,
 zone VARCHAR(40) DEFAULT 'Thường',
 rate_hour INT NOT NULL DEFAULT 6000 COMMENT 'đơn giá VND/giờ',
 status ENUM('available','busy','maintenance') NOT NULL DEFAULT 'available',
 INDEX idx_machine_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Hội viên & ví (số dư không âm)
CREATE TABLE members(
 id INT AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(20) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL,
 phone VARCHAR(20),
 balance BIGINT NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_balance CHECK(balance>=0),
 INDEX idx_member_name(name),INDEX idx_member_phone(phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wallet_tx(
 id INT AUTO_INCREMENT PRIMARY KEY,
 member_id INT NOT NULL,
 type ENUM('topup','pay','refund') NOT NULL,
 amount BIGINT NOT NULL COMMENT 'dương: cộng ví, âm: trừ ví',
 balance_after BIGINT NOT NULL,
 note VARCHAR(100) COMMENT 'topup: cash/transfer; còn lại: tham chiếu',
 user_id INT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(member_id) REFERENCES members(id),
 INDEX idx_wallet_member(member_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Phiên sử dụng máy (đơn giá lưu lúc mở phiên)
CREATE TABLE sessions(
 id INT AUTO_INCREMENT PRIMARY KEY,
 machine_id INT NOT NULL,
 member_id INT NULL,
 user_id INT NOT NULL,
 start_at DATETIME NOT NULL,
 end_at DATETIME NULL,
 rate_hour INT NOT NULL,
 minutes INT NULL,
 fee INT NULL,
 status ENUM('open','closed') NOT NULL DEFAULT 'open',
 invoice_id INT NULL,
 FOREIGN KEY(machine_id) REFERENCES machines(id),
 INDEX idx_session_machine(machine_id,status),INDEX idx_session_end(end_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Sản phẩm, nhà cung cấp, kho
CREATE TABLE products(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 category VARCHAR(40) DEFAULT 'Đồ uống',
 price INT NOT NULL,
 stock INT NOT NULL DEFAULT 0,
 min_stock INT NOT NULL DEFAULT 5,
 active TINYINT NOT NULL DEFAULT 1,
 CONSTRAINT chk_stock CHECK(stock>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE suppliers(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 phone VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stock_moves(
 id INT AUTO_INCREMENT PRIMARY KEY,
 product_id INT NOT NULL,
 type ENUM('in','sale','adjust','refund') NOT NULL,
 qty INT NOT NULL COMMENT 'dương: nhập vào, âm: xuất ra',
 supplier_id INT NULL,
 note VARCHAR(150),
 user_id INT,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(product_id) REFERENCES products(id),
 FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
 INDEX idx_move_product(product_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Đơn hàng (giá lưu tại thời điểm bán)
CREATE TABLE orders(
 id INT AUTO_INCREMENT PRIMARY KEY,
 member_id INT NULL,
 user_id INT NOT NULL,
 total INT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(member_id) REFERENCES members(id),
 FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items(
 id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL,
 product_id INT NOT NULL,
 name VARCHAR(100) NOT NULL,
 price INT NOT NULL,
 qty INT NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id),
 FOREIGN KEY(product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Ca làm việc
CREATE TABLE shifts(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 open_at DATETIME NOT NULL,
 close_at DATETIME NULL,
 open_cash INT NOT NULL DEFAULT 0,
 expected_cash INT NULL,
 counted_cash INT NULL,
 status ENUM('open','closed') NOT NULL DEFAULT 'open',
 FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Hóa đơn & thanh toán (hóa đơn không xóa; mỗi hóa đơn đúng 1 thanh toán)
CREATE TABLE invoices(
 id INT AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(30) NOT NULL UNIQUE,
 kind ENUM('session','order') NOT NULL,
 ref_id INT NOT NULL COMMENT 'sessions.id hoặc orders.id',
 member_id INT NULL,
 user_id INT NOT NULL,
 total INT NOT NULL,
 status ENUM('paid','refunded') NOT NULL DEFAULT 'paid',
 refund_reason VARCHAR(200),
 shift_id INT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(shift_id) REFERENCES shifts(id),
 INDEX idx_invoice_date(created_at),INDEX idx_invoice_ref(kind,ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments(
 id INT AUTO_INCREMENT PRIMARY KEY,
 invoice_id INT NOT NULL UNIQUE COMMENT 'UNIQUE: chống ghi trùng thanh toán',
 method ENUM('cash','wallet','transfer') NOT NULL,
 amount INT NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Bảo trì
CREATE TABLE maintenance(
 id INT AUTO_INCREMENT PRIMARY KEY,
 machine_id INT NOT NULL,
 reporter_id INT NOT NULL,
 assignee_id INT NULL,
 issue VARCHAR(250) NOT NULL,
 status ENUM('open','doing','done') NOT NULL DEFAULT 'open',
 result VARCHAR(250),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 closed_at DATETIME NULL,
 FOREIGN KEY(machine_id) REFERENCES machines(id),
 FOREIGN KEY(reporter_id) REFERENCES users(id),
 INDEX idx_maint_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Nhật ký thao tác
CREATE TABLE audit_log(
 id INT AUTO_INCREMENT PRIMARY KEY,
 user_id INT NULL,
 action VARCHAR(60) NOT NULL,
 detail VARCHAR(300),
 ip VARCHAR(45),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_audit_time(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================== DỮ LIỆU MẪU =====================
-- Hash bcrypt của mật khẩu "password"
INSERT INTO users(username,pass,fullname,role) VALUES
('admin','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Quản trị viên','admin'),
('quanly','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Quản lý','manager'),
('thungan','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','Thu ngân','cashier');
INSERT INTO settings VALUES('min_minutes','15'),('low_balance','10000'),('default_rate','6000');
INSERT INTO machines(name,zone,rate_hour) VALUES
('PC01','Thường',6000),('PC02','Thường',6000),('PC03','Thường',6000),('PC04','Thường',6000),('PC05','Thường',6000),
('PC06','Thường',6000),('PC07','Thường',6000),('PC08','VIP',10000),('PC09','VIP',10000),('PC10','VIP',10000);
INSERT INTO suppliers(name,phone) VALUES('Đại lý Minh Phát','0900000001'),('Cửa hàng Tạp hóa Bình An','0900000002');
INSERT INTO products(name,category,price,stock,min_stock) VALUES
('Nước suối','Đồ uống',8000,40,10),('Coca-Cola','Đồ uống',12000,30,10),('Red Bull','Đồ uống',15000,20,8),('Cà phê sữa','Đồ uống',15000,25,8),
('Mì ly','Đồ ăn',15000,30,10),('Mì xào trứng','Đồ ăn',25000,15,5),('Cơm chiên','Đồ ăn',30000,15,5),('Snack khoai tây','Đồ ăn',10000,40,10),
('Xúc xích','Đồ ăn',12000,20,8),('Thẻ cào game 50k','Khác',50000,10,3);
INSERT INTO stock_moves(product_id,type,qty,supplier_id,note) SELECT id,'in',stock,1,'Tồn đầu kỳ' FROM products;
INSERT INTO members(code,name,phone,balance) VALUES('HV0001','Nguyễn Văn An','0911111111',50000),('HV0002','Trần Thị Bình','0922222222',5000),('HV0003','Lê Hoàng Cường','0933333333',120000);
INSERT INTO wallet_tx(member_id,type,amount,balance_after,note) SELECT id,'topup',balance,balance,'cash' FROM members;

-- ===================== VIEW BÁO CÁO (tùy chọn) =====================
CREATE OR REPLACE VIEW v_revenue_daily AS
 SELECT DATE(created_at) AS ngay,COUNT(*) AS so_hoa_don,SUM(total) AS doanh_thu FROM invoices WHERE status='paid' GROUP BY DATE(created_at);
CREATE OR REPLACE VIEW v_low_stock AS
 SELECT id,name,stock,min_stock FROM products WHERE active=1 AND stock<=min_stock;
CREATE OR REPLACE VIEW v_machine_usage AS
 SELECT m.id,m.name,COUNT(s.id) AS so_luot,COALESCE(SUM(s.minutes),0) AS tong_phut,COALESCE(SUM(s.fee),0) AS doanh_thu
 FROM machines m LEFT JOIN sessions s ON s.machine_id=m.id AND s.status='closed' GROUP BY m.id,m.name;

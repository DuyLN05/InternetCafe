<?php
// Sao lưu định kỳ: chạy bằng cron/Task Scheduler:  php cron_backup.php
require __DIR__.'/lib.php';
if(PHP_SAPI!=='cli')exit('CLI only');
file_put_contents(__DIR__.'/backups/auto_'.date('Ymd_His').'.sql',dump_sql());echo "OK\n";

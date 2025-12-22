@echo off
echo ========================================
echo    إعادة ربط قاعدة البيانات السريع
echo ========================================
echo.

echo 1. التحقق من متغيرات البيئة...
node -e "require('./database-reset-scripts.js').checkEnvironment()"

echo.
echo 2. التحقق من الاتصال...
node -e "require('./database-reset-scripts.js').testBasicConnection()"

echo.
echo 3. التحقق من الجداول...
node -e "require('./database-reset-scripts.js').checkTables()"

echo.
echo 4. الفحص الشامل...
node -e "require('./database-reset-scripts.js').comprehensiveCheck()"

echo.
echo ========================================
echo    اكتمل الفحص!
echo ========================================
echo.
echo إذا كانت هناك مشاكل، يرجى:
echo 1. تحديث مفاتيح API في ملف .env
echo 2. تطبيق مخطط قاعدة البيانات
echo 3. التحقق من صلاحيات المشروع
echo.
pause

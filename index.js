const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. เชื่อมต่อฐานข้อมูล MySQL (ใช้ค่าจาก Railway Variables)
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to DB: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database.');
});

// 2. ตั้งค่าให้ Server รู้จักโฟลเดอร์ public (ที่เก็บไฟล์ index.html)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 3. สร้าง API ง่ายๆ สำหรับทดสอบ (เอาไว้เช็กว่า Cloud ทำงานไหม)
app.get('/api/hello', (req, res) => {
    res.json({ message: "Hello from Cloud Server!", status: "Connected" });
});

// 4. สั่งให้ Server เริ่มทำงาน
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
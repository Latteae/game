const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

// เชื่อมต่อ MySQL (ใช้ค่าจาก Railway)
const pool = mysql.createPool(process.env.DATABASE_URL || process.env.MYSQL_URL);
const db = pool.promise();

app.use(express.json());

// 1. ให้ Express รู้จักโฟลเดอร์ไฟล์หน้าเว็บก่อน
app.use(express.static(path.join(__dirname, 'public')));

// 2. API สำหรับดึงโน๊ต (ต้องอยู่ข้างบน)
app.get('/api/notes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. แก้จุดที่พัง: ใช้ Regex /.*/ เพื่อดักจับทุก Path ที่เหลือ
// สำคัญ: ห้ามมีเครื่องหมาย ' ' หรือ " " ครอบตัว /.*/ นะครับ
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
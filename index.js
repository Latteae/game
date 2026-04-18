const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

// ตั้งค่า MySQL Connection (ดึงจากตัวแปรของ Railway)
const pool = mysql.createPool(process.env.DATABASE_URL || process.env.MYSQL_URL);
const db = pool.promise();

app.use(express.json());
app.use(express.static('public')); 

// API สำหรับดึงโน๊ต (Public)
app.get('/api/notes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notes ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// แก้ไขตรงนี้: เปลี่ยนจาก '*' เป็น '/(.*)' เพื่อป้องกัน PathError
app.get('/(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
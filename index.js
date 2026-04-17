const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();

// เชื่อมต่อฐานข้อมูล (ใช้ค่าจาก Railway)
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database.');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- API สำหรับระบบ Account ---

// 1. สมัครสมาชิก (Sign Up)
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });

    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    connection.query(sql, [username, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว!" });
            return res.status(500).json({ error: "Database Error" });
        }
        res.json({ message: "สมัครสมาชิกสำเร็จ!" });
    });
});

// 2. เข้าสู่ระบบ (Sign In)
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id FROM users WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: "Database Error" });
        if (result.length > 0) {
            res.json({ userId: result[0].id });
        } else {
            res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        }
    });
});

// --- API สำหรับตัวเกม ---

// 3. บันทึกข้อมูลเกม
app.post('/api/save', (req, res) => {
    const { userId, level, exp } = req.body;
    const sql = "INSERT INTO game_stats (user_id, level, exp) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE level = ?, exp = ?";
    connection.query(sql, [userId, level, exp, level, exp], (err) => {
        if (err) return res.status(500).json({ error: "Save Error" });
        res.json({ message: "Saved" });
    });
});

// 4. โหลดข้อมูลเกม
app.get('/api/load/:userId', (req, res) => {
    const sql = "SELECT level, exp FROM game_stats WHERE user_id = ?";
    connection.query(sql, [req.params.userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Load Error" });
        if (result.length > 0) res.json(result[0]);
        else res.json({ level: 1, exp: 0 });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

connection.connect((err) => {
    if (err) return console.error('DB Error: ' + err.stack);
    console.log('Connected to MySQL Database.');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const validPattern = /^[a-zA-Z0-9-_]+$/;

// API: สมัครสมาชิก
app.post('/api/signup', (req, res) => {
    const { username, password, country } = req.body;
    if (!username || !password || !country) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
    if (!validPattern.test(username) || !validPattern.test(password)) return res.status(400).json({ error: "รูปแบบ Username/Password ไม่ถูกต้อง" });

    const sql = "INSERT INTO users (username, password, country) VALUES (?, ?, ?)";
    connection.query(sql, [username, password, country], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว!" });
            return res.status(500).json({ error: "Database Error" });
        }
        res.json({ message: "สมัครสำเร็จ!" });
    });
});

// API: เข้าสู่ระบบ
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id FROM users WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: "Server Error" });
        if (result.length > 0) res.json({ userId: result[0].id });
        else res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    });
});

// API: ดึงข้อมูลเพื่อแสดงใน Settings
app.get('/api/user-info/:userId', (req, res) => {
    const sql = "SELECT username, password, country FROM users WHERE id = ?";
    connection.query(sql, [req.params.userId], (err, result) => {
        if (err || result.length === 0) return res.status(404).send();
        res.json(result[0]);
    });
});

// API: อัปเดตโปรไฟล์
app.post('/api/update-profile', (req, res) => {
    const { userId, newUsername, newPassword, newCountry } = req.body;
    if (!validPattern.test(newUsername) || !validPattern.test(newPassword)) {
        return res.status(400).json({ error: "รูปแบบตัวอักษรไม่ถูกต้อง" });
    }
    const sql = "UPDATE users SET username = ?, password = ?, country = ? WHERE id = ?";
    connection.query(sql, [newUsername, newPassword, newCountry, userId], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "ชื่อนี้ถูกใช้ไปแล้ว" });
            return res.status(500).json({ error: "Update Fail" });
        }
        res.json({ message: "Success" });
    });
});

// API: Save/Load ข้อมูลเกม
app.post('/api/save', (req, res) => {
    const { userId, level, exp } = req.body;
    const sql = "INSERT INTO game_stats (user_id, level, exp) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE level = ?, exp = ?";
    connection.query(sql, [userId, level, exp, level, exp], (err) => res.json({ success: !err }));
});

app.get('/api/load/:userId', (req, res) => {
    connection.query("SELECT level, exp FROM game_stats WHERE user_id = ?", [req.params.userId], (err, result) => {
        if (result && result.length > 0) res.json(result[0]);
        else res.json({ level: 1, exp: 0 });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
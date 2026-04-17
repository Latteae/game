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

// 1. Sign Up (สมัครสมาชิกพร้อมเก็บประเทศ)
app.post('/api/signup', (req, res) => {
    const { username, password, country } = req.body;
    if (!username || !password || !country) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบ" });
    if (!validPattern.test(username) || !validPattern.test(password)) return res.status(400).json({ error: "รูปแบบตัวอักษรไม่ถูกต้อง" });

    const sql = "INSERT INTO users (username, password, country) VALUES (?, ?, ?)";
    connection.query(sql, [username, password, country], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว!" });
            return res.status(500).json({ error: "Database Error" });
        }
        res.json({ message: "สมัครสำเร็จ!" });
    });
});

// 2. Sign In
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT id FROM users WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], (err, result) => {
        if (err) return res.status(500).json({ error: "Error" });
        if (result.length > 0) res.json({ userId: result[0].id });
        else res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    });
});

// 3. Update Profile (แก้ไขข้อมูล)
app.post('/api/update-profile', (req, res) => {
    const { userId, newUsername, newPassword, newCountry } = req.body;
    if (!validPattern.test(newUsername) || !validPattern.test(newPassword)) {
        return res.status(400).json({ error: "Username/Password ต้องไม่มีเว้นวรรค และใช้ได้แค่ A-Z, 0-9, -, _" });
    }

    const sql = "UPDATE users SET username = ?, password = ?, country = ? WHERE id = ?";
    connection.query(sql, [newUsername, newPassword, newCountry, userId], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว!" });
            return res.status(500).json({ error: "Update Error" });
        }
        res.json({ message: "อัปเดตสำเร็จ" });
    });
});

// 4. Get User Info (ดึงข้อมูลมาแสดงใน Settings)
app.get('/api/user-info/:userId', (req, res) => {
    connection.query("SELECT username, password, country FROM users WHERE id = ?", [req.params.userId], (err, result) => {
        if (err) return res.status(500).send();
        res.json(result[0]);
    });
});

// 5. Game Data (Save/Load)
app.post('/api/save', (req, res) => {
    const { userId, level, exp } = req.body;
    const sql = "INSERT INTO game_stats (user_id, level, exp) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE level = ?, exp = ?";
    connection.query(sql, [userId, level, exp, level, exp], (err) => res.json({ success: !err }));
});

app.get('/api/load/:userId', (req, res) => {
    connection.query("SELECT level, exp FROM game_stats WHERE user_id = ?", [req.params.userId], (err, result) => {
        if (result.length > 0) res.json(result[0]);
        else res.json({ level: 1, exp: 0 });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Port: ${PORT}`));
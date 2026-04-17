const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

connection.connect(err => {
    if (err) return console.error('Database Connection Error: ' + err.stack);
    console.log('Connected to MySQL Database.');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const validPattern = /^[a-zA-Z0-9-_]+$/;

// --- API: Auth System ---
app.post('/api/signup', (req, res) => {
    const { username, password, country } = req.body;
    if (!username || !password || !country) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    const sql = "INSERT INTO users (username, password, country) VALUES (?, ?, ?)";
    connection.query(sql, [username, password, country], (err) => {
        if (err) return res.status(400).json({ error: "ชื่อนี้ถูกใช้ไปแล้ว" });
        res.json({ message: "Success" });
    });
});

app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    connection.query("SELECT id FROM users WHERE username = ? AND password = ?", [username, password], (err, result) => {
        if (result.length > 0) res.json({ userId: result[0].id });
        else res.status(401).json({ error: "Username หรือ Password ไม่ถูกต้อง" });
    });
});

// --- API: Game Data & Leaderboard ---
app.get('/api/leaderboard', (req, res) => {
    const sql = `
        SELECT u.username, u.country, u.created_at, IFNULL(s.level, 1) as level, IFNULL(s.total_notes, 0) as notes 
        FROM users u 
        LEFT JOIN game_stats s ON u.id = s.user_id 
        ORDER BY level DESC, notes DESC LIMIT 100`;
    connection.query(sql, (err, result) => res.json(err ? [] : result));
});

app.post('/api/save', (req, res) => {
    const { userId, level, exp, totalNotes } = req.body;
    const sql = "INSERT INTO game_stats (user_id, level, exp, total_notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE level = ?, exp = ?, total_notes = ?";
    connection.query(sql, [userId, level, exp, totalNotes, level, exp, totalNotes], () => res.json({ success: true }));
});

app.get('/api/load/:userId', (req, res) => {
    connection.query("SELECT level, exp, total_notes FROM game_stats WHERE user_id = ?", [req.params.userId], (err, result) => {
        if (result.length > 0) res.json(result[0]);
        else res.json({ level: 1, exp: 0, total_notes: 0 });
    });
});

// --- API: Notes ---
app.post('/api/notes/add', (req, res) => {
    const { userId, content } = req.body;
    connection.query("INSERT INTO notes (user_id, content) VALUES (?, ?)", [userId, content], () => res.json({ success: true }));
});

app.get('/api/notes/global', (req, res) => {
    const sql = "SELECT n.content, u.username, n.created_at FROM notes n JOIN users u ON n.user_id = u.id ORDER BY n.created_at DESC LIMIT 50";
    connection.query(sql, (err, result) => res.json(result));
});

app.get('/api/notes/user/:userId', (req, res) => {
    connection.query("SELECT content, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC", [req.params.userId], (err, result) => res.json(result));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
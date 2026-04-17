const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Auth & User Info ---
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    connection.query("SELECT id FROM users WHERE username = ? AND password = ?", [username, password], (err, result) => {
        if (result.length > 0) res.json({ userId: result[0].id });
        else res.status(401).json({ error: "Login Fail" });
    });
});

app.get('/api/user-info/:userId', (req, res) => {
    connection.query("SELECT username, password, country FROM users WHERE id = ?", [req.params.userId], (err, result) => res.json(result[0] || {}));
});

app.post('/api/update-profile', (req, res) => {
    const { userId, newUsername, newPassword, newCountry } = req.body;
    connection.query("UPDATE users SET username = ?, password = ?, country = ? WHERE id = ?", [newUsername, newPassword, newCountry, userId], () => res.json({success: true}));
});

// --- Note System with Like & Filter ---
app.get('/api/notes', (req, res) => {
    const { type, userId, sort } = req.query;
    let orderBy = "n.created_at DESC"; // Default: Latest
    
    if (sort === "oldest") orderBy = "n.created_at ASC";
    else if (sort === "likes") orderBy = "n.likes DESC";
    else if (sort === "level") orderBy = "s.level DESC";
    else if (sort === "random") orderBy = "RAND()";

    let sql = `
        SELECT n.*, u.username, s.level 
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        LEFT JOIN game_stats s ON u.id = s.user_id`;
    
    if (type === "user") sql += ` WHERE n.user_id = ${mysql.escape(userId)}`;
    sql += ` ORDER BY ${orderBy} LIMIT 100`;

    connection.query(sql, (err, result) => res.json(result));
});

app.post('/api/notes/like', (req, res) => {
    const { noteId } = req.body;
    connection.query("UPDATE notes SET likes = likes + 1 WHERE id = ?", [noteId], () => res.json({ success: true }));
});

app.post('/api/notes/add', (req, res) => {
    const { userId, content } = req.body;
    connection.query("INSERT INTO notes (user_id, content) VALUES (?, ?)", [userId, content], () => res.json({ success: true }));
});

app.post('/api/notes/delete', (req, res) => {
    const { noteId, userId } = req.body;
    connection.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId], () => res.json({ success: true }));
});

// --- Leaderboard System with Filters ---
app.get('/api/leaderboard', (req, res) => {
    const { filter } = req.query;
    let orderBy = "(IFNULL(s.level,1) * 10 + IFNULL(s.total_notes,0) * 5 + IFNULL(sum_likes.total,0)) DESC"; // Overall

    if (filter === "notes") orderBy = "s.total_notes DESC";
    else if (filter === "likes") orderBy = "IFNULL(sum_likes.total,0) DESC";
    else if (filter === "level") orderBy = "s.level DESC";

    const sql = `
        SELECT u.username, u.country, u.created_at, 
               IFNULL(s.level, 1) as level, 
               IFNULL(s.total_notes, 0) as notes,
               IFNULL(sum_likes.total, 0) as total_likes
        FROM users u 
        LEFT JOIN game_stats s ON u.id = s.user_id
        LEFT JOIN (SELECT user_id, SUM(likes) as total FROM notes GROUP BY user_id) sum_likes ON u.id = sum_likes.user_id
        ORDER BY ${orderBy} LIMIT 50`;
    
    connection.query(sql, (err, result) => res.json(result));
});

app.post('/api/save', (req, res) => {
    const { userId, level, exp, totalNotes } = req.body;
    connection.query("INSERT INTO game_stats (user_id, level, exp, total_notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE level=?, exp=?, total_notes=?", [userId, level, exp, totalNotes, level, exp, totalNotes], () => res.json({success: true}));
});

app.get('/api/load/:userId', (req, res) => {
    connection.query("SELECT level, exp, total_notes FROM game_stats WHERE user_id = ?", [req.params.userId], (err, result) => res.json(result[0] || {level:1, exp:0, total_notes:0}));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
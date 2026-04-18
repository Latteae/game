const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();

const app = express();
const connection = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Auth ---
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    connection.query("SELECT id FROM users WHERE username = ? AND password = ?", [username, password], (err, result) => {
        if (result.length > 0) res.json({ userId: result[0].id });
        else res.status(401).json({ error: "Fail" });
    });
});

app.post('/api/signup', (req, res) => {
    const { username, password, country } = req.body;
    connection.query("INSERT INTO users (username, password, country) VALUES (?, ?, ?)", [username, password, country], (err) => {
        if (err) return res.status(400).json({ error: "Error" });
        res.json({ message: "Success" });
    });
});

// --- Notes System ---
app.get('/api/notes', (req, res) => {
    const { type, userId, sort } = req.query;
    let orderBy = "n.created_at DESC";
    if (sort === "oldest") orderBy = "n.created_at ASC";
    else if (sort === "likes") orderBy = "n.likes DESC";
    else if (sort === "random") orderBy = "RAND()";

    let sql = `
        SELECT n.*, u.username, 
        EXISTS(SELECT 1 FROM note_likes WHERE note_id = n.id AND user_id = ${mysql.escape(userId)}) as isLiked
        FROM notes n 
        JOIN users u ON n.user_id = u.id`;
    
    if (type === "user") sql += ` WHERE n.user_id = ${mysql.escape(userId)}`;
    sql += ` ORDER BY ${orderBy} LIMIT 100`;

    connection.query(sql, (err, result) => res.json(result));
});

app.post('/api/notes/add', (req, res) => {
    const { userId, title, content } = req.body;
    connection.query("INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)", [userId, title, content], () => res.json({ success: true }));
});

app.post('/api/notes/like', (req, res) => {
    const { noteId, userId } = req.body;
    connection.query("SELECT * FROM note_likes WHERE user_id = ? AND note_id = ?", [userId, noteId], (err, result) => {
        if (result.length > 0) {
            connection.query("DELETE FROM note_likes WHERE user_id = ? AND note_id = ?", [userId, noteId]);
            connection.query("UPDATE notes SET likes = likes - 1 WHERE id = ?", [noteId]);
            res.json({ liked: false });
        } else {
            connection.query("INSERT INTO note_likes (user_id, note_id) VALUES (?, ?)", [userId, noteId]);
            connection.query("UPDATE notes SET likes = likes + 1 WHERE id = ?", [noteId]);
            res.json({ liked: true });
        }
    });
});

app.post('/api/notes/delete', (req, res) => {
    const { noteId, userId } = req.body;
    connection.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [noteId, userId], () => res.json({ success: true }));
});

// --- Leaderboard (นับจำนวนโน๊ตสดๆ จากตาราง notes) ---
app.get('/api/leaderboard', (req, res) => {
    const { filter } = req.query;
    let orderBy = "(notes_count * 5 + IFNULL(sum_likes.total,0)) DESC";
    if (filter === "notes") orderBy = "notes_count DESC";
    else if (filter === "likes") orderBy = "IFNULL(sum_likes.total,0) DESC";

    const sql = `
        SELECT u.username, u.country, u.created_at, 
               (SELECT COUNT(*) FROM notes WHERE user_id = u.id) as notes_count,
               IFNULL(sum_likes.total, 0) as total_likes
        FROM users u 
        LEFT JOIN (SELECT user_id, SUM(likes) as total FROM notes GROUP BY user_id) sum_likes ON u.id = sum_likes.user_id
        ORDER BY ${orderBy} LIMIT 50`;
    connection.query(sql, (err, result) => res.json(result));
});

// --- User Stats (ดึงจำนวนโน๊ตปัจจุบัน ไม่รวมที่ลบ) ---
app.get('/api/load-stats/:userId', (req, res) => {
    connection.query("SELECT COUNT(*) as total_notes FROM notes WHERE user_id = ?", [req.params.userId], (err, result) => {
        res.json(result[0] || { total_notes: 0 });
    });
});

app.get('/api/user-info/:userId', (req, res) => {
    connection.query("SELECT username, password, country FROM users WHERE id = ?", [req.params.userId], (err, result) => res.json(result[0] || {}));
});

app.post('/api/update-profile', (req, res) => {
    const { userId, newUsername, newPassword, newCountry } = req.body;

    // เช็คก่อนว่าชื่อผู้ใช้ใหม่ที่ต้องการเปลี่ยนนี้ มีคนอื่น (ที่ ID ไม่ใช่ของเรา) ใช้งานอยู่หรือยัง
    const checkQuery = 'SELECT id FROM users WHERE username = ? AND id != ?';
    
    db.query(checkQuery, [newUsername, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // 2. ถ้า Query แล้วเจอข้อมูล แปลว่าชื่อนี้มีคนใช้ไปแล้ว
        if (results.length > 0) {
            return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' });
        }

        // 3. ถ้าไม่ซ้ำ ก็ทำการอัปเดตข้อมูลตามปกติ
        const updateQuery = 'UPDATE users SET username = ?, password = ?, country = ? WHERE id = ?';
        db.query(updateQuery, [newUsername, newPassword, newCountry, userId], (err2) => {
            if (err2) {
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            res.json({ success: true, message: 'Profile updated' });
        });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));
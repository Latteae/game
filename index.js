const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

// --- ส่วนการเชื่อมต่อ Database (ปรับค่าตามที่คุณใช้งานใน Railway) ---
const db = mysql.createConnection(process.env.DATABASE_URL || {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'note_app'
});

db.connect(err => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to MySQL Database');
});

// --- API สำหรับโปรไฟล์และการเช็คชื่อซ้ำ ---

// 1. ดึงข้อมูล User
app.get('/api/user-info/:id', (req, res) => {
    db.query('SELECT username, password, country FROM users WHERE id = ?', [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

// 2. อัปเดตโปรไฟล์ (พร้อมเช็คชื่อซ้ำ)
app.post('/api/update-profile', (req, res) => {
    const { userId, newUsername, newPassword, newCountry } = req.body;

    // เช็คว่าชื่อใหม่มีคนอื่นใช้หรือยัง (ยกเว้นตัวเอง)
    const checkQuery = 'SELECT id FROM users WHERE username = ? AND id != ?';
    db.query(checkQuery, [newUsername, userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (results.length > 0) {
            // ส่ง Error กลับไปถ้าชื่อซ้ำ
            return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาใช้ชื่ออื่น' });
        }

        // ถ้าไม่ซ้ำ ทำการอัปเดต
        const updateQuery = 'UPDATE users SET username = ?, password = ?, country = ? WHERE id = ?';
        db.query(updateQuery, [newUsername, newPassword, newCountry, userId], (err2) => {
            if (err2) return res.status(500).json({ error: 'Update failed' });
            res.json({ success: true });
        });
    });
});

// --- API สำหรับจัดการ Notes ---

// 3. ดึงรายการโน๊ต (แสดง ID ด้วย)
app.get('/api/notes', (req, res) => {
    const { type, userId, sort } = req.query;
    let query = `
        SELECT notes.*, users.username, 
        (SELECT COUNT(*) FROM likes WHERE note_id = notes.id) as likes,
        (SELECT COUNT(*) FROM likes WHERE note_id = notes.id AND user_id = ?) as isLiked
        FROM notes 
        JOIN users ON notes.user_id = users.id
    `;
    
    let params = [userId];

    if (type === 'user') {
        query += ' WHERE notes.user_id = ?';
        params.push(userId);
    }

    if (sort === 'latest') query += ' ORDER BY notes.id DESC';
    else if (sort === 'oldest') query += ' ORDER BY notes.id ASC';
    else if (sort === 'likes') query += ' ORDER BY likes DESC';
    else if (sort === 'random') query += ' ORDER BY RAND()';

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 4. เพิ่มโน๊ตใหม่
app.post('/api/notes/add', (req, res) => {
    const { userId, title, content } = req.body;
    db.query('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)', [userId, title, content], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// 5. ลบโน๊ต
app.post('/api/notes/delete', (req, res) => {
    const { noteId, userId } = req.body;
    db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// 6. ระบบ Like / Unlike (Toggle)
app.post('/api/notes/like', (req, res) => {
    const { noteId, userId } = req.body;
    db.query('SELECT * FROM likes WHERE note_id = ? AND user_id = ?', [noteId, userId], (err, results) => {
        if (results.length > 0) {
            db.query('DELETE FROM likes WHERE note_id = ? AND user_id = ?', [noteId, userId], () => res.json({ action: 'unliked' }));
        } else {
            db.query('INSERT INTO likes (note_id, user_id) VALUES (?, ?)', [noteId, userId], () => res.json({ action: 'liked' }));
        }
    });
});

// --- API อื่นๆ ---

app.get('/api/load-stats/:userId', (req, res) => {
    db.query('SELECT COUNT(*) as total_notes FROM notes WHERE user_id = ?', [req.params.userId], (err, results) => {
        res.json(results[0]);
    });
});

app.get('/api/leaderboard', (req, res) => {
    const { filter } = req.query;
    let orderBy = 'notes_count DESC';
    if (filter === 'likes') orderBy = 'total_likes DESC';

    const query = `
        SELECT users.username, users.country, 
        (SELECT COUNT(*) FROM notes WHERE user_id = users.id) as notes_count,
        (SELECT COUNT(*) FROM likes WHERE note_id IN (SELECT id FROM notes WHERE user_id = users.id)) as total_likes
        FROM users ORDER BY ${orderBy} LIMIT 10
    `;
    db.query(query, (err, results) => res.json(results));
});

// Auth System
app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT id FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (results.length > 0) res.json({ userId: results[0].id });
        else res.status(401).send('Invalid');
    });
});

app.post('/api/signup', (req, res) => {
    const { username, password, country } = req.body;
    db.query('INSERT INTO users (username, password, country) VALUES (?, ?, ?)', [username, password, country], (err) => {
        if (err) res.status(500).send(err);
        else res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
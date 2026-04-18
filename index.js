// จำลองสถานะ Login (ในการใช้งานจริงให้เช็คจาก Token หรือ Session)
let currentUser = null; 
let allNotes = []; // ข้อมูลโน๊ตจาก Database

function updateUI() {
    const authContent = document.getElementById('authContent');
    const writeBtn = document.getElementById('writeNoteAction');
    const noteCountTitle = document.getElementById('noteCountDisplay');

    if (!currentUser) {
        // --- กรณีที่ยังไม่เข้าสู่ระบบ ---
        writeBtn.innerHTML = 'Sign In to write a note ⮕';
        writeBtn.style.backgroundColor = '#95a5a6';
        writeBtn.onclick = () => {
            document.getElementById('sidebar').classList.add('active');
        };
        
        noteCountTitle.innerText = `จำนวนโน๊ตทั้งหมด: ${allNotes.length}`;

        authContent.innerHTML = `
            <h3 style="margin-top:0">Sign In / Sign Up</h3>
            <p style="font-size:0.8rem; color:#888;">กรุณาเข้าสู่ระบบเพื่อเริ่มเขียนโน๊ต</p>
            <input type="text" id="userIn" class="auth-input" placeholder="Username">
            <input type="password" id="passIn" class="auth-input" placeholder="Password">
            <button class="btn-auth" onclick="handleLogin()">เข้าสู่ระบบ / สมัครสมาชิก</button>
            <hr style="border:0; border-top:1px solid var(--border-cream); margin:20px 0;">
            <p style="font-size:0.8rem; text-align:center;">⮕ จัดการบัญชีได้ที่เมนูนี้</p>
        `;
    } else {
        // --- กรณีที่เข้าสู่ระบบแล้ว (สมมติชื่อ Latte) ---
        writeBtn.innerHTML = '✍️ เขียนโน๊ต';
        writeBtn.style.backgroundColor = '#3498db';
        writeBtn.onclick = () => openNoteModal(); // ฟังก์ชันเปิดหน้าเขียนโน๊ตเดิมของคุณ
        
        // แสดงชื่อผู้ใช้ผสมกับจำนวนโน๊ต
        const userNotes = allNotes.filter(n => n.username === currentUser.username);
        noteCountTitle.innerText = `${currentUser.username}'s Notes : ${userNotes.length}`;

        authContent.innerHTML = `
            <h3 style="margin-top:0">แก้ไขโปรไฟล์</h3>
            <div class="user-info">
                <label style="font-size:0.8rem;">ชื่อผู้ใช้</label>
                <input type="text" id="editName" class="auth-input" value="${currentUser.username}">
                <label style="font-size:0.8rem;">รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)</label>
                <input type="password" id="editPass" class="auth-input" placeholder="*****">
                <button class="btn-auth" onclick="saveProfile()">บันทึกการเปลี่ยนแปลง</button>
                <button class="btn-auth" style="background:var(--accent-red); margin-top:10px;" onclick="handleLogout()">ออกจากระบบ</button>
            </div>
        `;
    }
}

// ตัวอย่างฟังก์ชัน Login (ให้คุณนำไปเชื่อมกับ API ของคุณ)
function handleLogin() {
    const user = document.getElementById('userIn').value;
    if(user) {
        currentUser = { username: user, id: 1 }; // จำลองการ Login สำเร็จ
        updateUI();
        toggleSidebar(); // ปิด sidebar
    }
}

function handleLogout() {
    currentUser = null;
    updateUI();
    toggleSidebar();
}

// รันครั้งแรกเมื่อโหลดหน้า
window.onload = () => {
    // โหลดโน๊ตจาก API แล้วค่อยสั่ง updateUI
    updateUI();
};
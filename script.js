// ======================================================
// 🟢 1. การตั้งค่า Supabase
// ======================================================
const SB_URL = 'https://ngpsplbcdzjrmrrkkeqg.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncHNwbGJjZHpqcm1ycmtrZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDk5MDYsImV4cCI6MjA4MTEyNTkwNn0.mtPTH_cu9QqmpMLEK3u5hElNsmDqIxVWuBDd-J6sOrM'; 
let supabaseClient;

// ตรวจสอบว่า Library จาก index.html โหลดมาหรือยัง
if (typeof window.supabase === 'undefined') {
    console.error("❌ ไม่สามารถโหลด Library Supabase ได้");
} else {
    // ใช้ชื่อ supabaseClient เพื่อไม่ให้ชนกับชื่อ global 'supabase'
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ฟังก์ชันเช็คว่าเชื่อมต่อ Database ได้จริงไหม
async function checkDatabaseConnection() {
    try {
        const { data, error } = await supabaseClient.from('bookings').select('id').limit(1);
        if (error) throw error;
        console.log("✅ Database Status: เชื่อมต่อฐานข้อมูลสำเร็จ!");
    } catch (err) {
        console.error("❌ Database Status: เชื่อมต่อไม่สำเร็จ -", err.message);
        // กรณีเจอ Error เกี่ยวกับ Token (400/403) ให้บังคับ Logout เพื่อล้าง Session เก่า
        if (err.message.includes("Refresh Token")) {
            await supabaseClient.auth.signOut();
            window.location.reload();
        }
    }
}
const ROOM_INVENTORY = { 'สแตนดาร์ด': 7, 'ดีลักซ์': 2, 'ซูพีเรีย': 4, 'พรีเมี่ยม': 4, 'วีไอพี': 2, 'วีวีไอพี': 1 };
const roomTypeMapping = { 'สแตนดาร์ด': 'standard', 'ดีลักซ์': 'deluxe', 'ซูพีเรีย': 'superior', 'พรีเมี่ยม': 'premium', 'วีไอพี': 'vip', 'วีวีไอพี': 'vvip' };

// ======================================================
// 🟢 2. แจ้งเตือน Toast
// ======================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3500);
}

// ======================================================
// 🟢 3. จัดการข้อมูลและการจอง
// ======================================================
async function fetchAndRenderData() {
    const { data: bookings, error } = await window.sb.from('bookings').select('*')
        .gte('end_date', '2025-11-01').lte('start_date', '2026-02-01');

    if (error) { console.error(error); return; }

    const events = bookings.map(b => ({
        id: b.id,
        title: b.cat_names,
        roomType: b.room_type,
        start: new Date(b.start_date),
        end: new Date(b.end_date),
        cls: `ev-${roomTypeMapping[b.room_type] || 'default'}`
    }));

    buildMonth(document.getElementById('days-dec'), document.getElementById('wd-dec'), 2025, 11, events);
    buildMonth(document.getElementById('days-jan'), document.getElementById('wd-jan'), 2026, 0, events);
    generateSummaryTable(events);
}

function buildMonth(container, wdContainer, year, month, events) {
    const wdNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    wdContainer.innerHTML = wdNames.map(w => `<div class="weekday">${w}</div>`).join('');

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const cells = [];
    
    // เติมวันว่างข้างหน้า
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));

    container.innerHTML = '';
    cells.forEach(date => {
        const el = document.createElement('div');
        el.className = 'day' + (!date ? ' other' : '');
        if (date) {
            el.innerHTML = `<div class="num">${date.getDate()}</div>`;
            const time = date.setHours(0,0,0,0);

            events.filter(ev => {
                const s = new Date(ev.start).setHours(0,0,0,0);
                const e = new Date(ev.end).setHours(0,0,0,0);
                return time >= s && time <= e;
            }).forEach(ev => {
                const s = new Date(ev.start).setHours(0,0,0,0);
                const e = new Date(ev.end).setHours(0,0,0,0);
                
                let label = ev.title;
                // ปรับ Label: เอาแค่ เข้า กับ ออก
                if (time === s) label += ' (เข้า)';
                else if (time === e) label += ' (ออก)';

                const span = document.createElement('span');
                span.className = 'event ' + ev.cls;
                span.textContent = label;
                span.onclick = (e) => { e.stopPropagation(); showPopupAll([ev], date); };
                el.appendChild(span);
            });
        }
        container.appendChild(el);
    });
}

// (ฟังก์ชัน Auth, Summary, Popup อื่นๆ ให้ใช้ Logic เดิมแต่เปลี่ยนจาก alert เป็น showToast)
async function checkSession() {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session) { document.getElementById('app-container').style.display='block'; document.getElementById('login-container').style.display='none'; fetchAndRenderData(); }
}

window.handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await window.sb.auth.signInWithPassword({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });
    if (error) showToast("ล็อกอินไม่สำเร็จ: " + error.message, "error");
    else { showToast("เข้าสู่ระบบสำเร็จ", "success"); checkSession(); }
};

window.handleLogout = async () => {
    await window.sb.auth.signOut();
    location.reload();
};

checkSession();



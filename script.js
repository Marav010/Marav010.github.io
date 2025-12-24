// ======================================================
// 🟢 1. ตั้งค่า Supabase (ต้องอยู่บนสุดของไฟล์เสมอ)
// ======================================================
const SUPABASE_URL = 'https://ngpsplbcdzjrmrrkkeqg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncHNwbGJjZHpqcm1ycmtrZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDk5MDYsImV4cCI6MjA4MTEyNTkwNn0.mtPTH_cu9QqmpMLEK3u5hElNsmDqIxVWuBDd-J6sOrM';

// ใช้ชื่อ supabaseClient เพื่อไม่ให้ซ้ำกับตัวแปร 'supabase' ที่มาจาก Library
let supabaseClient;

// ฟังก์ชันสำหรับสร้าง Client และเช็คการเชื่อมต่อ
function initializeSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error("❌ Library Supabase ไม่โหลด! กรุณาตรวจสอบอินเทอร์เน็ตหรือไฟล์ index.html");
        return false;
    }
    
    // สร้าง Client เก็บไว้ใน supabaseClient
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase Client Initialized");
    return true;
}

// ฟังก์ชันเช็คว่า Database ตาราง bookings ใช้งานได้จริงไหม
async function checkDatabaseHealth() {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient.from('bookings').select('id').limit(1);
        if (error) throw error;
        console.log("✅ Database Connection: ตาราง bookings พร้อมใช้งาน");
    } catch (err) {
        console.error("❌ Database Connection Error:", err.message);
    }
}

// ข้อมูลห้องพัก
const ROOM_TYPES = ['สแตนดาร์ด', 'ดีลักซ์', 'ซูพีเรีย', 'พรีเมี่ยม', 'วีไอพี', 'วีวีไอพี'];
const ROOM_INVENTORY = { 'สแตนดาร์ด': 7, 'ดีลักซ์': 2, 'ซูพีเรีย': 4, 'พรีเมี่ยม': 4, 'วีไอพี': 2, 'วีวีไอพี': 1 };

// ======================================================
// 🟢 0. ฟังก์ชัน Notification (แจ้งเตือนแบบสวยงาม)
// ======================================================

let resolveConfirmation;

function showNotification(message, isError = false) {
    const box = document.getElementById('notificationBox');
    const content = document.getElementById('notificationContent');
    if (!box || !content) return;

    content.innerHTML = `
        <h3 style="margin-top:0; color:${isError ? '#ef4444' : '#10b981'};">${isError ? '🚫 ข้อผิดพลาด' : '✅ สำเร็จ'}</h3>
        <p style="margin-bottom:20px;">${message}</p>
        <button class="submit-btn" style="width:100%; background:${isError ? '#ef4444' : '#10b981'};" onclick="hideNotification()">ตกลง</button>
    `;
    box.style.display = 'flex';
}

function showConfirmation(message, onConfirm) {
    const box = document.getElementById('notificationBox');
    const content = document.getElementById('notificationContent');
    if (!box || !content) return;

    resolveConfirmation = onConfirm;

    content.innerHTML = `
        <h3 style="margin-top:0; color:#f59e0b;">⚠️ ยืนยันการดำเนินการ</h3>
        <p style="margin-bottom:20px;">${message}</p>
        <div style="display:flex; gap:10px;">
            <button class="submit-btn delete-btn" style="flex-grow:1;" onclick="confirmAction(true)">ยืนยัน</button>
            <button class="submit-btn cancel-btn" style="flex-grow:1; background:#94a3b8;" onclick="confirmAction(false)">ยกเลิก</button>
        </div>
    `;
    box.style.display = 'flex';
}


window.confirmAction = function (isConfirmed) {
    hideNotification();
    if (resolveConfirmation) {
        resolveConfirmation(isConfirmed);
    }
}

window.hideNotification = function () {
    document.getElementById('notificationBox').style.display = 'none';
}


// ======================================================
// 🟢 2. ฟังก์ชันตรวจสอบสถานะและการจัดการหน้า (Auth Handler)
// ======================================================

async function startApp() {
    // 1. เริ่มต้นสร้าง Client ก่อนเป็นอันดับแรก
    const isReady = initializeSupabase();
    if (!isReady) return;

    // 2. เช็ค Session ปัจจุบัน
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // 3. ตั้งค่า Listeners (แก้จุดที่เกิด Error onAuthStateChange)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event:", event);
        handleAuthState(session);
    });

    handleAuthState(session);
}

function handleAuthState(session) {
    const isLoggedIn = !!session;
    
    // จัดการการแสดงผลหน้าจอ
    const loginUI = document.getElementById('login-container');
    const appUI = document.getElementById('app-container');
    
    if (loginUI) loginUI.style.display = isLoggedIn ? 'none' : 'flex';
    if (appUI) appUI.style.display = isLoggedIn ? 'block' : 'none';

    if (isLoggedIn) {
        checkDatabaseHealth();
        if (typeof fetchAndRenderData === 'function') fetchAndRenderData();
    }
}

// ฟังก์ชัน Login สำหรับปุ่มกดยืนยัน
window.handleLogin = async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    }
};

// ฟังก์ชัน Logout
window.handleLogout = async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
};

// ======================================================
// 🟢 3. ฟังก์ชันการเข้าสู่ระบบ (Login)
// ======================================================

async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showApp(true);
        checkDatabase();
        if (typeof fetchAndRenderData === 'function') fetchAndRenderData();
    } else {
        showApp(false);
    }
}

function showApp(isLoggedIn) {
    const loginUI = document.getElementById('login-container');
    const appUI = document.getElementById('app-container');
    if (loginUI) loginUI.style.display = isLoggedIn ? 'none' : 'flex';
    if (appUI) appUI.style.display = isLoggedIn ? 'block' : 'none';
}

window.handleLogin = async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
    } else {
        window.location.reload();
    }
};

window.handleLogout = async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
};

// เริ่มต้นตรวจสอบเซสชัน
checkSession();


// ======================================================
// 🟢 4. ฟังก์ชันหลักในการดึงและแสดงข้อมูล (Read)
// ======================================================

async function fetchAndRenderData() {
    console.log("Fetching data from Supabase...");

    const { data: bookings, error } = await supabase
        .from('bookings')
        // บรรทัดนี้คือส่วนที่เรียกคอลัมน์ color_hex
        .select('id, cat_names, room_type, start_date, end_date, color_hex') 
        .gte('end_date', '2025-11-01')
        .lte('start_date', '2026-02-01')
        .order('start_date', { ascending: true });

    if (error) {
        // *** ดักจับ Error Code 42703 (Undefined column) โดยเฉพาะ ***
        if (error.code === '42501') {
            document.getElementById('summary-area').innerHTML = `<h2 style="color:#ef4444; text-align:center;">🚫 ไม่ได้รับอนุญาตให้เข้าถึงข้อมูล (RLS Blocked).</h2><p style="text-align:center;">โปรดตรวจสอบสิทธิ์การเข้าถึงของผู้ใช้</p>`;
        } else if (error.code === '42703') { 
            // ข้อความเตือนเมื่อไม่พบคอลัมน์ color_hex
            document.getElementById('summary-area').innerHTML = `<h2 style="color:#ef4444; text-align:center;">🚫 ข้อผิดพลาด: ไม่พบคอลัมน์ 'color_hex' ในฐานข้อมูล! (Code: 42703)</h2><p style="text-align:center;">กรุณาทำตามขั้นตอน: เพิ่มคอลัมน์ 'color_hex' (Type: text) ในตาราง 'bookings' ใน Supabase Dashboard.</p>`;
        } else {
             document.getElementById('summary-area').innerHTML = `<h2 style="color:#ef4444; text-align:center;">เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message} (Code: ${error.code})</h2>`;
        }
        console.error('Error fetching bookings:', error);
        return;
    }

    const events = bookings.map(b => ({
        id: b.id,
        title: `${b.cat_names} (${b.room_type})`,
        start: new Date(b.start_date),
        end: new Date(b.end_date),
        cls: `ev-${roomTypeMapping[b.room_type] || 'default'}`,
        catNames: b.cat_names,
        roomType: b.room_type,
        colorHex: b.color_hex // เก็บค่าสีที่ดึงมา
    }));

    buildMonth(document.getElementById('days-dec'), document.getElementById('wd-dec'), 2025, 11, events);
    buildMonth(document.getElementById('days-jan'), document.getElementById('wd-jan'), 2026, 0, events);
    generateSummaryTable(events);
}

// ======================================================
// 5. ฟังก์ชันสร้างปฏิทิน & Popup
// ======================================================

function buildMonth(containerDays, containerWd, year, month, events) {
    const wdNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    containerWd.innerHTML = '';
    wdNames.forEach(w => containerWd.insertAdjacentHTML('beforeend', `<div class="weekday">${w}</div>`));

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startWeekday = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = startWeekday - 1; i >= 0; i--) { cells.push({ num: prevLast - i, other: true, date: new Date(year, month - 1, prevLast - i) }); }
    for (let d = 1; d <= totalDays; d++) { cells.push({ num: d, other: false, date: new Date(year, month, d) }); }
    let nextDayNum = 1;
    while (cells.length < 42) {
        cells.push({ num: nextDayNum, other: true, date: new Date(year, month + 1, nextDayNum) });
        nextDayNum++;
    }
    containerDays.innerHTML = '';
    cells.forEach(c => {
        const el = document.createElement('div');
        el.className = 'day' + (c.other ? ' other' : '');
        el.innerHTML = `<div class="num">${c.num}</div>`;

        const currentCellDate = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate());
        const currentCellTime = currentCellDate.getTime();

        const dayEvents = events.filter(ev => {
            const startDateOnly = new Date(ev.start);
            startDateOnly.setHours(0, 0, 0, 0);

            const endDateOnly = new Date(ev.end);
            endDateOnly.setHours(0, 0, 0, 0);

            // เงื่อนไข: แสดงการจองตั้งแต่วันเข้าจนถึงวันออก (รวมวันออก)
            return currentCellTime >= startDateOnly.getTime() && currentCellTime <= endDateOnly.getTime();
        });

        if (dayEvents.length > 0) {
            dayEvents.forEach(ev => {
                const startDateOnly = new Date(ev.start);
                startDateOnly.setHours(0, 0, 0, 0);

                const endDateOnly = new Date(ev.end);
                endDateOnly.setHours(0, 0, 0, 0);

                const match = ev.title.match(/(.*)\s*\((.*?)\)$/);
                let label = match ? match[1].trim() : ev.title;

                if (currentCellTime === startDateOnly.getTime()) {
                    label += ' (เข้า)';
                } else if (currentCellTime === endDateOnly.getTime()) {
                    label += ' (ออก)';
                }


                const span = document.createElement('span');

                // *** ใช้สีที่กำหนดเอง ถ้ามี ***
                if (ev.colorHex && ev.colorHex.toUpperCase() !== '#000000') { 
                    span.style.backgroundColor = ev.colorHex;
                    span.style.backgroundImage = 'none'; // ยกเลิก gradient ของ CSS เดิม
                    span.className = 'event ev-custom'; // ใช้ class ใหม่
                } else {
                    span.className = 'event ' + ev.cls; // ใช้สีตามประเภทห้องเดิม
                }

                span.textContent = label;
                span.dataset.eventId = ev.id;
                span.onclick = (e) => { e.stopPropagation(); showPopupAll(dayEvents, c.date); };
                el.appendChild(span);
            });
        }
        el.onclick = () => { if (dayEvents.length > 0) showPopupAll(dayEvents, c.date); };
        containerDays.appendChild(el);
    });
}


function formatDate(d) { return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
function toYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}


window.hidePopup = function () { document.getElementById('popupBox').style.display = 'none'; }
window.closePopup = function (e) { if (e.target.id === 'popupBox') hidePopup(); }

function showPopupAll(list, date) {
    let html = `<h3 style="margin-top:0; font-size:18px;">รายละเอียดการจองวันที่ ${formatDate(date)}</h3>`;
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    list.forEach(ev => {
        const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dtTime = dt.getTime();

        const startDateOnly = new Date(ev.start);
        startDateOnly.setHours(0, 0, 0, 0);

        const endDateOnly = new Date(ev.end);
        endDateOnly.setHours(0, 0, 0, 0);

        const match = ev.title.match(/(.*)\s*\((.*?)\)$/);
        const names = match ? match[1].trim() : ev.title;
        const roomType = match ? match[2].trim() : 'ไม่ระบุ';

        let status = '<span style="color:#27CCF5;"> กำลังพัก </span>'; // สถานะเริ่มต้น
        let icon = '🏠';

        if (dtTime === startDateOnly.getTime()) {
            status = '<span style="color:#10b981; font-weight:bold;"> เข้า </span>'; icon = '📥';
        }
        else if (dtTime === endDateOnly.getTime()) {
            status = '<span style="color:#f59e0b; font-weight:bold;"> ออก </span>'; icon = '📤';
        }

        // *** เตรียมค่าสีสำหรับส่งไปฟอร์มแก้ไข ***
        const colorHex = ev.colorHex || '#38bdf8'; // ค่าสี Default

        html += `<div style="background:#f3f4f6; padding:10px; border-radius:8px; font-size:13px;">
                                <div style="font-weight:600; margin-bottom:2px;">
                                    ${icon} ${names}
                                    ${ev.colorHex && ev.colorHex.toUpperCase() !== '#38BDF8' ? `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${ev.colorHex}; margin-left:5px; border:1px solid #ccc;"></span>` : ''}
                                </div>
                                <div style="color:#374151;">ห้อง: <strong>${roomType}</strong></div>
                                <div>สถานะ: ${status}</div>
                                <div style="color:#6b7280; font-size:11px; margin-top:2px;">(จอง: ${formatDate(ev.start)} - ${formatDate(ev.end)})</div>
                                <div style="display:flex; gap:8px; margin-top:8px;">
                                    <button class="popup-action-btn edit-btn" onclick="showFormPopup('${ev.id}', '${ev.catNames}', '${ev.roomType}', '${toYYYYMMDD(ev.start)}', '${toYYYYMMDD(ev.end)}', '${colorHex}')">แก้ไข</button>
                                    <button class="popup-action-btn delete-btn" onclick="deleteBooking('${ev.id}', '${ev.title}')">ลบ</button>
                                </div>
                            </div>`;
    });
    html += `</div><div class='close-btn' onclick='hidePopup()'>ปิดหน้าต่าง</div>`;

    document.getElementById('popupContent').innerHTML = html;
    document.getElementById('popupBox').style.display = 'flex';
}

// ======================================================
// 🟢 6. ฟังก์ชัน CRUD (Create, Update, Delete)
// ======================================================

window.submitBookingForm = async function (event) {
    event.preventDefault();
    const bookingId = document.getElementById('bookingId').value;
    const isUpdate = bookingId !== '';
    const actionText = isUpdate ? 'แก้ไข' : 'เพิ่ม';

    const colorHexValue = document.getElementById('colorHex').value; // ดึงค่าสี

    const bookingData = {
        cat_names: document.getElementById('catNames').value,
        room_type: document.getElementById('roomType').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        color_hex: colorHexValue, // เพิ่ม color_hex ในข้อมูลที่จะบันทึก
    };

    if (new Date(bookingData.start_date) >= new Date(bookingData.end_date)) {
        showNotification('วันเช็คอินต้องก่อนวันเช็คเอาท์!', true);
        return;
    }

    let error = null;

    if (isUpdate) {
        // ** Update (U) **
        const { error: updateError } = await supabase
            .from('bookings')
            .update(bookingData)
            .eq('id', bookingId);
        error = updateError;
    } else {
        // ** Create (C) **
        const { error: insertError } = await supabase
            .from('bookings')
            .insert([bookingData]);
        error = insertError;
    }

    if (error) {
        if (error.code === '42501') {
            showNotification(`🚫 ไม่ได้รับอนุญาต! RLS ปฏิเสธการ ${actionText} ข้อมูล.`, true);
        } else if (error.code === '42703') { 
            showNotification(`🚫 ข้อผิดพลาด: ไม่พบคอลัมน์ 'color_hex' ในฐานข้อมูล! (Code: 42703) กรุณาแก้ไขฐานข้อมูล Supabase ก่อน`, true);
        } else {
            showNotification(`${actionText}ข้อมูลการจองไม่สำเร็จ: ${error.message}`, true);
        }
        console.error(`${actionText} Error:`, error);
    } else {
        showNotification(`${actionText}ข้อมูลการจองสำเร็จ!`);
        hideFormPopup();
        hidePopup();
        fetchAndRenderData();
    }
}

window.deleteBooking = async function (id, title) {
    const bookingId = String(id);

    showConfirmation(`ยืนยันการลบการจอง "${title}" หรือไม่?`, async (confirmed) => {
        if (!confirmed) {
            return;
        }
        // ** Delete (D) **
        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', bookingId);
        if (error) {
            if (error.code === '42501') {
                showNotification(`🚫 ไม่ได้รับอนุญาต! RLS ปฏิเสธการลบข้อมูล.`, true);
            } else {
                showNotification(`ลบข้อมูลการจองไม่สำเร็จ: ${error.message}`, true);
            }
            console.error('Delete Error: (ID:', id, ')', error);
        } else {
            showNotification('ลบข้อมูลการจองสำเร็จ!');
            hidePopup();
            fetchAndRenderData();
        }
    });
}

// ======================================================
// 7. ฟังก์ชันแสดง/ซ่อนฟอร์ม และ การจัดการสี
// ======================================================

// *** ฟังก์ชันดึงสีและชื่อแมวที่ใช้แล้ว (ปรับปรุงการกรองสีเริ่มต้น) ***
async function fetchExistingColors() {
    // ดึงเฉพาะชื่อแมวและสีที่ถูกกำหนด (ไม่เป็น null)
    const { data, error } = await supabase
        .from('bookings')
        .select('cat_names, color_hex')
        .not('color_hex', 'is', null);

    // ยังคงปล่อยให้ error.code 42703 ผ่านไปเพื่อให้โค้ดแสดงผลได้ แม้ว่าสีจะใช้งานไม่ได้
    if (error) {
        if (error.code !== '42501' && error.code !== '42703') {
             console.error('Error fetching existing colors:', error);
        }
        return [];
    }

    // จัดกลุ่มโดยใช้สีเป็นคีย์ และรวมชื่อแมวจาก booking ที่มีสีเดียวกัน
    const colorMap = new Map();
    data.forEach(item => {
        // *** เพิ่มการกรอง: ไม่รวมสีที่เป็น null, #000000 (สีดำ default จาก input), หรือสีฟ้า default ของระบบ
        if (item.color_hex && item.color_hex.toUpperCase() !== '#000000' && item.color_hex.toUpperCase() !== '#38BDF8') { 
            const hex = item.color_hex.toUpperCase();

            // ใช้ชื่อแรกของแต่ละการจองเป็นตัวแทน (เช่น 'A, B' จะใช้แค่ 'A')
            const currentNames = item.cat_names.split(',').map(n => n.trim())[0];

            if (colorMap.has(hex)) {
                // เพิ่มชื่อแมว (ถ้ายังไม่มีในรายการ)
                const existingItem = colorMap.get(hex);
                // ใช้ Set เพื่อรวมชื่อแรกของแต่ละ booking ที่ใช้สีเดียวกัน
                const combinedNames = Array.from(new Set([...existingItem.names.split(', ').map(n=>n.trim()), currentNames])).join(', ');
                colorMap.set(hex, { names: combinedNames, hex });
            } else {
                colorMap.set(hex, { names: currentNames, hex });
            }
        }
    });

    return Array.from(colorMap.values());
}


// *** อัปเดต: เพิ่ม colorHex เข้ามาในพารามิเตอร์ ***
window.showFormPopup = async function (id = '', catNames = '', roomType = ROOM_TYPES[0], startDate = '', endDate = '', colorHex = '#38bdf8') {
    hidePopup();

    const popupTitle = id ? 'แก้ไขข้อมูลการจอง' : 'เพิ่มการจองใหม่';
    const submitText = id ? 'บันทึกการแก้ไข' : 'เพิ่มการจอง';

    const roomOptions = ROOM_TYPES.map(room =>
        `<option value="${room}" ${room === roomType ? 'selected' : ''}>${room}</option>`
    ).join('');

    // 1. ดึงสีที่ใช้แล้ว (ฟังก์ชันนี้อาจล้มเหลวด้วย 42703 แต่เราปล่อยให้มันผ่านไป)
    let existingColors = [];
    try {
        existingColors = await fetchExistingColors();
    } catch(e) {
        // จัดการกรณีที่ fetchExistingColors ล้มเหลวด้วย 42703 ในกรณีที่ไม่ได้ทำ Try/Catch ไว้ในนั้น
        console.error("Could not fetch existing colors due to DB schema error (42703).");
    }


    // 2. สร้าง HTML สำหรับ Color Legend
    const colorLegendHTML = existingColors.length > 0 ?
        `<div class="color-legend-box">
            <label style="font-weight:700; color:#0f172a;">สีที่ใช้แล้ว (ชื่อแมว/บ้าน):</label>
            <div class="color-list">
                ${existingColors.map(item => `
                    <div class="color-item">
                        <span class="color-swatch" style="background:${item.hex};"></span>
                        <span class="color-name">${item.names}</span>
                    </div>
                `).join('')}
            </div>
        </div>` : '<p style="color:#94a3b8; font-size:11px; margin-top:5px; margin-bottom:0;">ยังไม่มีการกำหนดสีพิเศษ</p>';

    const html = `
        <h3 style="margin-top:0; font-size:18px;">${popupTitle}</h3>
        <form id="bookingForm" onsubmit="submitBookingForm(event)">
            <input type="hidden" id="bookingId" value="${id}">
            
            <label for="catNames">ชื่อน้องแมว (คั่นด้วย , หากมีหลายตัว):</label>
            <input type="text" id="catNames" value="${catNames}" required>

            <label for="roomType">ประเภทห้อง:</label>
            <select id="roomType" required>
                ${roomOptions}
            </select>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:15px; margin-top:12px;">
                <div style="flex-grow:1;">
                    <label for="colorHex">สีสำหรับปฏิทิน (เลือกได้):</label>
                    <input type="color" id="colorHex" value="${colorHex}" style="width:100%; height:40px; padding:0; border:1px solid #ccc; cursor:pointer;">
                </div>
                <div style="flex-shrink:0; max-height:160px; overflow-y:auto;">
                    ${colorLegendHTML}
                </div>
            </div>
            <label for="startDate">วันเช็คอิน (วันเข้าพัก):</label>
            <input type="date" id="startDate" value="${startDate}" required>

            <label for="endDate">วันเช็คเอาท์ (วันออกจากห้อง):</label>
            <input type="date" id="endDate" value="${endDate}" required>

            <button type="submit" class="submit-btn">${submitText}</button>
            <div class='close-btn cancel-btn' onclick='hideFormPopup()'>ยกเลิก</div>
        </form>
    `;

    document.getElementById('formPopupContent').innerHTML = html;
    document.getElementById('formPopupBox').style.display = 'flex';
}

window.hideFormPopup = function () {
    document.getElementById('formPopupBox').style.display = 'none';
}


// ======================================================
// 8. ฟังก์ชันสร้างตารางสรุป
// ======================================================

function generateAvailabilityTable(occupiedCounts) {
    let html = `
                <h2 style="margin-top:30px; border-bottom:1px solid #ddd; padding-bottom:12px; color:#10b981;">✅ สถานะห้องว่าง (อิงจากวันที่ 31 ธ.ค. 2568)</h2>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="30%">ประเภทห้อง</th>
                                <th width="20%" style="text-align:center;">จำนวนห้องทั้งหมด</th>
                                <th width="25%" style="text-align:center;">ห้องที่ถูกจอง (31 ธ.ค.)</th>
                                <th width="25%" style="text-align:center;">สถานะห้องว่าง</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

    for (const roomType of Object.keys(ROOM_INVENTORY)) {
        const total = ROOM_INVENTORY[roomType];
        const booked = occupiedCounts[roomType] || 0;
        const available = total - booked;

        let statusClass = 'style="background:#d1fae5; color:#065f46; font-weight:bold;"';
        let statusText = `ว่าง ${available} ห้อง`;

        if (available === 0) {
            statusClass = 'style="background:#fee2e2; color:#b91c1c; font-weight:bold;"';
            statusText = 'เต็ม (FULL)';
        } else if (available > 0 && available < total) {
            statusClass = 'style="background:#fffbe6; color:#a16207; font-weight:bold;"';
        } else if (available === total) {
            statusText = 'ว่างทุกห้อง';
        }

        html += `
                    <tr>
                        <td>${roomType}</td>
                        <td style="text-align:center;">${total}</td>
                        <td style="text-align:center;">${booked}</td>
                        <td ${statusClass} style="text-align:center;">${statusText}</td>
                    </tr>
                `;
    }

    html += `</tbody></table></div>`;
    return html;
}


function generateSummaryTable(events) {
    const crossYear = [];
    const notCrossYear = [];
    const occupiedCounts = {};

    const nyeDate = new Date(2025, 11, 31);
    const nyeStart = new Date(nyeDate.getFullYear(), nyeDate.getMonth(), nyeDate.getDate()).getTime();

    events.forEach(ev => {
        const match = ev.title.match(/(.*)\s*\((.*?)\)$/);
        const names = match ? match[1].trim() : ev.title;
        const roomType = match ? match[2].trim() : 'ไม่ระบุ';

        const catCount = names.split(',').length;

        const item = { names, roomType, catCount, start: ev.start, end: ev.end, originalTitle: ev.title };

        const startDateOnlyTime = new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()).getTime();

        if (startDateOnlyTime <= nyeStart && ev.end.getTime() > nyeStart) {
            occupiedCounts[roomType] = (occupiedCounts[roomType] || 0) + 1;
        }

        if (ev.start.getFullYear() === 2025 && ev.end.getFullYear() === 2026) {
            crossYear.push(item);
        } else {
            notCrossYear.push(item);
        }
    });

    const createBookingTableHTML = (title, data, badgeClass) => {
        let totalCats = 0;
        let rows = data.map(d => {
            totalCats += d.catCount;
            return `<tr>
                                <td>${d.names}</td>
                                <td>${d.roomType}</td>
                                <td>${formatDate(d.start)} - ${formatDate(d.end)}</td>
                                <td style="text-align:center;">1</td> <td style="text-align:center;">${d.catCount}</td>
                            </tr>`;
        }).join('');

        if (data.length === 0) rows = `<tr><td colspan="5" style="text-align:center; color:#999;">ไม่มีข้อมูล</td></tr>`;

        return `
                    <div class="summary-title">${title} <span class="badge ${badgeClass}">${data.length} รายการ</span></div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th width="28%">ชื่อน้องแมว</th>
                                    <th width="18%">ประเภทห้อง</th>
                                    <th width="28%">วันที่เข้า-ออก</th>
                                    <th width="13%" style="text-align:center;">จำนวนบ้าน (Booking)</th>
                                    <th width="13%" style="text-align:center;">จำนวนแมว</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                                <tr class="total-row">
                                    <td colspan="3" style="text-align:right;">รวม</td>
                                    <td style="text-align:center;">${data.length} บ้าน</td> <td style="text-align:center;">${totalCats} ตัว</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
    };

    const bookingSummaryHTML = `
                <h2 style="margin-top:0; border-bottom:1px solid #ddd; padding-bottom:12px;">📊 สรุปยอดการจองช่วงปีใหม่</h2>
                ${createBookingTableHTML('🎆 ลูกค้าที่พักข้ามปี (31 ธ.ค. - 1 ม.ค.)', crossYear, 'bg-green')}
                ${createBookingTableHTML('🏠 ลูกค้าที่ไม่พักข้ามปี', notCrossYear, 'bg-gray')}
            `;

    const availabilityHTML = generateAvailabilityTable(occupiedCounts);

    document.getElementById('summary-area').innerHTML = bookingSummaryHTML + availabilityHTML;
}


// 🟢 เริ่มต้น: ตรวจสอบสถานะการเข้าสู่ระบบเมื่อโหลดหน้า
checkSession();



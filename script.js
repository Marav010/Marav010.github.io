// ======================================================
// 🟢 1. การตั้งค่า Supabase
// ======================================================
const SUPABASE_URL = 'https://ngpsplbcdzjrmrrkkeqg.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncHNwbGJjZHpqcm1ycmtrZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDk5MDYsImV4cCI6MjA4MTEyNTkwNn0.mtPTH_cu9QqmpMLEK3u5hElNsmDqIxVWuBDd-J6sOrM'; 

let supabase;
const ROOM_TYPES = ['สแตนดาร์ด', 'ดีลักซ์', 'ซูพีเรีย', 'พรีเมี่ยม', 'วีไอพี', 'วีวีไอพี'];

if (typeof window.supabase === 'undefined') {
    console.error("Supabase client library is not loaded.");
} else {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ** ห้องพักทั้งหมด **
const ROOM_INVENTORY = {
    'สแตนดาร์ด': 7, 'ดีลักซ์': 2, 'ซูพีเรีย': 4, 'พรีเมี่ยม': 4, 'วีไอพี': 2, 'วีวีไอพี': 1
};

const roomTypeMapping = {
    'สแตนดาร์ด': 'standard', 'ดีลักซ์': 'deluxe', 'ซูพีเรีย': 'superior', 'พรีเมี่ยม': 'premium', 'วีไอพี': 'vip', 'วีวีไอพี': 'vvip'
};


// ======================================================
// 🟢 2. ฟังก์ชันตรวจสอบสถานะและการจัดการหน้า (Auth Handler)
// ======================================================

function showApp(show) {
    const app = document.getElementById('app-container');
    const login = document.getElementById('login-container');
    if (app) app.style.display = show ? 'block' : 'none';
    if (login) login.style.display = show ? 'none' : 'flex';
}

function updateAuthMessage(message, isError = false) {
    const msgEl = document.getElementById('auth-message');
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.style.color = isError ? '#ef4444' : '#10b981';
    }
}

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        showApp(true);
        fetchAndRenderData();
    } else {
        showApp(false);
    }
}

// ตั้งค่า listener สำหรับการเปลี่ยนแปลงสถานะ 
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    if (session) {
        showApp(true);
        fetchAndRenderData(); 
    } else {
        showApp(false);
        const summary = document.getElementById('summary-area');
        if (summary) summary.innerHTML = `<h2 style="color:#f59e0b; text-align:center;">กรุณาเข้าสู่ระบบเพื่อดูข้อมูล</h2>`;
        const daysDec = document.getElementById('days-dec');
        if (daysDec) daysDec.innerHTML = '';
        const daysJan = document.getElementById('days-jan');
        if (daysJan) daysJan.innerHTML = '';
    }
});

// ======================================================
// 🟢 3. ฟังก์ชันการเข้าสู่ระบบ (Login)
// ======================================================

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    updateAuthMessage('กำลังเข้าสู่ระบบ...');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        updateAuthMessage(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`, true);
        console.error('Login Error:', error);
    } 
}

window.handleLogout = async function() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        alert(`ออกจากระบบไม่สำเร็จ: ${error.message}`);
        console.error('Logout Error:', error);
    } else {
        alert('ออกจากระบบสำเร็จ');
    }
}


// ======================================================
// 🟢 4. ฟังก์ชันหลักในการดึงและแสดงข้อมูล (Read)
// ======================================================

async function fetchAndRenderData() {
    console.log("Fetching data from Supabase...");

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, cat_names, room_type, start_date, end_date') 
        .gte('end_date', '2025-11-01') 
        .lte('start_date', '2026-02-01') 
        .order('start_date', { ascending: true });

    if (error) {
         if (error.code === '42501') { 
             document.getElementById('summary-area').innerHTML = `<h2 style="color:#ef4444; text-align:center;">🚫 ไม่ได้รับอนุญาตให้เข้าถึงข้อมูล (RLS Blocked).</h2><p style="text-align:center;">โปรดตรวจสอบสิทธิ์การเข้าถึงของผู้ใช้</p>`;
             return;
        }
        console.error('Error fetching bookings:', error);
        document.getElementById('summary-area').innerHTML = `<h2 style="color:#ef4444; text-align:center;">เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}</h2>`;
        return;
    }

    const events = bookings.map(b => ({
        id: b.id,
        title: `${b.cat_names} (${b.room_type})`, 
        start: new Date(b.start_date),
        end: new Date(b.end_date),
        cls: `ev-${roomTypeMapping[b.room_type] || 'default'}`,
        catNames: b.cat_names,
        roomType: b.room_type 
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

                // *** แก้ไข Label ตรงนี้: ใช้แค่ (เข้า) และ (ออก) ***
                if (currentCellTime === startDateOnly.getTime()) {
                    label += ' (เข้า)';
                } else if (currentCellTime === endDateOnly.getTime()) {
                    label += ' (ออก)'; 
                } 
                // ลบเงื่อนไข 'ก่อนออก' ออก

                
                const span = document.createElement('span');
                span.className = 'event ' + ev.cls;
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


window.hidePopup = function() { document.getElementById('popupBox').style.display = 'none'; }
window.closePopup = function(e) { if (e.target.id === 'popupBox') hidePopup(); }

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
        
        // const dayBeforeEnd = endDateOnly.getTime() - (24 * 60 * 60 * 1000); // ไม่ได้ใช้แล้ว

        const match = ev.title.match(/(.*)\s*\((.*?)\)$/);
        const names = match ? match[1].trim() : ev.title;
        const roomType = match ? match[2].trim() : 'ไม่ระบุ';

        let status = '<span style="color:#27CCF5;"> กำลังพัก </span>'; // สถานะเริ่มต้น
        let icon = '🏠';
        
        // *** แก้ไขสถานะใน Pop-up: ใช้แค่ เข้า และ ออก ***
        if (dtTime === startDateOnly.getTime()) { 
            status = '<span style="color:#10b981; font-weight:bold;"> เข้า </span>'; icon = '📥'; 
        }
        else if (dtTime === endDateOnly.getTime()) {
             status = '<span style="color:#f59e0b; font-weight:bold;"> ออก </span>'; icon = '📤'; 
        }
        // ลบเงื่อนไข 'ก่อนออก' ออก

        html += `<div style="background:#f3f4f6; padding:10px; border-radius:8px; font-size:13px;">
                                <div style="font-weight:600; margin-bottom:2px;">${icon} ${names}</div>
                                <div style="color:#374151;">ห้อง: <strong>${roomType}</strong></div>
                                <div>สถานะ: ${status}</div>
                                <div style="color:#6b7280; font-size:11px; margin-top:2px;">(จอง: ${formatDate(ev.start)} - ${formatDate(ev.end)})</div>
                                <div style="display:flex; gap:8px; margin-top:8px;">
                                    <button class="popup-action-btn edit-btn" onclick="showFormPopup('${ev.id}', '${ev.catNames}', '${ev.roomType}', '${toYYYYMMDD(ev.start)}', '${toYYYYMMDD(ev.end)}')">แก้ไข</button>
                                    <button class="popup-action-btn delete-btn" onclick="deleteBooking('${ev.id}', '${ev.title}')">ลบ</button>
                                </div>
                            </div>`;
    });
    html += `</div><div class='close-btn' onclick='hidePopup()'>ปิดหน้าต่าง</div>`;

    document.getElementById('popupContent').innerHTML = html;
    document.getElementById('popupBox').style.display = 'flex';
}

// ======================================================
// 6. ฟังก์ชัน CRUD (Create, Update, Delete) - สำคัญสำหรับการแก้ไข/ลบ
// ======================================================

window.submitBookingForm = async function(event) {
    event.preventDefault();
    const bookingId = document.getElementById('bookingId').value;
    const isUpdate = bookingId !== '';
    const actionText = isUpdate ? 'แก้ไข' : 'เพิ่ม';

    const bookingData = {
        cat_names: document.getElementById('catNames').value,
        room_type: document.getElementById('roomType').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
    };

    if (new Date(bookingData.start_date) >= new Date(bookingData.end_date)) {
        alert('วันเช็คอินต้องก่อนวันเช็คเอาท์!');
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
            alert(`🚫 ไม่ได้รับอนุญาต! RLS ปฏิเสธการ ${actionText} ข้อมูล. (โปรดตรวจสอบนโยบาย RLS ใน Supabase)`);
        } else {
            alert(`${actionText}ข้อมูลการจองไม่สำเร็จ: ${error.message}`);
        }
        console.error(`${actionText} Error:`, error);
    } else {
        alert(`${actionText}ข้อมูลการจองสำเร็จ!`);
        hideFormPopup();
        hidePopup(); 
        fetchAndRenderData(); 
    }
}

window.deleteBooking = async function(id, title) {
    // ต้องตรวจสอบประเภทของ ID เพราะเราแก้การส่งค่าใน showPopupAll เป็น string
    const bookingId = String(id); 

    if (!confirm(`ยืนยันการลบการจอง "${title}" (ID: ${bookingId}) หรือไม่?`)) {
        return;
    }

    // ** Delete (D) **
    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

    if (error) {
        if (error.code === '42501') { 
            alert(`🚫 ไม่ได้รับอนุญาต! RLS ปฏิเสธการลบข้อมูล. (โปรดตรวจสอบนโยบาย RLS ใน Supabase)`);
        } else {
            alert(`ลบข้อมูลการจองไม่สำเร็จ: ${error.message}`);
        }
        console.error('Delete Error: (ID:', id, ')', error);
    } else {
        alert('ลบข้อมูลการจองสำเร็จ!');
        hidePopup(); 
        fetchAndRenderData(); 
    }
}

// ======================================================
// 7. ฟังก์ชันแสดง/ซ่อนฟอร์ม
// ======================================================

window.showFormPopup = function(id = '', catNames = '', roomType = ROOM_TYPES[0], startDate = '', endDate = '') {
    hidePopup(); 
    
    const popupTitle = id ? 'แก้ไขข้อมูลการจอง' : 'เพิ่มการจองใหม่';
    const submitText = id ? 'บันทึกการแก้ไข' : 'เพิ่มการจอง';

    const roomOptions = ROOM_TYPES.map(room => 
        `<option value="${room}" ${room === roomType ? 'selected' : ''}>${room}</option>`
    ).join('');

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

window.hideFormPopup = function() {
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
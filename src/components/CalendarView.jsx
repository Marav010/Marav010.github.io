import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon, Loader2, X, Trash2, LayoutDashboard,
  MousePointerClick, CalendarDays, Info, CheckCircle2, AlertCircle,
  BadgeCheck, Wallet, Receipt
} from 'lucide-react';

export default function CalendarView({ onDateClick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);
  const clickTimer = useRef(null);

  const getTodayStr = () => new Date().toLocaleDateString('sv-SE');
  const [selectedDateStatus, setSelectedDateStatus] = useState(getTodayStr());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // สถานะสำหรับ Custom Alert
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });

  const ROOM_CONFIG = {
    'สแตนดาร์ด': { total: 7, color: '#C39A7A', price: 300 },
    'ดีลักซ์': { total: 2, color: '#ad6ea8', price: 350 },
    'ซูพีเรีย': { total: 4, color: '#eea5a5', price: 350 },
    'พรีเมี่ยม': { total: 4, color: '#368daf', price: 400 },
    'วีไอพี': { total: 2, color: '#30532d', price: 500 },
    'วีวีไอพี': { total: 1, color: '#372C2E', price: 600 }
  };

  const getRoomColor = (type) => ROOM_CONFIG[type]?.color || '#e05f5f';

  // ฟังก์ชันคำนวณราคาสด
  const calculateLivePrice = (start, end, roomType) => {
    if (!start || !end) return 0;
    const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    const nights = diff > 0 ? diff : 0;
    return nights * (ROOM_CONFIG[roomType]?.price || 0);
  };

  const closeAllFcPopovers = () => {
    document.querySelectorAll('.fc-popover').forEach(el => el.remove());
  };

  useEffect(() => {
    if (isModalOpen) closeAllFcPopovers();
  }, [isModalOpen]);

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) throw error;
      const formattedEvents = data?.map(b => {
        const end = new Date(b.end_date);
        end.setDate(end.getDate() + 1);
        return {
          id: b.id,
          title: ` ${b.cat_names}`,
          start: b.start_date,
          end: end.toISOString().split('T')[0],
          backgroundColor: getRoomColor(b.room_type),
          borderColor: 'transparent',
          allDay: true,
          extendedProps: { ...b }
        };
      }) || [];
      setEvents(formattedEvents);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBookings();
    setSelectedDateStatus(getTodayStr());
  }, [fetchBookings]);

  const roomStatusSummary = Object.keys(ROOM_CONFIG).map(type => {
    const used = events.filter(event => (
      event.extendedProps.room_type === type &&
      selectedDateStatus >= event.start &&
      selectedDateStatus < event.end
    )).length;
    return { type, used, total: ROOM_CONFIG[type].total, available: ROOM_CONFIG[type].total - used };
  });

  // ฟังก์ชันลบแบบใช้ Alert สวยๆ
  const triggerDelete = () => {
    setAlertConfig({
      isOpen: true,
      type: 'danger',
      title: 'ยืนยันการลบการจอง?',
      message: `คุณต้องการลบข้อมูลการจองของ "${selectedBooking.customer_name}" ใช่หรือไม่?`,
      onConfirm: async () => {
        setIsUpdating(true);
        const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
        if (!error) {
          setIsModalOpen(false);
          fetchBookings();
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
        setIsUpdating(false);
      }
    });
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const newTotalPrice = calculateLivePrice(selectedBooking.start_date, selectedBooking.end_date, selectedBooking.room_type);

    const { error } = await supabase.from('bookings')
      .update({
        start_date: selectedBooking.start_date,
        end_date: selectedBooking.end_date,
        total_price: newTotalPrice
      })
      .eq('id', selectedBooking.id);

    if (!error) {
      setIsModalOpen(false);
      fetchBookings();
      setAlertConfig({
        isOpen: true,
        type: 'success',
        title: 'อัปเดตเรียบร้อย!',
        message: 'แก้ไขข้อมูลวันเข้าพักและปรับปรุงราคาใหม่สำเร็จแล้ว',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader2 className="animate-spin text-[#885E43]" size={40} />
    </div>
  );

  return (
    <div className="py-2 md:py-4 space-y-6 overflow-visible font-sans">

      {/* Dashboard Section (คงเดิมตาม Code คุณ) */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg border border-[#5D4037]">
              <CalendarIcon size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#372C2E]">ตารางเข้าพัก</h2>
              <p className="text-sm text-[#A1887F]">โรงแรมแมวจริงใจ</p>
            </div>
          </div>
        </div>

        <div id="status-dashboard" className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#372C2E]">สถานะห้องว่างวันที่: <span className="text-[#885E43]">{new Date(selectedDateStatus).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span></h3>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-[#A1887F] font-bold bg-[#FDFBFA] px-3 py-1 rounded-full border border-[#efebe9]">
              <MousePointerClick size={12} /> คลิก 2 ครั้งเพื่อจองใหม่
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {roomStatusSummary.map(item => (
              <div key={item.type} className={`p-3 rounded-2xl border ${item.available <= 0 ? 'bg-red-50 border-red-100' : 'bg-[#FDFBFA] border-[#efebe9]'}`}>
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black text-[#885E43] uppercase truncate">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoomColor(item.type) }}></div> {item.type}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-lg font-black ${item.available <= 0 ? 'text-red-500' : 'text-[#372C2E]'}`}>{item.available <= 0 ? 'เต็ม' : item.available}</span>
                  <span className="text-[10px] text-[#A1887F]">/ {item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white p-2 md:p-6 rounded-[2.5rem] border border-[#DBD0C5] shadow-lg overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="th"
          events={events}
          eventDisplay="block"
          displayEventTime={false}
          dayMaxEvents={3}
          height="auto"
          selectable={true}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          moreLinkClick={() => { setIsModalOpen(false); return 'popover'; }}
          dateClick={(info) => {
            closeAllFcPopovers();
            if (clickTimer.current) {
              clearTimeout(clickTimer.current); clickTimer.current = null;
              if (onDateClick) onDateClick(info.dateStr);
            } else {
              clickTimer.current = setTimeout(() => {
                setSelectedDateStatus(info.dateStr);
                document.getElementById('status-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                clickTimer.current = null;
              }, 250);
            }
          }}
          eventClick={(info) => {
            setSelectedBooking(info.event.extendedProps);
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* Modal แก้ไขข้อมูลการจอง */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200 border border-[#efebe9]">
            {/* Header */}
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarDays size={100} /></div>
              <div className="z-10">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <CalendarDays size={20} className="text-[#DE9E48]" />
                  ข้อมูลการจอง
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="z-10 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Read-Only Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#A1887F] uppercase flex items-center gap-1"><span className="w-1 h-1 bg-[#DE9E48] rounded-full"></span> เจ้าของ</label>
                  <div className="text-sm font-bold text-[#372C2E] bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedBooking.customer_name}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#A1887F] uppercase flex items-center gap-1"><span className="w-1 h-1 bg-[#DE9E48] rounded-full"></span> น้องแมว</label>
                  <div className="text-sm font-bold text-[#885E43] bg-orange-50/50 p-3 rounded-xl border border-orange-100/50"> {selectedBooking.cat_names}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#A1887F] uppercase flex items-center gap-1"><span className="w-1 h-1 bg-[#DE9E48] rounded-full"></span> ประเภทห้องพัก</label>
                <div className="flex items-center gap-2 text-sm font-black text-[#372C2E] bg-[#FDFBFA] p-3 rounded-xl border border-[#efebe9]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRoomColor(selectedBooking.room_type) }}></div>
                  {selectedBooking.room_type}
                </div>
              </div>

              {/* Editable Dates */}
              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#efebe9] space-y-4">
                <h4 className="text-xs font-black text-[#885E43] uppercase flex items-center gap-2"><CalendarIcon size={14} /> ช่วงเวลาเข้าพัก</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#A1887F]">วันที่เข้า</label>
                    <input type="date" className="w-full p-3 bg-white rounded-xl border-2 border-[#efebe9] text-sm font-bold focus:border-[#885E43] outline-none transition-all" value={selectedBooking.start_date} onChange={(e) => setSelectedBooking({ ...selectedBooking, start_date: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#A1887F]">วันที่ออก</label>
                    <input type="date" className="w-full p-3 bg-white rounded-xl border-2 border-[#efebe9] text-sm font-bold focus:border-[#885E43] outline-none transition-all" value={selectedBooking.end_date} onChange={(e) => setSelectedBooking({ ...selectedBooking, end_date: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Price & Deposit Summary */}
              <div className="bg-[#372C2E] rounded-[2rem] overflow-hidden shadow-xl shadow-[#372C2E]/10 border border-[#5D4037]">
                <div className="p-5 space-y-4">
                  {/* แถวราคารวม และ มัดจำ */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider">ราคารวม (คำนวณใหม่)</p>
                      <p className="text-xl font-black text-white">
                        ฿{calculateLivePrice(selectedBooking.start_date, selectedBooking.end_date, selectedBooking.room_type).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider">มัดจำแล้ว</p>
                      <p className="text-xl font-black text-[#DE9E48]">
                        - ฿{(selectedBooking.deposit || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* แถวยอดคงเหลือที่ต้องจ่าย */}
                  <div className="flex items-center justify-between bg-white/5 -mx-5 -mb-5 p-5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#DE9E48] rounded-lg">
                        <Wallet size={18} className="text-[#372C2E]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#A1887F] uppercase">ยอดคงเหลือที่ต้องชำระ</p>
                        <p className="text-xs text-white/50 font-medium">ชำระในวันเข้าพัก</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#DE9E48]">
                        ฿{(
                          calculateLivePrice(selectedBooking.start_date, selectedBooking.end_date, selectedBooking.room_type) -
                          (selectedBooking.deposit || 0)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={triggerDelete} disabled={isUpdating} className="flex-1 py-4 rounded-2xl bg-red-50 text-red-500 font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={18} /> ลบการจอง
                </button>
                <button onClick={handleUpdate} disabled={isUpdating} className="flex-[2] py-4 rounded-2xl bg-[#885E43] text-white font-black hover:bg-[#5D4037] shadow-lg shadow-[#885E43]/20 transition-all flex items-center justify-center gap-2">
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> บันทึกการเปลี่ยนแปลง</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Custom Modal Alert --- */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${alertConfig.type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                {alertConfig.type === 'danger' ? <AlertCircle size={44} /> : <CheckCircle2 size={44} />}
              </div>
              <h3 className="text-xl font-black text-[#372C2E] mb-2">{alertConfig.title}</h3>
              <p className="text-sm text-[#A1887F] font-medium leading-relaxed mb-8">{alertConfig.message}</p>

              <div className="flex gap-3">
                {alertConfig.type === 'danger' && (
                  <button onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-4 bg-gray-100 text-[#A1887F] rounded-2xl font-bold hover:bg-gray-200 transition-all">ยกเลิก</button>
                )}
                <button
                  onClick={alertConfig.onConfirm}
                  className={`flex-1 py-4 text-white rounded-2xl font-black shadow-lg transition-all ${alertConfig.type === 'danger' ? 'bg-red-500 shadow-red-200 hover:bg-red-600' : 'bg-[#885E43] shadow-orange-100 hover:bg-[#5D4037]'}`}
                >
                  {alertConfig.type === 'danger' ? 'ยืนยันลบทันที' : 'ตกลง'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

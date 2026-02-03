import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, Loader2, X, Trash2, LayoutDashboard, MousePointerClick, CalendarDays } from 'lucide-react';

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

  const ROOM_CONFIG = {
    'สแตนดาร์ด': { total: 7, color: '#C39A7A' },
    'ดีลักซ์': { total: 2, color: '#ad6ea8' },
    'ซูพีเรีย': { total: 4, color: '#eea5a5' },
    'พรีเมี่ยม': { total: 4, color: '#368daf' },
    'วีไอพี': { total: 2, color: '#30532d' },
    'วีวีไอพี': { total: 1, color: '#372C2E' }
  };

  const getRoomColor = (type) => ROOM_CONFIG[type]?.color || '#e05f5f';

  // ฟังก์ชันล้าง Popover ของ FullCalendar ทั้งหมด
  const closeAllFcPopovers = () => {
    document.querySelectorAll('.fc-popover').forEach(el => el.remove());
  };

  // --- แก้ไข: เมื่อเปิด Modal จัดการการจอง ให้ปิด Popover "+ more" ทันที ---
  useEffect(() => {
    if (isModalOpen) {
      closeAllFcPopovers();
    }
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
          title: `${b.cat_names}`,
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

  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const timer = setTimeout(() => calendarApi.updateSize(), 150);
      return () => clearTimeout(timer);
    }
  }, [events]);

  const roomStatusSummary = Object.keys(ROOM_CONFIG).map(type => {
    const used = events.filter(event => (
      event.extendedProps.room_type === type &&
      selectedDateStatus >= event.start &&
      selectedDateStatus < event.end
    )).length;
    return { type, used, total: ROOM_CONFIG[type].total, available: ROOM_CONFIG[type].total - used };
  });

  const handleDelete = async () => {
    if (!window.confirm(`ยืนยันการลบการจองของคุณ ${selectedBooking.customer_name}?`)) return;
    setIsUpdating(true);
    const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
    if (!error) { setIsModalOpen(false); fetchBookings(); }
    setIsUpdating(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const { error } = await supabase.from('bookings')
      .update({ 
        cat_names: selectedBooking.cat_names,
        start_date: selectedBooking.start_date,
        end_date: selectedBooking.end_date 
      })
      .eq('id', selectedBooking.id);
    
    if (!error) { setIsModalOpen(false); fetchBookings(); }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader2 className="animate-spin text-[#885E43]" size={40} />
    </div>
  );

  return (
    <div className="py-2 md:py-4 space-y-6 overflow-visible">
      
      {/* Dashboard Section */}
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

        <div id="status-dashboard" className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={18} className="text-[#885E43]" />
              <h3 className="text-sm font-bold text-[#372C2E]">
                สถานะห้องว่างวันที่: <span className="text-[#885E43]">{new Date(selectedDateStatus).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </h3>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-[#A1887F] font-bold bg-[#FDFBFA] px-3 py-1 rounded-full border border-[#efebe9]">
              <MousePointerClick size={12} />
              คลิก 1 ครั้ง: ดูสถานะ | คลิก 2 ครั้ง: จองที่พัก
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {roomStatusSummary.map(item => (
              <div key={item.type} className={`p-3 rounded-2xl border transition-all ${item.available <= 0 ? 'bg-red-50 border-red-100' : 'bg-[#FDFBFA] border-[#efebe9]'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoomColor(item.type) }}></div>
                  <span className="text-[10px] font-black text-[#885E43] uppercase truncate">{item.type}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-lg font-black ${item.available <= 0 ? 'text-red-500' : 'text-[#372C2E]'}`}>{item.available <= 0 ? 'เต็ม' : item.available}</span>
                  <span className="text-[10px] text-[#A1887F]">/ {item.total}</span>
                </div>
                <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${item.available <= 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${(item.used / item.total) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white p-2 md:p-6 rounded-[2.5rem] border border-[#DBD0C5] shadow-lg">
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
          
          // --- แก้ไข: เมื่อคลิกดู "+ more" ให้ปิด Modal แก้ไข (ถ้าเปิดอยู่) ---
          moreLinkClick={() => {
            setIsModalOpen(false);
            return 'popover'; 
          }}

          dateClick={(info) => {
            closeAllFcPopovers(); // คลิกที่ว่างในปฏิทิน ให้ปิด popover
            if (clickTimer.current) {
              clearTimeout(clickTimer.current);
              clickTimer.current = null;
              if (onDateClick) onDateClick(info.dateStr);
            } else {
              clickTimer.current = setTimeout(() => {
                setSelectedDateStatus(info.dateStr);
                document.getElementById('status-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                clickTimer.current = null;
              }, 250);
            }
          }}

          // --- แก้ไข: เมื่อคลิกชื่อแมว (Event) ให้เปิด Modal และ Popover จะถูกปิดโดย useEffect ข้างบน ---
          eventClick={(info) => {
            setSelectedBooking(info.event.extendedProps);
            setIsModalOpen(true);
          }}
        />
      </div>

      {/* Modal จัดการการจอง */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarDays size={20} className="text-[#DE9E48]" />
                <h3 className="text-xl font-bold">แก้ไขข้อมูลการจอง</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2">ชื่อเจ้าของ</label>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-500 font-bold">{selectedBooking.customer_name}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2">ชื่อน้องแมว</label>
                <input 
                  className="w-full p-4 bg-[#FDFBFA] rounded-2xl border border-[#efebe9] font-bold text-[#372C2E] outline-none focus:border-[#885E43]"
                  value={selectedBooking.cat_names}
                  onChange={(e) => setSelectedBooking({ ...selectedBooking, cat_names: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2">วันที่เข้าพัก</label>
                  <input 
                    type="date"
                    className="w-full p-3 bg-[#FDFBFA] rounded-xl border border-[#efebe9] text-sm font-bold"
                    value={selectedBooking.start_date}
                    onChange={(e) => setSelectedBooking({ ...selectedBooking, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase ml-2">วันที่ออก</label>
                  <input 
                    type="date"
                    className="w-full p-3 bg-[#FDFBFA] rounded-xl border border-[#efebe9] text-sm font-bold"
                    value={selectedBooking.end_date}
                    onChange={(e) => setSelectedBooking({ ...selectedBooking, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={handleDelete} disabled={isUpdating} className="py-4 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100 transition-all">ลบออก</button>
                <button onClick={handleUpdate} disabled={isUpdating} className="py-4 rounded-2xl bg-[#885E43] text-white font-bold hover:bg-[#5D4037] transition-all flex items-center justify-center">
                  {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, Loader2, X, Trash2, Cat, DoorOpen, LayoutDashboard } from 'lucide-react';

export default function CalendarView({ onDateClick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);
  const [selectedDateStatus, setSelectedDateStatus] = useState(new Date().toISOString().split('T')[0]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. กำหนดจำนวนห้องทั้งหมดแต่ละประเภท
  const ROOM_CONFIG = {
    'สแตนดาร์ด': { total: 7, color: '#C39A7A' },
    'ดีลักซ์': { total: 2, color: '#ad6ea8' },
    'ซูพีเรีย': { total: 4, color: '#eea5a5' },
    'พรีเมี่ยม': { total: 4, color: '#368daf' },
    'วีไอพี': { total: 2, color: '#30532d' },
    'วีวีไอพี': { total: 1, color: '#372C2E' }
  };

  const getRoomColor = (type) => ROOM_CONFIG[type]?.color || '#e05f5f';

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

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // 2. คำนวณสถานะห้องพักสำหรับวันที่เลือก
  const roomStatusSummary = Object.keys(ROOM_CONFIG).map(type => {
    const used = events.filter(event => {
      return (
        event.extendedProps.room_type === type &&
        selectedDateStatus >= event.start &&
        selectedDateStatus < event.end
      );
    }).length;
    
    const total = ROOM_CONFIG[type].total;
    const available = total - used;
    return { type, used, total, available };
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
    const { error } = await supabase.from('bookings').update({ cat_names: selectedBooking.cat_names }).eq('id', selectedBooking.id);
    if (!error) { setIsModalOpen(false); fetchBookings(); }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader2 className="animate-spin text-[#885E43]" size={40} />
    </div>
  );

  return (
    <div className="py-2 md:py-4 space-y-6">
      
      {/* Header & Dashboard */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg">
              <CalendarIcon size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#372C2E]">ตารางเข้าพัก</h2>
              <p className="text-sm text-[#A1887F]">จัดการข้อมูลโรงแรมแมว</p>
            </div>
          </div>
        </div>

        {/* แถบแสดงสถานะห้องพักแยกประเภท (สรุปรายวัน) */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#efebe9] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard size={18} className="text-[#885E43]" />
            <h3 className="text-sm font-bold text-[#372C2E]">
              สถานะห้องว่างประจำวันที่: <span className="text-[#885E43]">{new Date(selectedDateStatus).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {roomStatusSummary.map(item => (
              <div key={item.type} className={`p-3 rounded-2xl border transition-all ${item.available <= 0 ? 'bg-red-50 border-red-100' : 'bg-[#FDFBFA] border-[#efebe9]'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoomColor(item.type) }}></div>
                  <span className="text-[10px] font-black text-[#885E43] uppercase tracking-tighter truncate">{item.type}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-lg font-black ${item.available <= 0 ? 'text-red-500' : 'text-[#372C2E]'}`}>
                    {item.available <= 0 ? 'เต็ม' : item.available}
                  </span>
                  <span className="text-[10px] text-[#A1887F] font-bold">/ {item.total} ห้อง</span>
                </div>
                <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${item.available <= 0 ? 'bg-red-400' : 'bg-green-400'}`} 
                    style={{ width: `${(item.used / item.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ปฏิทิน */}
      <div className="bg-white p-2 md:p-6 rounded-[2.5rem] border border-[#DBD0C5] shadow-lg">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="th"
          events={events}
          eventDisplay="block"
          displayEventTime={false}
          selectable={true}
          dateClick={(info) => {
            setSelectedDateStatus(info.dateStr); // คลิกที่วันไหน ให้ Dashboard อัปเดตตาม
            // หากต้องการให้คลิกแล้วเปิดหน้าจองด้วย ให้คงบรรทัดล่างไว้
            // onDateClick(info.dateStr); 
          }}
          dayMaxEvents={2}
          moreLinkContent={(args) => `+ ${args.num}`}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          height="auto"
          eventClick={(info) => {
            document.querySelectorAll('.fc-popover').forEach(el => el.remove());
            setSelectedBooking(info.event.extendedProps);
            setIsModalOpen(true);
          }}
        />
        <p className="text-[10px] text-center mt-4 text-[#A1887F] font-medium">* คลิกที่วันที่ในปฏิทินเพื่อดูสถานะห้องว่างของวันนั้นๆ</p>
      </div>

      {/* Modal จัดการการจอง (ส่วนเดิม) */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">จัดการการจอง</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:opacity-70"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex flex-col gap-1 p-4 bg-[#FDFBFA] rounded-2xl border border-[#efebe9]">
                <span className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider">ชื่อเจ้าของ</span>
                <input className="font-bold text-[#372C2E] bg-transparent outline-none cursor-default" value={selectedBooking.customer_name} readOnly />
              </div>
              <div className="flex flex-col gap-1 p-4 bg-[#FDFBFA] rounded-2xl border border-[#efebe9]">
                <span className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider">ชื่อน้องแมว</span>
                <input className="font-bold text-[#372C2E] bg-transparent outline-none border-b border-[#885E43]/30 focus:border-[#885E43]"
                  value={selectedBooking.cat_names}
                  onChange={(e) => setSelectedBooking({ ...selectedBooking, cat_names: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button onClick={handleDelete} disabled={isUpdating} className="py-4 rounded-2xl bg-red-50 text-red-500 font-bold">ลบออก</button>
                <button onClick={handleUpdate} disabled={isUpdating} className="py-4 rounded-2xl bg-[#885E43] text-white font-bold">บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

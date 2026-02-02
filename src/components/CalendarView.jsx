import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, Loader2, X, Trash2, Save, User, Cat, DoorOpen } from 'lucide-react';

export default function CalendarView({ onDateClick }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const getRoomColor = (type) => {
    const colors = {
      'สแตนดาร์ด': '#C39A7A', 'ดีลักซ์': '#ad6ea8', 'ซูพีเรีย': '#eea5a5',
      'พรีเมี่ยม': '#368daf', 'วีไอพี': '#30532d', 'วีวีไอพี': '#372C2E'
    };
    return colors[type] || '#e05f5f';
  };

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (calendarRef.current) {
      setTimeout(() => {
        calendarRef.current.getApi().updateSize();
      }, 150);
    }
  }, [events]);

  const handleDelete = async () => {
    if (!window.confirm(`ยืนยันการลบการจองของคุณ ${selectedBooking.customer_name}?`)) return;
    setIsUpdating(true);
    const { error } = await supabase.from('bookings').delete().eq('id', selectedBooking.id);
    if (!error) {
      setIsModalOpen(false);
      fetchBookings();
    }
    setIsUpdating(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const { error } = await supabase.from('bookings')
      .update({ cat_names: selectedBooking.cat_names })
      .eq('id', selectedBooking.id);
    if (!error) {
      setIsModalOpen(false);
      fetchBookings();
    }
    setIsUpdating(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader2 className="animate-spin text-[#885E43]" size={40} />
    </div>
  );

  return (
    <div className="py-2 md:py-4 overflow-visible">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3.5 rounded-2xl text-[#DE9E48] shadow-xl border border-[#5D4037]">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#372C2E]">ตารางการเข้าพัก</h2>
            <p className="text-sm text-[#A1887F]">โรงแรมแมวจริงใจ</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.keys({ 'สแตนดาร์ด': 1, 'ดีลักซ์': 1, 'ซูพีเรีย': 1, 'พรีเมี่ยม': 1, 'วีไอพี': 1, 'วีวีไอพี': 1 }).map(type => (
            <div key={type} className="flex items-center gap-2 bg-white border border-[#DBD0C5] px-3 py-1.5 rounded-xl">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRoomColor(type) }}></div>
              <span className="text-[10px] font-extrabold text-[#5D4037] uppercase">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-2 md:p-6 rounded-[2.5rem] border border-[#DBD0C5] shadow-lg overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="th"
          events={events}
          eventDisplay="block"
          displayEventTime={false}
          dayMaxEvents={2}
          moreLinkContent={(args) => `+ ดูอีก ${args.num} ตัว`}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          height="auto"
          stickyHeaderDates={true}
          handleWindowResize={true}
          eventClick={(info) => {
            // --- แก้ไข: ปิด Popover ทันทีด้วยการสั่ง Click ปุ่ม Close ของมันเอง ---
            const closeBtn = document.querySelector('.fc-popover-close');
            if (closeBtn) {
              closeBtn.click();
            } else {
              // กรณีหาปุ่มไม่เจอ ให้บังคับลบ Element ทิ้ง
              document.querySelectorAll('.fc-popover').forEach(el => el.remove());
            }

            setSelectedBooking(info.event.extendedProps);
            setIsModalOpen(true);
          }}
        />
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">จัดการการจอง</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:opacity-70">
                <X size={24} />
              </button>
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
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="py-4 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '...' : 'ลบออก'}
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="py-4 rounded-2xl bg-[#885E43] text-white font-bold hover:bg-[#5d4037] shadow-lg shadow-[#885E43]/20 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
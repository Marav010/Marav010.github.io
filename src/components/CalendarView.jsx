import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon, Loader2, X, LayoutDashboard,
  MousePointerClick, CalendarDays, BadgeCheck, Wallet, Receipt, Clock
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

  const ROOM_CONFIG = {
    'สแตนดาร์ด': { total: 7, color: '#C39A7A', price: 300 },
    'ดีลักซ์': { total: 2, color: '#ad6ea8', price: 350 },
    'ซูพีเรีย': { total: 4, color: '#eea5a5', price: 350 },
    'พรีเมี่ยม': { total: 4, color: '#368daf', price: 400 },
    'วีไอพี': { total: 2, color: '#30532d', price: 500 },
    'วีวีไอพี': { total: 1, color: '#372C2E', price: 600 }
  };

  const getRoomColor = (type) => ROOM_CONFIG[type]?.color || '#e05f5f';

  const formatThaiDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
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

  const closeAllFcPopovers = () => {
    document.querySelectorAll('.fc-popover').forEach(el => el.remove());
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[400px]">
      <Loader2 className="animate-spin text-[#885E43]" size={40} />
    </div>
  );

  return (
    <div className="py-2 md:py-4 space-y-6 overflow-visible font-sans">

      {/* Dashboard Section - Updated Version */}
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
                สถานะห้องว่างวันที่: <span className="text-[#885E43]">{formatThaiDate(selectedDateStatus)}</span>
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
                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${item.available <= 0 ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${(item.used / item.total) * 100}%` }}></div>
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

      {/* Modal - View Only Mode */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl transform animate-in zoom-in-95 duration-200 border border-[#efebe9]">

            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarDays size={100} /></div>
              <h3 className="text-xl font-black flex items-center gap-2 z-10">
                <CalendarDays size={20} className="text-[#DE9E48]" /> รายละเอียดการจอง
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="z-10 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider">เจ้าของ</label>
                  <div className="text-sm font-bold text-[#372C2E] bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedBooking.customer_name}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider">น้องแมว</label>
                  <div className="text-sm font-bold text-[#885E43] bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">{selectedBooking.cat_names}</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-[#A1887F] uppercase tracking-wider">ประเภทห้องพัก</label>
                <div className="flex items-center gap-2 text-sm font-black text-[#372C2E] bg-[#FDFBFA] p-3 rounded-xl border border-[#efebe9]">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRoomColor(selectedBooking.room_type) }}></div>
                  {selectedBooking.room_type}
                </div>
              </div>

              <div className="bg-[#FDF8F5] p-5 rounded-2xl border border-[#efebe9] space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-[#885E43] uppercase"><Clock size={14} /> ระยะเวลาเข้าพัก</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-[#efebe9]">
                    <p className="text-[10px] font-bold text-[#A1887F] mb-1">เช็คอิน</p>
                    <p className="text-sm font-bold text-[#372C2E]">{formatThaiDate(selectedBooking.start_date)}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#efebe9]">
                    <p className="text-[10px] font-bold text-[#A1887F] mb-1">เช็คเอาท์</p>
                    <p className="text-sm font-bold text-[#372C2E]">{formatThaiDate(selectedBooking.end_date)}</p>
                  </div>
                </div>
              </div>

              {/* Price & Deposit Summary Section */}
              <div className="bg-[#372C2E] rounded-[2rem] overflow-hidden border border-[#5D4037]">
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-[#A1887F] uppercase tracking-wider">ยอดรวมทั้งสิ้น</p>
                      <p className="text-xl font-black text-white">฿{(selectedBooking.total_price || 0).toLocaleString()}</p>
                    </div>

                    {/* ส่วนเงื่อนไขมัดจำ */}
                    <div className="text-right space-y-0.5">
                      {selectedBooking.deposit > 0 ? (
                        <>
                          <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">มัดจำแล้ว</p>
                          <p className="text-xl font-black text-[#DE9E48]">- ฿{selectedBooking.deposit.toLocaleString()}</p>
                        </>
                      ) : (
                        <div className="py-1 px-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">ยังไม่ได้มัดจำ</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* แถวยอดคงเหลือที่ต้องจ่ายหน้างาน */}
                  <div className="flex items-center justify-between bg-white/5 -mx-5 -mb-5 p-5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[#DE9E48] rounded-lg text-[#372C2E]"><Wallet size={18} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-[#A1887F] uppercase">ยอดชำระทั้งหมด</p>
                        <p className="text-xs text-white/50">
                          {selectedBooking.deposit > 0 ? "ชำระในวันเข้าพักอีก" : "ยอดชำระทั้งหมด"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#DE9E48]">
                        ฿{((selectedBooking.total_price || 0) - (selectedBooking.deposit || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="w-full py-4 rounded-2xl bg-gray-100 text-[#372C2E] font-black hover:bg-gray-200 transition-all">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

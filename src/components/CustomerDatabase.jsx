import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, Hash, 
  History, Camera, FileText, Search, 
  ChevronLeft, ChevronRight, Award 
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // --- Logic สรุปข้อมูลรายลูกค้า ---
  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name: name,
          phone: b.phone || '-', // สมมติว่ามีฟิลด์ phone
          source: b.source || 'Line', // สมมติว่ามีฟิลด์ source (Line/FB)
          stayCount: 0,
          totalCats: 0,
          totalSpent: 0,
          lastRoom: b.room_type,
          lastNights: 0,
          cameraId: b.camera_id || '-', // ฟิลด์ไอดีกล้อง
          note: b.note || '-',
          history: []
        };
      }

      // คำนวณจำนวนคืน
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const nights = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      acc[name].history.push({
        date: b.start_date,
        room: b.room_type,
        price: b.total_price
      });
      
      return acc;
    }, {});

    return Object.values(stats);
  }, [bookings]);

  // ค้นหา
  const filteredCustomers = customerStats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  // แบ่งหน้า
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const currentData = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-20 text-center text-[#885E43] animate-pulse font-bold">กำลังโหลดฐานข้อมูลลูกค้า...</div>;

  return (
    <div className="space-y-6 py-6 animate-in fade-in duration-500 font-sans">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-[#372C2E] flex items-center gap-3">
            <User className="text-[#DE9E48]" size={32} /> ฐานข้อมูลลูกค้า
          </h2>
          <p className="text-[#A1887F] text-sm font-bold mt-1">วิเคราะห์พฤติกรรมและประวัติการเข้าพักของน้องแมว</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 text-[#A1887F]" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อลูกค้า หรือเบอร์โทร..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#efebe9] rounded-2xl shadow-sm outline-none focus:border-[#885E43] font-bold text-[#372C2E]"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-6 border border-[#efebe9] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            
            {/* ตราสัญลักษณ์ลูกค้าประจำ */}
            {customer.stayCount > 3 && (
              <div className="absolute -right-8 -top-8 bg-[#DE9E48] p-10 rotate-45 text-white flex items-end justify-center">
                <Award size={20} className="-rotate-45 mb-1" />
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#FDF8F5] rounded-2xl flex items-center justify-center text-[#885E43] border border-[#efebe9]">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#372C2E]">{customer.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      <Phone size={10} /> {customer.phone}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${customer.source === 'Line' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      <MessageCircle size={10} /> {customer.source}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-[#A1887F] uppercase tracking-widest">ยอดรวมสะสม</div>
                <div className="text-xl font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-b border-[#FDFBFA] py-4 my-4">
              <div className="text-center border-r border-[#FDFBFA]">
                <div className="text-[9px] font-bold text-[#A1887F] uppercase mb-1">เข้าพัก</div>
                <div className="text-md font-black text-[#372C2E] flex items-center justify-center gap-1">
                  <History size={14} className="text-[#DE9E48]" /> {customer.stayCount} ครั้ง
                </div>
              </div>
              <div className="text-center border-r border-[#FDFBFA]">
                <div className="text-[9px] font-bold text-[#A1887F] uppercase mb-1">ห้องล่าสุด</div>
                <div className="text-xs font-black text-[#885E43] truncate px-1">{customer.lastRoom}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-bold text-[#A1887F] uppercase mb-1">ไอดีกล้อง</div>
                <div className="text-md font-black text-[#372C2E] flex items-center justify-center gap-1">
                  <Camera size={14} className="text-[#885E43]" /> {customer.cameraId}
                </div>
              </div>
            </div>

            <div className="bg-[#FDF8F5] p-4 rounded-2xl">
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-[#DE9E48] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#885E43] italic leading-relaxed">
                  <span className="font-bold not-italic">หมายเหตุ:</span> {customer.note}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-3 bg-white border border-[#efebe9] rounded-2xl text-[#885E43] disabled:opacity-30 shadow-sm"
            disabled={currentPage === 1}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-[#372C2E] mx-4">หน้า {currentPage} จาก {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-3 bg-white border border-[#efebe9] rounded-2xl text-[#885E43] disabled:opacity-30 shadow-sm"
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {filteredCustomers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-[#efebe9]">
          <User size={48} className="mx-auto text-[#DBD0C5] mb-4" />
          <p className="text-[#A1887F] font-bold">ไม่พบข้อมูลลูกค้าในระบบ</p>
        </div>
      )}
    </div>
  );
}

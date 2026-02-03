import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, History, Camera, 
  FileText, Search, ChevronLeft, ChevronRight, 
  Award, Edit3, Trash2, X, Check, Plus, Cat
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // State สำหรับการแก้ไข
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  // --- สรุปข้อมูลรายลูกค้า ---
  const customerStats = useMemo(() => {
    const stats = bookings.reduce((acc, b) => {
      const name = b.customer_name || 'ไม่ระบุชื่อ';
      if (!acc[name]) {
        acc[name] = {
          name: name,
          phone: b.phone || '-',
          source: b.source || 'Line',
          stayCount: 0,
          totalSpent: 0,
          cameraId: b.camera_id || '-',
          note: b.note || '-',
          image: b.customer_image || '',
          catNames: new Set(), // ใช้ Set กันชื่อแมวซ้ำ
          lastRoom: b.room_type,
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
      return acc;
    }, {});
    return Object.values(stats).map(item => ({ ...item, catNames: Array.from(item.catNames).join(', ') }));
  }, [bookings]);

  // ฟังก์ชันลบ (ลบทุก Booking ของลูกค้านี้)
  const handleDeleteCustomer = async (name) => {
    if (!confirm(`ยืนยันการลบข้อมูลทั้งหมดของตัวคุณ ${name}? (ประวัติการจองทั้งหมดจะถูกลบ)`)) return;
    const { error } = await supabase.from('bookings').delete().eq('customer_name', name);
    if (!error) fetchData();
  };

  // ฟังก์ชันอัปเดต
  const handleUpdateCustomer = async () => {
    const { error } = await supabase.from('bookings')
      .update({ 
        phone: editingCustomer.phone,
        source: editingCustomer.source,
        camera_id: editingCustomer.cameraId,
        note: editingCustomer.note,
        customer_image: editingCustomer.image
      })
      .eq('customer_name', editingCustomer.name);

    if (!error) {
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  const filtered = customerStats.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-20 text-center font-bold text-[#885E43]">กำลังโหลด...</div>;

  return (
    <div className="space-y-6 py-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#372C2E] flex items-center gap-3">
            <User className="text-[#DE9E48]" size={32} /> ฐานข้อมูลลูกค้า
          </h2>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3.5 text-[#A1887F]" size={20} />
          <input 
            type="text" placeholder="ค้นหาชื่อ หรือเบอร์โทร..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-[#efebe9] rounded-2xl outline-none focus:border-[#885E43] font-bold"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentData.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-6 border border-[#efebe9] shadow-sm relative group overflow-hidden">
            
            <div className="flex gap-5">
              {/* รูปภาพลูกค้า */}
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-[#FDF8F5] shadow-inner bg-[#FDF8F5] flex items-center justify-center">
                  {customer.image ? (
                    <img src={customer.image} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} className="text-[#DBD0C5]" />
                  )}
                </div>
                {customer.stayCount > 3 && <div className="absolute -top-2 -right-2 bg-[#DE9E48] p-1.5 rounded-full text-white shadow-lg"><Award size={14}/></div>}
              </div>

              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="text-xl font-black text-[#372C2E]">{customer.name}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCustomer(customer); setIsEditModalOpen(true); }} className="p-2 text-[#885E43] hover:bg-[#FDF8F5] rounded-xl"><Edit3 size={16}/></button>
                    <button onClick={() => handleDeleteCustomer(customer.name)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-lg flex items-center gap-1"><Phone size={10}/> {customer.phone}</span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg flex items-center gap-1"><MessageCircle size={10}/> {customer.source}</span>
                </div>

                {/* ชื่อแมว */}
                <div className="mt-3 flex items-start gap-2 bg-[#FDF8F5] p-2 rounded-xl border border-[#efebe9]/50">
                  <Cat size={14} className="text-[#DE9E48] mt-0.5" />
                  <span className="text-xs font-bold text-[#885E43]">
                    <span className="text-[#A1887F]">แมวในปกครอง: </span>{customer.catNames || 'ไม่มีข้อมูล'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#FDFBFA]">
              <div className="text-center">
                <p className="text-[9px] font-bold text-[#A1887F] uppercase">เข้าพักทั้งหมด</p>
                <p className="text-sm font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p>
              </div>
              <div className="text-center border-x border-[#FDFBFA]">
                <p className="text-[9px] font-bold text-[#A1887F] uppercase">ยอดสะสม</p>
                <p className="text-sm font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</p>
                <p className="text-sm font-black text-[#372C2E]">{customer.cameraId}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#372C2E] p-6 text-white flex justify-between items-center">
              <h3 className="font-bold">แก้ไขข้อมูลคุณ {editingCustomer.name}</h3>
              <button onClick={() => setIsEditModalOpen(false)}><X/></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#A1887F] uppercase">URL รูปภาพลูกค้า</label>
                <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl outline-none focus:border-[#885E43]" 
                  value={editingCustomer.image} onChange={e => setEditingCustomer({...editingCustomer, image: e.target.value})} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase">เบอร์โทร</label>
                  <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</label>
                  <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#A1887F] uppercase">หมายเหตุ</label>
                <textarea className="w-full p-3 bg-[#FDFBFA] border rounded-xl h-20" value={editingCustomer.note} onChange={e => setEditingCustomer({...editingCustomer, note: e.target.value})} />
              </div>
              <button onClick={handleUpdateCustomer} className="w-full py-4 bg-[#885E43] text-white rounded-2xl font-bold shadow-lg shadow-[#885E43]/20">บันทึกการเปลี่ยนแปลง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


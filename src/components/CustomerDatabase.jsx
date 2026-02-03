import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, Phone, MessageCircle, History, Camera, 
  FileText, Search, ChevronLeft, ChevronRight, 
  Award, Edit3, Trash2, X, Plus, Cat, Save
} from 'lucide-react';

export default function CustomerDatabase() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // States สำหรับ Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' หรือ 'edit'
  const [editingCustomer, setEditingCustomer] = useState({
    name: '', phone: '', source: 'Line', cameraId: '-', note: '-', image: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

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
          catNames: new Set(),
        };
      }
      acc[name].stayCount += 1;
      acc[name].totalSpent += (b.total_price || 0);
      if (b.cat_names) b.cat_names.split(',').forEach(n => acc[name].catNames.add(n.trim()));
      return acc;
    }, {});
    return Object.values(stats).map(item => ({ ...item, catNames: Array.from(item.catNames).join(', ') }));
  }, [bookings]);

  // ฟังก์ชันลบ
  const handleDelete = async (name) => {
    if (!confirm(`ยืนยันการลบข้อมูลคุณ ${name}? ประวัติการจองทั้งหมดจะหายไป`)) return;
    const { error } = await supabase.from('bookings').delete().eq('customer_name', name);
    if (!error) fetchData();
  };

  // ฟังก์ชันบันทึก (ทั้งเพิ่มและแก้ไข)
  const handleSave = async () => {
    if (!editingCustomer.name) return alert('กรุณาระบุชื่อลูกค้า');
    
    const payload = {
      customer_name: editingCustomer.name,
      phone: editingCustomer.phone,
      source: editingCustomer.source,
      camera_id: editingCustomer.cameraId,
      note: editingCustomer.note,
      customer_image: editingCustomer.image
    };

    let error;
    if (modalMode === 'edit') {
      const { error: err } = await supabase.from('bookings').update(payload).eq('customer_name', editingCustomer.name);
      error = err;
    } else {
      // สำหรับการเพิ่มใหม่ (จำลองการสร้าง Booking เปล่าๆ เพื่อเก็บประวัติลูกค้า)
      const { error: err } = await supabase.from('bookings').insert([{ 
        ...payload, 
        cat_names: 'ยังไม่มีข้อมูลแมว',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        room_type: 'สแตนดาร์ด'
      }]);
      error = err;
    }

    if (!error) {
      setIsModalOpen(false);
      fetchData();
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const filtered = customerStats.filter(c => c.name.includes(searchTerm) || c.phone.includes(searchTerm));
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="p-20 text-center font-bold text-[#885E43]">กำลังโหลด...</div>;

  return (
    <div className="space-y-6 py-4">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48] shadow-lg">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#372C2E]">ฐานข้อมูลลูกค้า</h2>
            <p className="text-xs text-[#A1887F] font-bold">จัดการประวัติและข้อมูลติดต่อ</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-3 text-[#A1887F]" size={18} />
            <input 
              type="text" placeholder="ค้นหาชื่อ/เบอร์..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#efebe9] rounded-xl outline-none focus:border-[#885E43] font-bold text-sm"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setModalMode('add'); setEditingCustomer({ name: '', phone: '', source: 'Line', cameraId: '-', note: '-', image: '' }); setIsModalOpen(true); }}
            className="bg-[#885E43] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5D4037] shadow-lg shadow-[#885E43]/20 transition-all text-sm whitespace-nowrap"
          >
            <Plus size={18} /> <span className="hidden sm:inline">เพิ่มลูกค้า</span>
          </button>
        </div>
      </div>

      {/* Grid ของการ์ดลูกค้า */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentData.map((customer, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] p-5 border border-[#efebe9] shadow-sm hover:shadow-md transition-all relative overflow-hidden">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#FDF8F5] flex-shrink-0 border border-[#efebe9]">
                {customer.image ? (
                  <img src={customer.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#DBD0C5]"><User size={32}/></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-[#372C2E] truncate pr-2">{customer.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCustomer(customer); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => handleDelete(customer.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[9px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md border border-[#efebe9] flex items-center gap-1"><Phone size={10}/>{customer.phone}</span>
                  <span className="text-[9px] font-bold bg-[#FDF8F5] text-[#885E43] px-2 py-0.5 rounded-md border border-[#efebe9] flex items-center gap-1"><MessageCircle size={10}/>{customer.source}</span>
                </div>
                <div className="mt-2 text-[10px] text-[#A1887F] font-bold flex items-center gap-1 truncate italic">
                  <Cat size={12} className="text-[#DE9E48]" /> {customer.catNames || 'ไม่มีข้อมูลแมว'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#FDFBFA] text-center">
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">ยอดสะสม</p><p className="text-xs font-black text-[#885E43]">฿{customer.totalSpent.toLocaleString()}</p></div>
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">เข้าพัก</p><p className="text-xs font-black text-[#372C2E]">{customer.stayCount} ครั้ง</p></div>
               <div><p className="text-[8px] font-bold text-[#A1887F] uppercase">ไอดีกล้อง</p><p className="text-xs font-black text-[#372C2E]">{customer.cameraId}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไข (ตัวเดียวใช้คุ้ม) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="bg-[#372C2E] p-5 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                {modalMode === 'edit' ? <Edit3 size={18}/> : <Plus size={18}/>}
                {modalMode === 'edit' ? `แก้ไขข้อมูล: ${editingCustomer.name}` : 'เพิ่มลูกค้าใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#A1887F] uppercase block mb-1">ชื่อลูกค้า (ใช้เป็นรหัสหลัก)</label>
                <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl font-bold" disabled={modalMode === 'edit'}
                  value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase block mb-1">เบอร์โทร</label>
                  <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.phone} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#A1887F] uppercase block mb-1">ติดต่อทาง</label>
                  <select className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.source} onChange={e => setEditingCustomer({...editingCustomer, source: e.target.value})}>
                    <option value="Line">Line</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok / อื่นๆ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#A1887F] uppercase block mb-1">ไอดีกล้อง / หมายเหตุ</label>
                <input className="w-full p-3 bg-[#FDFBFA] border rounded-xl" value={editingCustomer.cameraId} onChange={e => setEditingCustomer({...editingCustomer, cameraId: e.target.value})} placeholder="Camera ID..." />
              </div>
              <button onClick={handleSave} className="w-full py-4 bg-[#885E43] text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Save size={18}/> บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

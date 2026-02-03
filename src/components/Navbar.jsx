import { Calendar, PlusCircle, History, BarChart3, LogOut, Users } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onLogout }) {
  const menus = [
    { id: 'calendar', label: 'ปฏิทินการจอง', icon: <Calendar size={18} /> },
    { id: 'booking', label: 'จองห้องพัก', icon: <PlusCircle size={18} /> },
    { id: 'history', label: 'ประวัติการจอง', icon: <History size={18} /> },
    { id: 'customers', label: 'ข้อมูลลูกค้า', icon: <Users size={18} /> },
    { id: 'report', label: 'รายงานสรุป', icon: <BarChart3 size={18} /> },
  ];

  return (
    <nav className="bg-[#FDFBFA] border-b border-[#DBD0C5] sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
        <div className="flex items-center gap-8">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#DBD0C5] bg-white shadow-sm flex items-center justify-center">
              <img 
                src="/Logo/JingJai-Cat-Hotel-final1.jpg" 
                alt="JingjaiCatHotel" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-black tracking-tight hidden lg:block uppercase text-[#372C2E]">
              โรงแรมแมวจริงใจ
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {menus.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 ${
                  activeTab === m.id
                    ? 'bg-[#885E43] text-white shadow-lg shadow-[#885E43]/20' 
                    : 'text-[#A1887F] hover:bg-[#F5F2F0] hover:text-[#372C2E]'
                }`}
              >
                <span className={activeTab === m.id ? 'text-[#DE9E48]' : ''}>
                  {m.icon}
                </span>
                <span className="hidden md:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 text-[#A1887F] hover:text-[#b71c1c] hover:bg-red-50 rounded-full transition-all active:scale-90"
          title="ออกจากระบบ"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}

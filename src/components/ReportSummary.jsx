import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Banknote, CalendarDays, Download, Loader2, Award, BarChart3, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportSummary() {
  const reportRef = useRef();
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    yearlyRevenue: 0,
    yearlyBookings: 0,
    roomStats: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // ใช้ "all" สำหรับเลือกทุกเดือน
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());   // ใช้ "all" สำหรับเลือกทุกปี

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // รายการปีให้เลือก (สามารถเพิ่มปีที่ต้องการได้)
  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    setLoading(true);
    const { data: bookings, error } = await supabase.from('bookings').select('*');
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // --- กรองข้อมูล ---
    const filteredBookings = bookings?.filter(b => {
      const bDate = new Date(b.start_date);
      const bMonth = bDate.getMonth() + 1;
      const bYear = bDate.getFullYear();

      const monthMatch = selectedMonth === "all" || bMonth === parseInt(selectedMonth);
      const yearMatch = selectedYear === "all" || bYear === parseInt(selectedYear);

      return monthMatch && yearMatch;
    }) || [];

    // --- สรุปรายได้และจำนวนครั้ง ---
    const totalRev = filteredBookings.reduce((acc, cur) => acc + (cur.total_price || 0), 0);
    
    const statsMap = filteredBookings.reduce((acc, cur) => {
      if (!acc[cur.room_type]) acc[cur.room_type] = { count: 0, revenue: 0 };
      acc[cur.room_type].count += 1;
      acc[cur.room_type].revenue += (cur.total_price || 0);
      return acc;
    }, {});

    const formattedStats = Object.entries(statsMap).map(([name, data]) => ({
      name, ...data
    })).sort((a, b) => b.revenue - a.revenue);

    // คำนวณรายได้ปีปัจจุบัน (เพื่อใช้เทียบสัดส่วน)
    const yearlyBookings = bookings?.filter(b => new Date(b.start_date).getFullYear() === now.getFullYear()) || [];
    const totalYearlyRev = yearlyBookings.reduce((acc, cur) => acc + (cur.total_price || 0), 0);

    setReportData({
      totalRevenue: totalRev,
      totalBookings: filteredBookings.length,
      yearlyRevenue: totalYearlyRev,
      yearlyBookings: yearlyBookings.length,
      roomStats: formattedStats
    });
    setLoading(false);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const fileName = `Report-${selectedMonth === "all" ? "ทุกเดือน" : months[selectedMonth-1]}-${selectedYear === "all" ? "ทุกปี" : selectedYear}`;
    pdf.save(`${fileName}.pdf`);
    setIsExporting(false);
  };

  // ข้อความแสดงชื่อช่วงเวลา
  const getPeriodText = () => {
    if (selectedMonth === "all" && selectedYear === "all") return "ทั้งหมดทุกปี";
    if (selectedMonth === "all") return `ทุกเดือนในปี ${selectedYear}`;
    if (selectedYear === "all") return `เดือน ${months[selectedMonth-1]} (ทุกปี)`;
    return `${months[selectedMonth-1]} ${selectedYear}`;
  };

  return (
    <div className="py-4 space-y-6 animate-in fade-in duration-700">
      {/* --- Control Panel --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-[#efebe9] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#372C2E] p-3 rounded-2xl text-[#DE9E48]"><TrendingUp size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-[#372C2E]">วิเคราะห์ข้อมูล</h2>
            <p className="text-xs text-[#a1887f] font-bold uppercase tracking-wider">{getPeriodText()}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FDFBFA] p-1.5 rounded-xl border border-[#efebe9]">
            {/* เลือกเดือน */}
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#372C2E] outline-none px-2 py-1"
            >
              <option value="all">ทุกเดือน</option>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            {/* เลือกปี */}
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#372C2E] outline-none px-2 py-1 border-l border-[#efebe9]"
            >
              <option value="all">ทุกปี</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={exportPDF}
            disabled={isExporting || reportData.totalBookings === 0}
            className="flex items-center gap-2 bg-[#885E43] hover:bg-[#5D4037] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18}/> : <Download size={18}/>}
            ส่งออก PDF
          </button>
        </div>
      </div>

      {/* --- Report Content --- */}
      <div ref={reportRef} className="bg-white p-8 rounded-[3rem] shadow-sm border border-[#efebe9] space-y-8">
        
        <div className="flex justify-between items-end border-b-2 border-[#372C2E] pb-6 mb-4">
          <div>
            <h1 className="text-3xl font-black text-[#372C2E]">JINGJAI CAT HOTEL</h1>
            <p className="text-[#885E43] font-bold underline underline-offset-4 decoration-2">สรุปรายงาน: {getPeriodText()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#A1887F] font-bold uppercase tracking-widest">วันที่ออกเอกสาร</p>
            <p className="text-sm font-bold text-[#372C2E]">{now.toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#A1887F]"><Loader2 className="animate-spin mb-4" size={40} /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#372C2E] p-6 rounded-[2rem] text-white shadow-xl shadow-[#372C2E]/10">
                <div className="flex items-center gap-2 mb-4 opacity-60"><Banknote size={16}/> <span className="text-[10px] font-bold uppercase tracking-tighter">ยอดรวมรายได้ที่เลือก</span></div>
                <h3 className="text-3xl font-black text-[#DE9E48]">฿{reportData.totalRevenue.toLocaleString()}</h3>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-[8px] opacity-60 uppercase">Average / Booking</span>
                  <span className="text-xs font-bold text-white/80">฿{reportData.totalBookings > 0 ? (reportData.totalRevenue / reportData.totalBookings).toLocaleString(undefined, {maximumFractionDigits:0}) : 0}</span>
                </div>
              </div>

              <div className="bg-[#FDFBFA] p-6 rounded-[2rem] border border-[#efebe9]">
                <div className="flex items-center gap-2 mb-4 text-[#A1887F]"><CalendarDays size={16}/> <span className="text-[10px] font-bold uppercase">จำนวนการจองรวม</span></div>
                <h3 className="text-3xl font-black text-[#372C2E]">{reportData.totalBookings} <span className="text-sm font-normal text-[#A1887F]">ครั้ง</span></h3>
                <div className="mt-4 pt-4 border-t border-[#efebe9] flex justify-between items-center text-[#A1887F] text-[10px] font-bold">
                  <span>ข้อมูลอ้างอิงจาก Database</span>
                </div>
              </div>

              <div className="bg-[#885E43]/5 p-6 rounded-[2rem] border border-[#885E43]/10">
                <div className="flex items-center gap-2 mb-4 text-[#885E43]"><Award size={16}/> <span className="text-[10px] font-bold uppercase">ประเภทห้องอันดับ 1</span></div>
                <h3 className="text-xl font-black text-[#885E43] truncate">{reportData.roomStats[0]?.name || '-'}</h3>
                <p className="text-xs font-bold text-[#A1887F] mt-1">สร้างรายได้ ฿{reportData.roomStats[0]?.revenue.toLocaleString() || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#372C2E] font-black"><BarChart3 size={20}/> รายได้ตามประเภทห้อง</div>
                <div className="space-y-5">
                  {reportData.roomStats.map((room) => (
                    <div key={room.name}>
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-[#372C2E]">{room.name}</span>
                        <span className="text-[#885E43]">฿{room.revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-[#F5F2F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#885E43] rounded-full" style={{ width: `${reportData.totalRevenue > 0 ? (room.revenue / reportData.totalRevenue) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {reportData.roomStats.length === 0 && <div className="text-center py-10 text-[#A1887F]">ไม่มีข้อมูลในช่วงที่เลือก</div>}
                </div>
              </div>

              <div className="bg-[#372C2E] rounded-[2.5rem] p-8 text-white flex flex-col justify-center relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <h4 className="text-[#DE9E48] font-black text-xl">บทวิเคราะห์</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-[#DE9E48] rounded-full flex items-center justify-center shrink-0 mt-0.5"><ChevronRight size={12} className="text-[#372C2E]"/></div>
                      <p className="text-sm opacity-80">ช่วงเวลาที่เลือกมีลูกค้าเข้าพักทั้งหมด <span className="font-bold text-white">{reportData.totalBookings} ครั้ง</span></p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-[#DE9E48] rounded-full flex items-center justify-center shrink-0 mt-0.5"><ChevronRight size={12} className="text-[#372C2E]"/></div>
                      <p className="text-sm opacity-80">รายได้เฉลี่ยต่อการจองคือ <span className="font-bold text-white">฿{reportData.totalBookings > 0 ? (reportData.totalRevenue / reportData.totalBookings).toLocaleString(undefined, {maximumFractionDigits:0}) : 0}</span></p>
                    </li>
                  </ul>
                </div>
                <TrendingUp size={200} className="absolute -bottom-10 -right-10 opacity-5" />
              </div>
            </div>

            <div className="pt-10 flex justify-between items-center text-[10px] text-[#A1887F] border-t border-[#efebe9] font-bold uppercase tracking-tighter">
             <span>รายงานนี้ถูกสร้างโดยระบบอัตโนมัติ - Jingjai Cat Hotel Management System</span>
              <span>หน้า 1 จาก 1</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

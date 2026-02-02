import { useEffect, useState, useRef } from 'react'; // เพิ่ม useRef
import { supabase } from '../lib/supabase';
import { TrendingUp, PieChart, Banknote, CalendarCheck, CalendarDays, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ReportSummary() {
  const reportRef = useRef(); // สร้าง Ref สำหรับจับภาพหน้าจอ
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    roomStats: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false); // State สำหรับตอนกำลังสร้าง PDF

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    setLoading(true);
    const { data: bookings } = await supabase.from('bookings').select('*');
    const filteredBookings = bookings?.filter(b => {
      const bookingDate = new Date(b.start_date);
      return (bookingDate.getMonth() + 1 === selectedMonth) && (bookingDate.getFullYear() === selectedYear);
    }) || [];

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

    setReportData({
      totalRevenue: totalRev,
      totalBookings: filteredBookings.length,
      roomStats: formattedStats
    });
    setLoading(false);
  };

  // --- ฟังก์ชันการส่งออก PDF ---
  const exportPDF = async () => {
    setIsExporting(true);
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Report-JingjaiCatHotel-${months[selectedMonth-1]}-${selectedYear}.pdf`);
    setIsExporting(false);
  };

  return (
    <div className="py-4 space-y-8 animate-in fade-in duration-700">
      {/* ส่วนหัวและตัวเลือก (ไม่ต้อง export ส่วนนี้) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-[#885E43] p-3 rounded-2xl text-white shadow-lg shadow-[#885E43]/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#372C2E] tracking-tight">รายงานวิเคราะห์ธุรกิจ</h2>
            <p className="text-sm text-[#a1887f]">สรุปรายได้ประจำเดือน {months[selectedMonth-1]} {selectedYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {/* ปุ่ม Download PDF */}
            <button 
                onClick={exportPDF}
                disabled={isExporting || reportData.totalBookings === 0}
                className="flex items-center gap-2 bg-[#372C2E] hover:bg-[#5D4037] text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#372C2E]/20"
            >
                {isExporting ? <span className="animate-pulse">กำลังสร้าง PDF...</span> : <><Download size={18}/> ส่งออก PDF</>}
            </button>

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#DBD0C5] shadow-sm">
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-[#372C2E] outline-none cursor-pointer p-1"
                >
                    {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-[#372C2E] outline-none cursor-pointer p-1 border-l border-[#efebe9]"
                >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* ส่วนที่จะถูก Capture ลง PDF (ใช้ ref) */}
      <div ref={reportRef} className="space-y-8 bg-white p-2 rounded-[2rem]">
        {loading ? (
          <div className="p-20 text-center text-[#a1887f] font-bold animate-pulse italic">กำลังประมวลผล...</div>
        ) : (
          <>
            {/* Header เฉพาะใน PDF (แอบไว้ในหน้าจอปกติถ้าต้องการ) */}
            <div className="hidden show-in-pdf flex justify-between items-center border-b pb-4 border-[#efebe9]">
                <h1 className="text-xl font-black text-[#372C2E]">JINGJAI CAT HOTEL REPORT</h1>
                <p className="text-sm text-[#885E43] font-bold">{months[selectedMonth-1]} {selectedYear}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#372C2E] p-8 rounded-[2.5rem] text-white relative overflow-hidden">
                <p className="text-[#a1887f] text-sm font-bold uppercase tracking-widest mb-1">รายได้ประจำเดือน</p>
                <h3 className="text-5xl font-black text-[#DE9E48]">฿{reportData.totalRevenue.toLocaleString()}</h3>
              </div>

              <div className="bg-[#FDFBFA] p-8 rounded-[2.5rem] border border-[#DBD0C5] flex flex-col justify-center">
                <p className="text-[#a1887f] text-sm font-bold uppercase tracking-widest mb-1">จำนวนการจอง</p>
                <h3 className="text-5xl font-black text-[#372C2E]">{reportData.totalBookings} <span className="text-lg text-[#DBD0C5]">ครั้ง</span></h3>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-[#DBD0C5]">
              <h3 className="font-bold text-[#372C2E] uppercase tracking-widest text-xs mb-8">สถิติแยกตามประเภทห้อง</h3>
              <div className="space-y-6">
                {reportData.roomStats.map((room) => (
                  <div key={room.name} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-[#372C2E]">
                      <span>{room.name} ({room.count} ครั้ง)</span>
                      <span className="text-[#885E43]">฿{room.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-3 bg-[#F5F2F0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#885E43]" style={{ width: `${reportData.totalRevenue > 0 ? (room.revenue / reportData.totalRevenue) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                ))}
                {reportData.roomStats.length === 0 && <p className="text-center py-10 text-[#a1887f]">ไม่มีข้อมูลในเดือนนี้</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
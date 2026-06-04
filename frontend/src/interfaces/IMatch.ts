export interface IMatch {
  id: number;
  opponent: string;         // Ví dụ: "Hà Nội FC"
  opponentLogo?: string;    // Link ảnh logo đội khách
  matchDate: Date | string; // Thời gian diễn ra trận đấu
  stadium: string;          // Mặc định: "Sân vận động Vinh"
  description?: string;     // Thông tin thêm như: "Vòng 15 V-League"
  ticketPriceMin?: number;  // Giá vé thấp nhất để hiển thị (VD: 50000)
  
  bannerImage?: string;     // Ảnh nền lớn của trận đấu (hiện ở trang chủ)
  
  status: 'UPCOMING' | 'ON_SALE' | 'SOLD_OUT' | 'FINISHED';

  homeScore?: number;       // Tỷ số đội nhà (SLNA) - dùng sau khi trận đấu kết thúc
  awayScore?: number;       // Tỷ số đội khách
  freeStands?: Array<'A' | 'B' | 'C' | 'D'>; // Khán đài miễn phí vé theo từng trận
}

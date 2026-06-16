export interface ITicket {
  id: number;
  matchId: number;          // Liên kết với trận đấu nào
  orderId?: number | null;  // ID đơn hàng nếu đã được đặt
  
  seatCode: string;         // Ví dụ: "A1-15"
  sector: string;           // Khán đài: A, B, C, D
  row: string;              // Hàng ghế (ví dụ: hàng 1, hàng 2)
  seatNumber: number;       // Số ghế trong hàng
  
  price: number;
  status: 'AVAILABLE' | 'PENDING' | 'HELD' | 'SOLD' | 'PAPER_RESERVED' | 'PAPER_SOLD'; // Trạng thái ghế  
  /**
   * Mã QR riêng cho từng vé. 
   * Khi nhân viên quét mã này, hệ thống sẽ biết chính xác là ghế nào, khán đài nào.
   */
  ticketQrCode?: string; 

  /**
   * Trạng thái đã check-in vào cổng hay chưa.
   * Tránh việc một vé bị quay vòng cho nhiều người dùng.
   */
  isScanned?: boolean; 
  heldUntil?: Date | string | null;
  heldByCurrentUser?: boolean;
}

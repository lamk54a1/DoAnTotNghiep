import { ITicket } from './ITicket';

export type PaymentMethod = 'VNPAY' | 'MOMO' | 'CASH' | 'BANK_TRANSFER';

export interface IOrderResponse {
  id: number;
  orderQrCode: string;
}

export interface IOrder {
  id: number;
  userId: number;
  totalAmount: number;
  
  // Trạng thái đơn hàng
  status: 'PENDING' | 'SUCCESS' | 'CANCELLED';
  
  // Phương thức thanh toán
  paymentMethod: PaymentMethod;
  
  createdAt: Date | string;
  
  // Danh sách vé trong đơn hàng này
  tickets: ITicket[]; 
  /**
   * QR dùng để THANH TOÁN (Hiện ra khi vừa bấm đặt vé xong)
   * Có thể là link ảnh VietQR hoặc chuỗi ký tự để generate mã QR
   */
  paymentQrCode?: string; 

  /**
   * QR dùng để VÀO SÂN (Mã tổng cho cả đơn hàng)
   * Thường là một chuỗi Hash bí mật để nhân viên soát vé quét
   */
  orderQrCode?: string;
  transactionId?: string;
}

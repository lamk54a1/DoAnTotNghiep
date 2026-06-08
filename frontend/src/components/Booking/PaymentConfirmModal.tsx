import { Modal } from 'antd';

interface PaymentConfirmModalProps {
  open: boolean;
  selectedSeatCount: number;
  totalPrice: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function PaymentConfirmModal({
  open,
  selectedSeatCount,
  totalPrice,
  onCancel,
  onConfirm,
}: PaymentConfirmModalProps) {
  return (
    <Modal
      title={<span className="text-2xl font-black italic uppercase tracking-tighter text-[#003078]">Xác nhận</span>}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Thanh toán ngay"
      centered
      width={450}
      okButtonProps={{ className: 'bg-[#003078] h-12 px-10 font-bold rounded-xl border-none shadow-lg' }}
    >
      <div className="space-y-5 py-6">
        <div className="flex justify-between border-b border-dashed pb-3 text-xs">
          <span className="font-bold uppercase text-gray-500">Số lượng vé</span>
          <span className="text-lg font-black text-[#003078]">{selectedSeatCount} vé</span>
        </div>
        <div className="mt-4 rounded-3xl bg-[#003078] p-6 shadow-lg shadow-blue-900/20">
          <div className="flex items-center justify-between font-black italic uppercase text-white">
            <span className="text-[10px] tracking-widest opacity-70">Tổng tiền</span>
            <span className="text-2xl tracking-tighter">{totalPrice.toLocaleString()}đ</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

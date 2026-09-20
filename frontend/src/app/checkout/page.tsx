'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Spin } from 'antd';
import axiosClient from '../../api/axiosClient';
import { useBooking } from '../../hooks/useBooking';
import CheckoutSteps from '../../components/Checkout/CheckoutSteps';
import EmptyCheckoutState from '../../components/Checkout/EmptyCheckoutState';
import OrderSummaryCard from '../../components/Checkout/OrderSummaryCard';
import PaymentMethodPanel from '../../components/Checkout/PaymentMethodPanel';
import PaymentSuccess from '../../components/Checkout/PaymentSuccess';
import { useCheckoutPayment } from '../../hooks/useCheckoutPayment';
import { IOrderResponse, PaymentMethod } from '../../interfaces/IOrder';

const CheckoutPage = () => {
  const router = useRouter();
  const { selectedSeats, totalPrice, confirmPayment, reset } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [ticketCode, setTicketCode] = useState('');
  const [confirmedSeats, setConfirmedSeats] = useState<string[]>([]);
  const [pendingOrder, setPendingOrder] = useState<IOrderResponse | null>(null);
  const [sepayAvailable, setSepayAvailable] = useState(false);
  const [paymentOptionsLoaded, setPaymentOptionsLoaded] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'PENDING' | 'SUCCESS' | 'CANCELLED'>('PENDING');

  useEffect(() => {
    void axiosClient.get<{ sepayAvailable: boolean }>('/orders/payment-options')
      .then((result) => {
        setSepayAvailable(result.sepayAvailable);
        setPaymentMethod(result.sepayAvailable ? 'SEPAY' : 'BANK_TRANSFER');
      })
      .catch(() => setSepayAvailable(false))
      .finally(() => setPaymentOptionsLoaded(true));
  }, []);

  const { isCreatingOrder, createPendingOrder } = useCheckoutPayment({
    selectedSeats,
    paymentMethod,
    onOrderCreated: (order, seatsSnapshot) => {
      setPendingOrder(order);
      setOrderStatus('PENDING');
      setTicketCode(order.orderQrCode);
      setConfirmedSeats(seatsSnapshot);
      setCurrentStep(2);
    },
  });

  useEffect(() => {
    if (!pendingOrder || pendingOrder.paymentMethod !== 'SEPAY') return;
    let active = true;
    const checkStatus = async () => {
      try {
        const result = await axiosClient.get<{ status: 'PENDING' | 'SUCCESS' | 'CANCELLED' }>(`/orders/${pendingOrder.id}/status`);
        if (!active) return;
        setOrderStatus(result.status);
        if (result.status === 'SUCCESS') {
          active = false;
          window.clearInterval(timer);
          confirmPayment();
          setIsSuccess(true);
        } else if (result.status === 'CANCELLED') {
          active = false;
          window.clearInterval(timer);
        }
      } catch {
        // A temporary network failure must never be treated as a successful payment.
      }
    };
    const timer = window.setInterval(() => void checkStatus(), 5000);
    void checkStatus();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pendingOrder, confirmPayment]);

  const finishCheckout = () => {
    reset();
    router.push('/my-tickets');
  };

  if (isSuccess) {
    return <PaymentSuccess ticketCode={ticketCode} confirmedSeats={confirmedSeats} paid />;
  }

  if (selectedSeats.length === 0) {
    return <EmptyCheckoutState />;
  }

  if (!paymentOptionsLoaded) {
    return <div className="flex min-h-screen items-center justify-center"><Spin size="large" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-20 font-montserrat">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <CheckoutSteps currentStep={currentStep} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {orderStatus === 'CANCELLED' && <Alert showIcon type="warning" message="Đơn đã hết hạn. Nếu bạn đã chuyển khoản, vui lòng liên hệ quản trị viên để đối soát; hệ thống không tự cấp vé cho đơn quá hạn." />}
            <PaymentMethodPanel
              paymentMethod={paymentMethod}
              totalPrice={pendingOrder?.totalAmount ?? totalPrice}
              order={pendingOrder}
              orderStatus={orderStatus}
              isCreatingOrder={isCreatingOrder}
              sepayAvailable={sepayAvailable}
              onPaymentMethodChange={setPaymentMethod}
              onCreateOrder={createPendingOrder}
              onFinish={finishCheckout}
            />
          </div>
          <div className="lg:col-span-1">
            <OrderSummaryCard totalPrice={totalPrice} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

'use client';
import { useState } from 'react';
import { useBooking } from '../../hooks/useBooking';
import CheckoutSteps from '../../components/Checkout/CheckoutSteps';
import EmptyCheckoutState from '../../components/Checkout/EmptyCheckoutState';
import OrderSummaryCard from '../../components/Checkout/OrderSummaryCard';
import PaymentMethodPanel from '../../components/Checkout/PaymentMethodPanel';
import PaymentSuccess from '../../components/Checkout/PaymentSuccess';
import { useCheckoutPayment } from '../../hooks/useCheckoutPayment';
import { IOrderResponse, PaymentMethod } from '../../interfaces/IOrder';

const CheckoutPage = () => {
  const { selectedSeats, totalPrice, confirmPayment } = useBooking();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [ticketCode, setTicketCode] = useState('');
  const [confirmedSeats, setConfirmedSeats] = useState<string[]>([]);
  const [pendingOrder, setPendingOrder] = useState<IOrderResponse | null>(null);

  const { isCreatingOrder, createPendingOrder } = useCheckoutPayment({
    selectedSeats,
    paymentMethod,
    onOrderCreated: (order, seatsSnapshot) => {
      setPendingOrder(order);
      setTicketCode(order.orderQrCode);
      setConfirmedSeats(seatsSnapshot);
      setCurrentStep(2);
    },
  });

  const finishCheckout = () => {
    confirmPayment();
    setIsSuccess(true);
  };

  if (isSuccess) {
    return <PaymentSuccess ticketCode={ticketCode} confirmedSeats={confirmedSeats} />;
  }

  if (selectedSeats.length === 0) {
    return <EmptyCheckoutState />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-28 pb-20 font-montserrat">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <CheckoutSteps currentStep={currentStep} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PaymentMethodPanel
              paymentMethod={paymentMethod}
              totalPrice={pendingOrder?.totalAmount ?? totalPrice}
              order={pendingOrder}
              isCreatingOrder={isCreatingOrder}
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

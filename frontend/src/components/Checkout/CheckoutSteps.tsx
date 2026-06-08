import { CheckCircleOutlined, CreditCardOutlined, UserOutlined } from '@ant-design/icons';
import { Steps } from 'antd';

interface CheckoutStepsProps {
  currentStep: number;
}

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <Steps
      current={currentStep}
      items={[
        { title: 'Chọn vị trí ghế', icon: <UserOutlined /> },
        { title: 'Tiến hành thanh toán', icon: <CreditCardOutlined /> },
        { title: 'Nhận vé hoàn tất', icon: <CheckCircleOutlined /> },
      ]}
    />
  );
}

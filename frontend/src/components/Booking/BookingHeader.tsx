import { EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { StandDetail } from './standConfigs';

interface BookingHeaderProps {
  currentStand: StandDetail;
  currentDisplayPrice: number;
  matchId?: string;
}

export default function BookingHeader({ currentStand, currentDisplayPrice, matchId }: BookingHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
      <div>
        <h1 className="m-0 text-3xl font-black italic uppercase leading-none text-[#003078]">
          Sơ đồ vé trực tuyến
        </h1>
        <div className="mt-3 flex items-center gap-4 text-sm font-bold text-gray-500">
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[#003078]">
            <EnvironmentOutlined /> {currentStand.name}
          </span>
          <span className="font-black italic uppercase text-red-600">
            Giá vé: {currentDisplayPrice === 0 ? 'Miễn phí' : `${currentDisplayPrice.toLocaleString()}đ`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2">
        <InfoCircleOutlined className="text-yellow-600" />
        <span className="text-[11px] font-black uppercase italic tracking-tighter text-yellow-800">Mã trận đấu: #{matchId}</span>
      </div>
    </div>
  );
}

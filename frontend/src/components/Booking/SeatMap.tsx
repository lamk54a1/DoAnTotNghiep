import { useMemo } from 'react';
import { StandDetail, StandKey } from './standConfigs';

interface SeatMapProps {
  activeTab: StandKey;
  currentStand: StandDetail;
  currentDisplayPrice: number;
  existingSeats: string[];
  localSoldSeats: string[];
  remainingTicketQuota: number;
  selectedSeats: string[];
  ticketPrices: Record<string, number>;
  onQuotaReached: () => void;
  onToggleSeat: (seatId: string, price: number) => void;
}

export default function SeatMap({
  activeTab,
  currentStand,
  currentDisplayPrice,
  existingSeats,
  localSoldSeats,
  remainingTicketQuota,
  selectedSeats,
  ticketPrices,
  onQuotaReached,
  onToggleSeat,
}: SeatMapProps) {
  const rows = useMemo(() => Array.from({ length: currentStand.rows }, (_, index) => index + 1), [currentStand.rows]);
  const existingSeatSet = useMemo(() => new Set(existingSeats), [existingSeats]);
  const soldSeatSet = useMemo(() => new Set(localSoldSeats), [localSoldSeats]);

  return (
    <div className="relative min-h-[500px] overflow-hidden rounded-[40px] border border-gray-100 bg-white p-6 shadow-sm md:p-10">
      <div className="relative z-10 mb-12 text-center">
        <div className="mx-auto mb-3 h-1.5 w-1/3 rounded-full bg-gray-800 opacity-10"></div>
        <p className="text-[10px] font-black uppercase italic tracking-[0.5em] text-gray-400">Mặt sân Vinh (Pitch Side)</p>
      </div>

      <div className="custom-scrollbar max-h-[550px] overflow-x-auto overflow-y-auto pb-10">
        <div className="flex min-w-max flex-col items-center gap-3 px-8">
          {rows.map((rowNumber) => (
            <div key={rowNumber} className="flex items-center gap-4">
              <span className="w-8 text-xs font-black text-gray-300">{rowNumber}</span>
              <div className="flex gap-2">
                {Array.from({ length: currentStand.seatsPerRow }).map((_, index) => {
                  const seatNum = index + 1;
                  const sectorName = `${activeTab}${rowNumber}`;
                  const paddedSeat = String(seatNum).padStart(2, '0');
                  const seatId = `${sectorName}-${paddedSeat}`;
                  const isSelected = selectedSeats.includes(seatId);
                  const isCreated = existingSeatSet.has(seatId);
                  const isSold = soldSeatSet.has(seatId);
                  const seatPrice = ticketPrices[seatId] ?? currentDisplayPrice;
                  const isQuotaReached = !isSelected && selectedSeats.length >= remainingTicketQuota;

                  return (
                    <button
                      key={seatId}
                      disabled={!isCreated || isSold || isQuotaReached}
                      onClick={() => {
                        if (!isCreated) return;
                        if (isQuotaReached) {
                          onQuotaReached();
                          return;
                        }
                        if (!isSold) onToggleSeat(seatId, seatPrice);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[9px] font-black transition-all duration-200 ${
                        !isCreated
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-200 opacity-40'
                          : isSold
                            ? 'cursor-not-allowed border-gray-100 bg-gray-200 text-gray-400 opacity-40 line-through'
                            : isSelected
                              ? 'z-10 scale-110 border-[#FFD700] bg-[#FFD700] text-[#003078] shadow-lg shadow-yellow-200'
                              : isQuotaReached
                                ? 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-300 opacity-60'
                                : 'border-gray-100 bg-white text-gray-400 hover:border-[#003078] hover:text-[#003078]'
                      }`}
                    >
                      {seatNum}
                    </button>
                  );
                })}
              </div>
              <span className="w-8 text-right text-xs font-black text-gray-300">{rowNumber}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

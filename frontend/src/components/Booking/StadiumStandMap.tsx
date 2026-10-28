import { EnvironmentOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { StandInventory } from '../../hooks/useBookingMatch';
import { STAND_CONFIGS, StandKey } from './standConfigs';

interface StadiumStandMapProps {
  activeStand: StandKey;
  onChange: (stand: StandKey) => void;
  standInventory?: Record<string, StandInventory>;
  standPrices?: Partial<Record<StandKey, number>>;
  freeStands?: string[];
}

const standAreas: Array<{
  key: StandKey;
  label: string;
  sections: string;
  path: string;
  labelX: number;
  labelY: number;
  fill: string;
}> = [
  {
    key: 'B8', label: 'B8', sections: 'KHÁN ĐÀI B',
    path: 'M 310 106 Q 372 74 438 62 L 456 174 L 362 202 Z',
    labelX: 382, labelY: 125,
    fill: '#f4a621',
  },
  {
    key: 'B9', label: 'B9', sections: 'KHÁN ĐÀI B',
    path: 'M 438 62 Q 500 48 562 62 L 544 174 Q 500 162 456 174 Z',
    labelX: 500, labelY: 102, fill: '#f4a621',
  },
  {
    key: 'B10', label: 'B10', sections: 'KHÁN ĐÀI B',
    path: 'M 562 62 Q 628 74 690 106 L 638 202 L 544 174 Z',
    labelX: 618, labelY: 125, fill: '#f4a621',
  },
  {
    key: 'C7', label: 'C7', sections: 'KHÁN ĐÀI C',
    path: 'M 292 116 Q 142 164 102 266 L 232 294 Q 252 246 366 210 Z',
    labelX: 215, labelY: 205, fill: '#8fbd42',
  },
  {
    key: 'C6', label: 'C6', sections: 'KHÁN ĐÀI C',
    path: 'M 102 266 Q 82 326 102 390 Q 142 492 292 536 L 366 438 Q 250 408 232 358 L 232 294 Z',
    labelX: 180, labelY: 365, fill: '#8fbd42',
  },
  {
    key: 'D11', label: 'D11', sections: 'KHÁN ĐÀI D',
    path: 'M 708 116 Q 825 150 880 224 L 756 278 Q 720 230 634 210 Z',
    labelX: 785, labelY: 202, fill: '#69a0d4',
  },
  {
    key: 'D12', label: 'D12', sections: 'KHÁN ĐÀI D',
    path: 'M 880 224 Q 918 326 880 428 L 756 374 Q 774 326 756 278 Z',
    labelX: 842, labelY: 326, fill: '#69a0d4',
  },
  {
    key: 'D13', label: 'D13', sections: 'KHÁN ĐÀI D',
    path: 'M 880 428 Q 825 502 708 536 L 634 438 Q 720 420 756 374 Z',
    labelX: 785, labelY: 450, fill: '#69a0d4',
  },
  {
    key: 'A5', label: 'A5', sections: 'KHÁN ĐÀI A',
    path: 'M 292 536 Q 344 566 406 584 L 426 466 L 366 438 Z',
    labelX: 360, labelY: 526, fill: '#69a0d4',
  },
  {
    key: 'A3', label: 'A3', sections: 'KHÁN ĐÀI A',
    path: 'M 406 584 Q 450 598 490 600 L 494 480 L 426 466 Z',
    labelX: 456, labelY: 540, fill: '#f4c51d',
  },
  {
    key: 'A1', label: 'A1', sections: 'KHÁN ĐÀI A · VIP',
    path: 'M 490 600 Q 530 600 574 586 L 562 466 L 494 480 Z',
    labelX: 530, labelY: 540, fill: '#df1645',
  },
  {
    key: 'A2', label: 'A2', sections: 'KHÁN ĐÀI A',
    path: 'M 574 586 Q 656 566 708 536 L 634 438 L 562 466 Z',
    labelX: 632, labelY: 526, fill: '#f4c51d',
  },
];

const formatPrice = (price: number, isFree: boolean) => isFree ? 'Miễn phí' : `${price.toLocaleString('vi-VN')}đ`;

export default function StadiumStandMap({
  activeStand,
  onChange,
  standInventory,
  standPrices,
  freeStands = [],
}: StadiumStandMapProps) {
  const current = STAND_CONFIGS[activeStand];
  const inventory = standInventory?.[activeStand];
  const isFree = freeStands.includes(activeStand);
  const price = Number(standPrices?.[activeStand] ?? current.price);

  const selectStand = (stand: StandKey) => onChange(stand);

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#002b6e] to-[#064b9d] px-5 py-5 text-white md:px-7">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Sân vận động Vinh</p>
            <h2 className="m-0 mt-1 text-xl font-black uppercase md:text-2xl">Chọn khán đài trên sơ đồ</h2>
          </div>
          <p className="m-0 text-xs font-semibold text-blue-100">Chạm vào khu vực muốn xem ghế</p>
        </div>
      </div>

      <div className="grid items-stretch lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative bg-[#eef4fb] p-2 sm:p-5">
          <svg
            viewBox="0 0 1000 650"
            className="mx-auto block h-auto w-full max-w-[900px]"
            role="img"
            aria-label="Sơ đồ tương tác các khán đài sân vận động Vinh"
          >
            <defs>
              <filter id="stand-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#001a42" floodOpacity="0.2" />
              </filter>
              <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#25a84b" />
                <stop offset="1" stopColor="#087d35" />
              </linearGradient>
            </defs>

            <ellipse cx="500" cy="326" rx="422" ry="296" fill="#d8e4f2" stroke="#c5d5e8" strokeWidth="3" />

            {standAreas.map((area) => {
              const selected = activeStand === area.key;
              const available = standInventory?.[area.key]?.available ?? 0;
              return (
                <g
                  key={area.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${STAND_CONFIGS[area.key].name}, còn ${available} ghế`}
                  aria-pressed={selected}
                  onClick={() => selectStand(area.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectStand(area.key);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <path
                    d={area.path}
                    fill={area.fill}
                    stroke={selected ? '#ffd600' : '#ffffff'}
                    strokeWidth={selected ? 12 : 6}
                    filter={selected ? 'url(#stand-shadow)' : undefined}
                    className="transition-all duration-200 hover:brightness-110"
                  />
                  <text
                    x={area.labelX}
                    y={area.labelY - 12}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="25"
                    fontWeight="900"
                    className="pointer-events-none"
                  >
                    {area.label}
                  </text>
                  <text
                    x={area.labelX}
                    y={area.labelY + 18}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="17"
                    fontWeight="800"
                    className="pointer-events-none"
                  >
                    {area.sections}
                  </text>
                </g>
              );
            })}

            <rect x="326" y="230" width="348" height="193" rx="8" fill="url(#pitch)" stroke="#ffffff" strokeWidth="8" />
            <line x1="500" y1="234" x2="500" y2="419" stroke="#ffffff" strokeWidth="3" />
            <circle cx="500" cy="326" r="42" fill="none" stroke="#ffffff" strokeWidth="3" />
            <circle cx="500" cy="326" r="4" fill="#ffffff" />
            <rect x="330" y="274" width="50" height="104" fill="none" stroke="#ffffff" strokeWidth="3" />
            <rect x="620" y="274" width="50" height="104" fill="none" stroke="#ffffff" strokeWidth="3" />
            <image href="/images/logo-transparent.png" x="455" y="278" width="90" height="96" preserveAspectRatio="xMidYMid meet" />

            <g className="pointer-events-none">
              <rect x="408" y="73" width="184" height="34" rx="17" fill="#002b6e" />
              <text x="500" y="96" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900">MẶT SÂN</text>
            </g>
          </svg>
        </div>

        <aside className="flex flex-col justify-between border-t border-slate-100 p-5 lg:border-l lg:border-t-0 lg:p-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white shadow-sm" style={{ backgroundColor: current.color }}>
                {activeStand}
              </span>
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-slate-400">Đang chọn</p>
                <h3 className="m-0 text-xl font-black text-[#003078]">{current.name}</h3>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-500">Giá vé</span>
                <strong className="text-base text-red-600">{formatPrice(price, isFree)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-500">Ghế còn lại</span>
                <strong className="text-base text-emerald-700">{inventory?.available ?? 0}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-500">Tổng số ghế</span>
                <strong className="text-base text-slate-700">{inventory?.total ?? 0}</strong>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-xs font-semibold text-slate-500">
            <p className="m-0 flex items-center gap-2"><EnvironmentOutlined className="text-[#003078]" /> Chọn khu vực trên sơ đồ để xem ghế.</p>
            <p className="m-0 flex items-center gap-2"><SafetyCertificateOutlined className="text-emerald-600" /> Ghế được giữ tạm ngay khi bạn chọn.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

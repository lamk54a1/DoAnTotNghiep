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
  path: string;
  labelX: number;
  labelY: number;
  fill: string;
}> = [
  {
    key: 'B8', label: 'B8',
    path: 'M 310 106 Q 372 74 438 62 L 456 174 L 362 202 Z',
    labelX: 382, labelY: 125,
    fill: '#f4a621',
  },
  {
    key: 'B9', label: 'B9',
    path: 'M 438 62 Q 500 48 562 62 L 544 174 Q 500 162 456 174 Z',
    labelX: 500, labelY: 102, fill: '#f4a621',
  },
  {
    key: 'B10', label: 'B10',
    path: 'M 562 62 Q 628 74 690 106 L 638 202 L 544 174 Z',
    labelX: 618, labelY: 125, fill: '#f4a621',
  },
  {
    key: 'C7', label: 'C7',
    path: 'M 292 116 Q 142 164 102 266 L 232 294 Q 252 246 366 210 Z',
    labelX: 215, labelY: 205, fill: '#8fbd42',
  },
  {
    key: 'C6', label: 'C6',
    path: 'M 102 266 Q 82 326 102 390 Q 142 492 292 536 L 366 438 Q 250 408 232 358 L 232 294 Z',
    labelX: 180, labelY: 365, fill: '#8fbd42',
  },
  {
    key: 'D11', label: 'D11',
    path: 'M 708 116 Q 825 150 880 224 L 756 278 Q 720 230 634 210 Z',
    labelX: 785, labelY: 202, fill: '#69a0d4',
  },
  {
    key: 'D12', label: 'D12',
    path: 'M 880 224 Q 918 326 880 428 L 756 374 Q 774 326 756 278 Z',
    labelX: 842, labelY: 326, fill: '#69a0d4',
  },
  {
    key: 'D13', label: 'D13',
    path: 'M 880 428 Q 825 502 708 536 L 634 438 Q 720 420 756 374 Z',
    labelX: 785, labelY: 450, fill: '#69a0d4',
  },
  {
    key: 'A5', label: 'A5',
    path: 'M 292 536 Q 344 566 406 584 L 426 466 L 366 438 Z',
    labelX: 360, labelY: 526, fill: '#69a0d4',
  },
  {
    key: 'A3', label: 'A3',
    path: 'M 406 584 Q 450 598 490 600 L 494 480 L 426 466 Z',
    labelX: 456, labelY: 540, fill: '#f4c51d',
  },
  {
    key: 'A1', label: 'A1',
    path: 'M 490 600 Q 530 600 574 586 L 562 466 L 494 480 Z',
    labelX: 530, labelY: 540, fill: '#df1645',
  },
  {
    key: 'A2', label: 'A2',
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
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_center,#f8fbff_0%,#e7f0fb_72%,#d7e5f5_100%)] p-2 sm:p-5">
          <svg
            viewBox="0 0 1000 650"
            className="mx-auto block h-auto w-full max-w-[900px]"
            role="img"
            aria-label="Sơ đồ tương tác các khán đài sân vận động Vinh"
          >
            <defs>
              <filter id="stand-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#001a42" floodOpacity="0.28" />
              </filter>
              <filter id="label-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#001a42" floodOpacity="0.48" />
              </filter>
              <linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#25a84b" />
                <stop offset="1" stopColor="#087d35" />
              </linearGradient>
            </defs>

            <ellipse cx="500" cy="326" rx="428" ry="302" fill="#dce8f5" stroke="#b9cde4" strokeWidth="3" />
            <ellipse cx="500" cy="326" rx="398" ry="272" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />

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
                    stroke={selected ? '#ffcf00' : '#ffffff'}
                    strokeWidth={selected ? 7 : 5}
                    filter={selected ? 'url(#stand-shadow)' : undefined}
                    opacity={selected ? 1 : 0.92}
                    className="transition-all duration-200 hover:opacity-100 hover:brightness-105"
                  />
                  {selected && (
                    <path
                      d={area.path}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeDasharray="8 7"
                      opacity="0.85"
                      className="pointer-events-none"
                    />
                  )}
                  <text
                    x={area.labelX}
                    y={area.labelY + 7}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="27"
                    fontWeight="900"
                    filter="url(#label-shadow)"
                    className="pointer-events-none select-none"
                  >
                    {area.label}
                  </text>
                </g>
              );
            })}

            <ellipse cx="500" cy="326" rx="267" ry="151" fill="#f8fbff" stroke="#c8d8e9" strokeWidth="3" />
            <rect x="326" y="230" width="348" height="193" rx="5" fill="url(#pitch)" stroke="#ffffff" strokeWidth="7" filter="url(#stand-shadow)" />
            <rect x="337" y="241" width="326" height="171" rx="2" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" />
            <line x1="500" y1="234" x2="500" y2="419" stroke="#ffffff" strokeWidth="3" />
            <circle cx="500" cy="326" r="42" fill="none" stroke="#ffffff" strokeWidth="3" />
            <circle cx="500" cy="326" r="4" fill="#ffffff" />
            <rect x="330" y="274" width="50" height="104" fill="none" stroke="#ffffff" strokeWidth="3" />
            <rect x="620" y="274" width="50" height="104" fill="none" stroke="#ffffff" strokeWidth="3" />
            <image href="/images/logo-transparent.png" x="459" y="281" width="82" height="90" preserveAspectRatio="xMidYMid meet" />

            <g className="pointer-events-none">
              <rect x="434" y="205" width="132" height="29" rx="14.5" fill="#002b6e" stroke="#ffffff" strokeWidth="2" />
              <text x="500" y="225" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1.5">MẶT SÂN</text>
              <text x="500" y="32" textAnchor="middle" fill="#547293" fontSize="13" fontWeight="900" letterSpacing="3">KHÁN ĐÀI B</text>
              <text x="500" y="635" textAnchor="middle" fill="#547293" fontSize="13" fontWeight="900" letterSpacing="3">KHÁN ĐÀI A</text>
              <text x="94" y="332" textAnchor="middle" fill="#547293" fontSize="13" fontWeight="900" letterSpacing="3" transform="rotate(-90 94 332)">KHÁN ĐÀI C</text>
              <text x="906" y="332" textAnchor="middle" fill="#547293" fontSize="13" fontWeight="900" letterSpacing="3" transform="rotate(90 906 332)">KHÁN ĐÀI D</text>
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

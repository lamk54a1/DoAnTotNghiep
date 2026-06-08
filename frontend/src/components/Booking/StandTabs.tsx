import { Tabs } from 'antd';
import { STAND_CONFIGS, StandKey } from './standConfigs';
import { StandInventory } from '../../hooks/useBookingMatch';

interface StandTabsProps {
  activeTab: StandKey;
  onChange: (stand: StandKey) => void;
  standInventory?: Record<string, StandInventory>;
}

export default function StandTabs({ activeTab, onChange, standInventory }: StandTabsProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
      <Tabs
        centered
        activeKey={activeTab}
        onChange={(key) => onChange(key as StandKey)}
        items={(Object.keys(STAND_CONFIGS) as StandKey[]).map((key) => ({
          label: (
            <span className="flex flex-col px-6 text-xs font-black italic uppercase">
              <span>{STAND_CONFIGS[key].name}</span>
              <span className="mt-1 text-[10px] not-italic text-gray-400">
                Còn {standInventory?.[key]?.available ?? 0}/{standInventory?.[key]?.total ?? 0}
                {(standInventory?.[key]?.paperReserved ?? 0) > 0
                  ? ` - Vé giấy ${standInventory?.[key]?.paperReserved ?? 0}`
                  : ''}
              </span>
            </span>
          ),
          key,
        }))}
      />
    </div>
  );
}

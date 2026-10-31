import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, BatteryCharging, Signal, Bell } from 'lucide-react';

interface AndroidStatusBarProps {
  batteryLevel?: number;
  isCharging?: boolean;
  networkType?: '5G' | '4G' | 'Wi-Fi';
  hasNotification?: boolean;
  notificationText?: string | null;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({
  batteryLevel = 92,
  isCharging = false,
  networkType = '5G',
  hasNotification = false,
  notificationText = null,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-8 bg-zinc-950 text-zinc-100 flex items-center justify-between px-5 select-none text-[12px] font-medium tracking-tight z-50 border-b border-zinc-900/50 relative">
      {/* Left: Clock and optional notification glyph */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-zinc-200">{timeStr || '12:45'}</span>
        {hasNotification && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-800/40">
            <Bell className="w-2.5 h-2.5" />
            <span className="max-w-[90px] truncate">{notificationText || 'Prime Bazaar'}</span>
          </div>
        )}
      </div>

      {/* Center: Camera Punch-Hole Notch */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-black ring-2 ring-zinc-800/80 flex items-center justify-center shadow-inner">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-950/80 ring-1 ring-blue-500/30"></div>
        </div>
      </div>

      {/* Right: Network, Wi-Fi, and Battery */}
      <div className="flex items-center gap-1.5 text-zinc-300">
        <span className="text-[10px] font-bold text-zinc-400 tracking-wider">{networkType}</span>
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center gap-0.5">
          <span className="text-[11px] font-semibold">{batteryLevel}%</span>
          {isCharging ? (
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          ) : (
            <BatteryMedium className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
};

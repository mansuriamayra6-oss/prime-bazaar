import React from 'react';

interface AndroidNavBarProps {
  navStyle: 'buttons' | 'gesture';
  onBack: () => void;
  onHome: () => void;
  onRecents: () => void;
  onToggleNavStyle: () => void;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  navStyle,
  onBack,
  onHome,
  onRecents,
  onToggleNavStyle,
}) => {
  return (
    <div className="w-full h-11 bg-zinc-950 text-zinc-400 border-t border-zinc-900/60 flex items-center justify-between px-10 select-none z-50 shrink-0 relative">
      {navStyle === 'buttons' ? (
        <div className="w-full flex items-center justify-around">
          {/* Back Button (Triangle pointing left) */}
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-zinc-400 hover:text-white active:scale-90 active:bg-zinc-800/60 transition-all flex items-center justify-center group"
            title="Android Back"
          >
            <svg
              className="w-4 h-4 fill-current group-hover:fill-emerald-400 transition-colors"
              viewBox="0 0 24 24"
            >
              <polygon points="17,3 5,12 17,21" />
            </svg>
          </button>

          {/* Home Button (Circle) */}
          <button
            onClick={onHome}
            className="p-2 rounded-xl text-zinc-400 hover:text-white active:scale-90 active:bg-zinc-800/60 transition-all flex items-center justify-center group"
            title="Android Home"
          >
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current group-hover:border-emerald-400 group-hover:bg-emerald-400/20 transition-colors" />
          </button>

          {/* Recents Button (Square) */}
          <button
            onClick={onRecents}
            className="p-2 rounded-xl text-zinc-400 hover:text-white active:scale-90 active:bg-zinc-800/60 transition-all flex items-center justify-center group"
            title="Android Recents / Multitasking"
          >
            <div className="w-3.5 h-3.5 rounded-sm border-2 border-current group-hover:border-emerald-400 group-hover:bg-emerald-400/20 transition-colors" />
          </button>
        </div>
      ) : (
        /* Gesture Navigation Pill */
        <div
          onClick={onHome}
          onDoubleClick={onRecents}
          className="w-full flex items-center justify-center py-2 cursor-pointer group"
          title="Android Gesture Pill (Tap for Home, Double-tap for Recents)"
        >
          <div className="w-32 h-1 rounded-full bg-zinc-600 group-hover:bg-emerald-400 active:w-36 transition-all" />
        </div>
      )}

      {/* Switcher dot */}
      <button
        onClick={onToggleNavStyle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 hover:text-zinc-400 px-1 py-0.5 rounded"
        title="Toggle 3-Button / Gesture Bar"
      >
        {navStyle === 'buttons' ? '◧' : '━'}
      </button>
    </div>
  );
};

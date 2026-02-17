import { ExternalLink } from 'lucide-react';

export default function EnvironmentSwitcher() {
  const currentPort = window.location.port;
  const isDev = currentPort === '3001';
  const isProd = currentPort === '3002';

  const handleNavigateDev = () => {
    window.location.href = 'http://localhost:3001/';
  };

  const handleNavigateProd = () => {
    window.location.href = 'http://localhost:3002/';
  };

  return (
    <div className="space-y-3 p-4 bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="text-sm font-semibold text-gray-400">
        تبديل البيئة
      </div>

      {/* Buttons Container */}
      <div className="flex gap-2">
        {/* Prod Button */}
        <button
          onClick={handleNavigateProd}
          disabled={isProd}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            font-semibold text-sm transition-all
            ${isProd
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-slate-700 text-white hover:bg-slate-600 cursor-pointer'
            }
            disabled:opacity-100
          `}
        >
          <span>🔒 Prod</span>
          {isProd && <span className="text-xs bg-green-700 px-2 py-0.5 rounded">نشط</span>}
          {!isProd && <ExternalLink className="w-3 h-3" />}
        </button>

        {/* Dev Button */}
        <button
          onClick={handleNavigateDev}
          disabled={isDev}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            font-semibold text-sm transition-all
            ${isDev
              ? 'bg-blue-600 text-white cursor-default'
              : 'bg-slate-700 text-white hover:bg-slate-600 cursor-pointer'
            }
            disabled:opacity-100
          `}
        >
          <span>⚙️ Dev</span>
          {isDev && <span className="text-xs bg-blue-700 px-2 py-0.5 rounded">نشط</span>}
          {!isDev && <ExternalLink className="w-3 h-3" />}
        </button>
      </div>

      {/* Current Environment Display */}
      <div className="text-xs text-slate-400 mt-3 p-2 bg-slate-800 rounded">
        البيئة الحالية: <span className="text-slate-200 font-semibold">{isDev ? '⚙️ التطوير (Dev)' : '🔒 الإنتاج (Prod)'}</span>
      </div>
    </div>
  );
}

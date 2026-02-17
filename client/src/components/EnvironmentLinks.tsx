import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

type Environment = "prod" | "dev";

export default function EnvironmentLinks() {
  const [currentEnv, setCurrentEnv] = useState<Environment>("dev");
  const [isLocalhost, setIsLocalhost] = useState(false);

  // تحديد البيئة الحالية والموقع
  useEffect(() => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // التحقق من أننا على localhost (PREVIEW)
    const isLocal = hostname.includes("localhost") || hostname.includes("127.0.0.1");
    setIsLocalhost(isLocal);

    // تحديد البيئة من الـ URL
    if (hostname.includes("prod-") || pathname.includes("prod")) {
      setCurrentEnv("prod");
    } else {
      setCurrentEnv("dev");
    }
  }, []);

  // معالج النقر على زر Dev
  const handleDevClick = () => {
    if (isLocalhost) {
      // على PREVIEW: انتقل إلى localhost:3001
      window.location.href = `http://localhost:3001${window.location.pathname}`;
    } else {
      // على الإنترنت: انتقل إلى dev-touristrans-jlfe5kr3.manus.space
      window.location.href = `https://dev-touristrans-jlfe5kr3.manus.space${window.location.pathname}`;
    }
  };

  // معالج النقر على زر Prod
  const handleProdClick = () => {
    if (isLocalhost) {
      // على PREVIEW: انتقل إلى localhost:3002
      window.location.href = `http://localhost:3002${window.location.pathname}`;
    } else {
      // على الإنترنت: انتقل إلى prod-touristrans-jlfe5kr3.manus.space
      window.location.href = `https://prod-touristrans-jlfe5kr3.manus.space${window.location.pathname}`;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="text-xs font-semibold text-slate-600">تبديل البيئة</div>

      <div className="flex flex-col gap-2">
        {/* زر الإنتاج */}
        <Button
          type="button"
          onClick={handleProdClick}
          variant={currentEnv === "prod" ? "default" : "outline"}
          size="sm"
          className="w-full gap-2 justify-between"
        >
          <span className="flex items-center gap-2">
            <span>🔒</span>
            <span>Prod</span>
          </span>
          {currentEnv === "prod" && (
            <Badge variant="secondary" className="text-xs">
              نشط
            </Badge>
          )}
          <ExternalLink className="w-3 h-3" />
        </Button>

        {/* زر التطوير */}
        <Button
          type="button"
          onClick={handleDevClick}
          variant={currentEnv === "dev" ? "default" : "outline"}
          size="sm"
          className="w-full gap-2 justify-between"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Dev</span>
          </span>
          {currentEnv === "dev" && (
            <Badge variant="secondary" className="text-xs">
              نشط
            </Badge>
          )}
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {/* معلومات البيئة الحالية */}
      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
        <p className="font-semibold mb-1">البيئة الحالية:</p>
        <p>
          {currentEnv === "prod"
            ? "🔒 الإنتاج (Prod)"
            : "⚙️ التطوير (Dev)"}
        </p>
        {isLocalhost && (
          <p className="text-xs mt-1 text-slate-500">
            (PREVIEW - localhost)
          </p>
        )}
      </div>
    </div>
  );
}

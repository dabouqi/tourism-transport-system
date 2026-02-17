import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface DateRangeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function DateRangeSelect({ value, onChange, options }: DateRangeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || "اختر";

  return (
    <div className="relative w-full">
      <Button
        variant="outline"
        className="w-full justify-between text-right"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-right text-sm hover:bg-muted transition-colors ${
                  value === option.value ? "bg-accent text-accent-foreground" : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

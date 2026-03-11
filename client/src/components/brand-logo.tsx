import { ClipboardCheck } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "auto";
  showTagline?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: "w-5 h-5", text: "text-sm", hq: "text-sm", tagline: "text-[9px]", iconBox: "w-6 h-6", gap: "gap-1.5" },
  md: { icon: "w-6 h-6", text: "text-lg", hq: "text-lg", tagline: "text-[10px]", iconBox: "w-8 h-8", gap: "gap-2" },
  lg: { icon: "w-8 h-8", text: "text-2xl", hq: "text-2xl", tagline: "text-xs", iconBox: "w-10 h-10", gap: "gap-2.5" },
  xl: { icon: "w-10 h-10", text: "text-3xl", hq: "text-3xl", tagline: "text-sm", iconBox: "w-12 h-12", gap: "gap-3" },
};

export function BrandLogo({ size = "md", variant = "auto", showTagline = false, className = "" }: BrandLogoProps) {
  const s = sizeConfig[size];

  const textColor = variant === "light"
    ? "text-white"
    : variant === "dark"
    ? "text-[hsl(220,35%,18%)]"
    : "text-foreground";

  const hqColor = "text-amber-500";
  const iconBg = variant === "light"
    ? "bg-white/15"
    : variant === "dark"
    ? "bg-[hsl(220,72%,42%)]/10"
    : "bg-primary/10";
  const iconColor = variant === "light"
    ? "text-amber-400"
    : "text-primary";
  const taglineColor = variant === "light"
    ? "text-white/60"
    : "text-muted-foreground";

  return (
    <div className={`flex items-center ${s.gap} ${className}`} data-testid="brand-logo">
      <div className={`flex items-center justify-center ${s.iconBox} rounded-lg ${iconBg}`}>
        <ClipboardCheck className={`${s.icon} ${iconColor}`} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className={`${s.text} font-bold tracking-tight ${textColor}`}>
            CarrierDesk
          </span>
          <span className={`${s.hq} font-extrabold tracking-tight ${hqColor}`}>
            HQ
          </span>
        </div>
        {showTagline && (
          <span className={`${s.tagline} ${taglineColor} font-medium tracking-wide`}>
            The Back Office for Trucking Professionals
          </span>
        )}
      </div>
    </div>
  );
}

export function BrandLogoMark({ size = "md", variant = "auto", className = "" }: Omit<BrandLogoProps, "showTagline">) {
  const s = sizeConfig[size];
  const iconBg = variant === "light"
    ? "bg-white/15"
    : variant === "dark"
    ? "bg-[hsl(220,72%,42%)]/10"
    : "bg-primary/10";
  const iconColor = variant === "light"
    ? "text-amber-400"
    : "text-primary";

  return (
    <div className={`flex items-center justify-center ${s.iconBox} rounded-lg ${iconBg} ${className}`} data-testid="brand-logo-mark">
      <ClipboardCheck className={`${s.icon} ${iconColor}`} />
    </div>
  );
}

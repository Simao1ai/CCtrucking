import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BrandingConfig } from "@shared/branding";
import { Truck, Building2, Briefcase, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Truck,
  Building2,
  Briefcase,
};

const defaultBranding: BrandingConfig = {
  companyName: "CarrierDeskHQ",
  shortName: "CarrierDesk",
  tagline: "Trucking Operations & Compliance Platform",
  primaryColor: "#1e3a5f",
  contactEmail: "support@carrierdeskhq.com",
  supportPhone: "",
  website: "https://carrierdeskhq.com",
  address: "",
  sidebarIconName: "Truck",
};

const TenantContext = createContext<BrandingConfig>(defaultBranding);

function getTenantSlug(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const slug = getTenantSlug();
  const queryKey = slug ? ["/api/branding", { slug }] : ["/api/branding"];
  const { data } = useQuery<BrandingConfig>({
    queryKey,
    queryFn: async () => {
      const url = slug ? `/api/branding?slug=${encodeURIComponent(slug)}` : "/api/branding";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branding");
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const branding = data ?? defaultBranding;

  useEffect(() => {
    document.title = `${branding.companyName} - Operations Platform`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", `${branding.companyName} CRM and operations management platform.`);
    }
    const metaAppTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaAppTitle) {
      metaAppTitle.setAttribute("content", branding.shortName);
    }
  }, [branding]);

  return (
    <TenantContext.Provider value={branding}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): BrandingConfig {
  return useContext(TenantContext);
}

export function useTenantIcon(): LucideIcon {
  const { sidebarIconName } = useTenant();
  return ICON_MAP[sidebarIconName] || Truck;
}

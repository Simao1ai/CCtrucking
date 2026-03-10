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
  companyName: "CC Trucking Services",
  shortName: "CC Trucking",
  tagline: "Professional Trucking Operations & Compliance",
  primaryColor: "#1e3a5f",
  contactEmail: "admin@cctrucking.com",
  supportPhone: "(555) 123-4567",
  website: "https://cctrucking.com",
  address: "123 Main Street, Suite 100, Dallas, TX 75201",
  sidebarIconName: "Truck",
};

const TenantContext = createContext<BrandingConfig>(defaultBranding);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<BrandingConfig>({
    queryKey: ["/api/branding"],
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

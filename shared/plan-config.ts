export type PlanTier = "basic" | "pro" | "enterprise";

export interface PlanLimits {
  maxClients: number;
  maxUsers: number;
  aiTokensPerMonth: number;
}

export interface PlanFeatures {
  modules: string[];
  customBranding: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  description: string;
  pricePlaceholder: string;
  limits: PlanLimits;
  features: PlanFeatures;
}

const BASIC_MODULES = [
  "clients",
  "tickets",
  "documents",
  "invoices",
  "chat",
  "forms",
  "signatures",
  "notarizations",
  "knowledge_base",
];

const PRO_MODULES = [
  ...BASIC_MODULES,
  "bookkeeping",
  "tax_prep",
  "compliance_scheduling",
  "employee_performance",
];

const ENTERPRISE_MODULES = [...PRO_MODULES];

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  basic: {
    tier: "basic",
    name: "Basic",
    description: "Core trucking operations management",
    pricePlaceholder: "Contact for pricing",
    limits: {
      maxClients: 50,
      maxUsers: 5,
      aiTokensPerMonth: 100000,
    },
    features: {
      modules: BASIC_MODULES,
      customBranding: false,
      whiteLabel: false,
      apiAccess: false,
    },
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "Advanced operations with bookkeeping & tax prep",
    pricePlaceholder: "Contact for pricing",
    limits: {
      maxClients: 200,
      maxUsers: 20,
      aiTokensPerMonth: 500000,
    },
    features: {
      modules: PRO_MODULES,
      customBranding: true,
      whiteLabel: true,
      apiAccess: false,
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "Full platform with unlimited AI & API access",
    pricePlaceholder: "Contact for pricing",
    limits: {
      maxClients: -1,
      maxUsers: -1,
      aiTokensPerMonth: -1,
    },
    features: {
      modules: ENTERPRISE_MODULES,
      customBranding: true,
      whiteLabel: true,
      apiAccess: true,
    },
  },
};

export function getPlanDefinition(tier: PlanTier): PlanDefinition {
  return PLAN_DEFINITIONS[tier] || PLAN_DEFINITIONS.basic;
}

const MODULE_ALIASES: Record<string, string> = {
  tax_preparation: "tax_prep",
};

export function isModuleInPlan(moduleName: string, tier: PlanTier): boolean {
  const plan = getPlanDefinition(tier);
  const canonicalName = MODULE_ALIASES[moduleName] || moduleName;
  return plan.features.modules.includes(canonicalName);
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return getPlanDefinition(tier).limits;
}

export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}

export function getUsagePercent(current: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.round((current / limit) * 100);
}

export const PLAN_FEATURE_LABELS: Record<string, string> = {
  clients: "Client Management",
  tickets: "Service Tickets",
  documents: "Document Management",
  invoices: "Invoicing",
  chat: "Client & Staff Messaging",
  forms: "Forms & Templates",
  signatures: "Electronic Signatures",
  notarizations: "Notarization Tracking",
  knowledge_base: "Knowledge Base",
  bookkeeping: "Bookkeeping",
  tax_prep: "Tax Preparation",
  compliance_scheduling: "Compliance Scheduling",
  employee_performance: "Employee Performance",
};

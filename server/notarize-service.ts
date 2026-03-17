import { storage } from "./storage";

const PROOF_API_BASE = "https://api.proof.com/business/v1";

interface NotarizeConfig {
  apiKey: string;
}

async function getNotarizeConfig(tenantId: string): Promise<NotarizeConfig | null> {
  const setting = await storage.getTenantSetting(tenantId, "notarize_api_key");
  if (!setting?.value) return null;
  return { apiKey: setting.value };
}

async function proofFetch(
  endpoint: string,
  apiKey: string,
  options: { method?: string; body?: any } = {}
): Promise<any> {
  const res = await fetch(`${PROOF_API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "ApiKey": apiKey,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Notarize API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

export interface CreateTransactionParams {
  transactionName: string;
  signerEmail: string;
  signerFirstName: string;
  signerLastName: string;
  documentUrl?: string;
  documentBase64?: string;
  documentFileName?: string;
  message?: string;
}

export interface NotarizeTransaction {
  id: string;
  status: string;
  transaction_name: string;
  signer_link?: string;
  documents?: Array<{
    id: string;
    document_url?: string;
    notarial_acts?: string[];
  }>;
}

export async function createNotarizeTransaction(
  tenantId: string,
  params: CreateTransactionParams
): Promise<NotarizeTransaction> {
  const config = await getNotarizeConfig(tenantId);
  if (!config) {
    throw new Error("Notarize.com API key not configured. Go to Admin Settings to set up Notarize.com integration.");
  }

  const transaction = await proofFetch("/transactions", config.apiKey, {
    method: "POST",
    body: {
      transaction_name: params.transactionName,
      signer: {
        email: params.signerEmail,
        first_name: params.signerFirstName,
        last_name: params.signerLastName,
      },
      message: params.message || `Please complete the notarization for "${params.transactionName}".`,
      suppress_email: false,
    },
  });

  if (params.documentUrl || params.documentBase64) {
    const docPayload: any = {
      documents: [{
        document_name: params.documentFileName || `${params.transactionName}.pdf`,
        notarization_required: true,
      }],
    };

    if (params.documentUrl) {
      docPayload.documents[0].document_url = params.documentUrl;
    } else if (params.documentBase64) {
      docPayload.documents[0].document_base64 = params.documentBase64;
    }

    await proofFetch(`/transactions/${transaction.id}/add_documents`, config.apiKey, {
      method: "POST",
      body: docPayload,
    });
  }

  return transaction;
}

export async function getNotarizeTransactionStatus(
  tenantId: string,
  transactionId: string
): Promise<NotarizeTransaction> {
  const config = await getNotarizeConfig(tenantId);
  if (!config) {
    throw new Error("Notarize.com API key not configured.");
  }

  return proofFetch(`/transactions/${transactionId}`, config.apiKey);
}

export async function testNotarizeConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    await proofFetch("/transactions?limit=1", apiKey);
    return { success: true, message: "Successfully connected to Notarize.com (Proof) API" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export function mapProofStatusToInternal(proofStatus: string): string {
  const statusMap: Record<string, string> = {
    draft: "pending",
    sent: "sent",
    received: "in_progress",
    in_progress: "in_progress",
    complete: "notarized",
    completed: "notarized",
    failed: "rejected",
    expired: "rejected",
  };
  return statusMap[proofStatus] || proofStatus;
}

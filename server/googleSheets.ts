import { google } from "googleapis";

function getAuth() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentialsJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }

  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return auth;
}

export async function getSpreadsheetData(spreadsheetId: string, range: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

export async function getSpreadsheetInfo(spreadsheetId: string) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties",
  });

  return {
    title: response.data.properties?.title || "Untitled",
    sheets: (response.data.sheets || []).map((s) => ({
      title: s.properties?.title || "Sheet",
      sheetId: s.properties?.sheetId,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function listAllSheetData(spreadsheetId: string) {
  const info = await getSpreadsheetInfo(spreadsheetId);
  const results: Record<string, string[][]> = {};

  for (const sheet of info.sheets) {
    const data = await getSpreadsheetData(spreadsheetId, sheet.title);
    results[sheet.title] = data;
  }

  return { title: info.title, sheets: results };
}

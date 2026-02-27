import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, Loader2, Link2, AlertCircle, FileSpreadsheet } from "lucide-react";

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return input.trim();
}

type SheetInfo = {
  title: string;
  sheets: { title: string; sheetId: number; rowCount: number; columnCount: number }[];
};

type SheetData = {
  title: string;
  sheets: Record<string, string[][]>;
};

export default function AdminSheets() {
  const [urlInput, setUrlInput] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const { data: sheetInfo, isLoading: infoLoading, error: infoError } = useQuery<SheetInfo>({
    queryKey: ["/api/admin/sheets/info", spreadsheetId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sheets/info?spreadsheetId=${encodeURIComponent(spreadsheetId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load spreadsheet");
      }
      return res.json();
    },
    enabled: !!spreadsheetId,
    retry: false,
  });

  const { data: sheetData, isLoading: dataLoading } = useQuery<SheetData>({
    queryKey: ["/api/admin/sheets/data", spreadsheetId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/sheets/data?spreadsheetId=${encodeURIComponent(spreadsheetId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load data");
      }
      return res.json();
    },
    enabled: !!spreadsheetId && !!sheetInfo,
    retry: false,
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSpreadsheetId(urlInput);
    if (id) {
      setSpreadsheetId(id);
      setActiveTab("");
    }
  };

  const errorMessage = infoError instanceof Error ? infoError.message : "";

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-sheets">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6" />
          Google Sheets
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Connect and view data from your Google Sheets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Connect a Spreadsheet
          </CardTitle>
          <CardDescription>
            Paste a Google Sheets URL or spreadsheet ID. Make sure the sheet is shared with your service account email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="sheet-url" className="sr-only">Spreadsheet URL or ID</Label>
              <Input
                id="sheet-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID"
                data-testid="input-sheet-url"
              />
            </div>
            <Button type="submit" disabled={!urlInput.trim() || infoLoading} data-testid="button-connect-sheet">
              {infoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Loading...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {errorMessage && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Failed to connect</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                {errorMessage.includes("not configured") && (
                  <p className="text-sm text-muted-foreground mt-2">
                    The Google service account key needs to be added. Contact your system administrator.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {infoLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {sheetInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sheet className="w-4 h-4" />
                {sheetInfo.title}
              </CardTitle>
              <Badge variant="outline">{sheetInfo.sheets.length} sheets</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Loading sheet data...</span>
              </div>
            ) : sheetData ? (
              <Tabs
                value={activeTab || sheetInfo.sheets[0]?.title || ""}
                onValueChange={setActiveTab}
              >
                <TabsList className="mb-4">
                  {sheetInfo.sheets.map((s) => (
                    <TabsTrigger key={s.title} value={s.title} data-testid={`tab-sheet-${s.title}`}>
                      {s.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {sheetInfo.sheets.map((s) => {
                  const rows = sheetData.sheets[s.title] || [];
                  const headers = rows[0] || [];
                  const dataRows = rows.slice(1);

                  return (
                    <TabsContent key={s.title} value={s.title}>
                      {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">This sheet is empty.</p>
                      ) : (
                        <div className="border rounded-md overflow-auto max-h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {headers.map((h, i) => (
                                  <TableHead key={i} className="whitespace-nowrap font-semibold">
                                    {h}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dataRows.map((row, ri) => (
                                <TableRow key={ri}>
                                  {headers.map((_, ci) => (
                                    <TableCell key={ci} className="whitespace-nowrap text-sm">
                                      {row[ci] || ""}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {dataRows.length} rows, {headers.length} columns
                      </p>
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : null}
          </CardContent>
        </Card>
      )}

      {!spreadsheetId && !infoLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Paste a Google Sheets URL above to view its data here.</p>
            <p className="text-sm text-muted-foreground mt-2">
              The spreadsheet must be shared with your Google service account email address.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

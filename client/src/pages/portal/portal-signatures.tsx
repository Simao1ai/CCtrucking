import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PenLine, CheckCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { SignatureRequest } from "@shared/schema";

function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const save = () => {
    if (!canvasRef.current || !hasDrawn) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-medium text-center">Draw your signature below</p>
      <div className="border-2 border-dashed border-primary/30 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: "180px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          data-testid="canvas-signature"
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={clear} className="flex-1 h-12 text-base" data-testid="button-clear-signature">
          Clear
        </Button>
        <Button type="button" onClick={save} disabled={!hasDrawn} className="flex-1 h-12 text-base" data-testid="button-use-signature">
          Use This Signature
        </Button>
      </div>
    </div>
  );
}

export default function PortalSignatures() {
  const { toast } = useToast();
  const [signDoc, setSignDoc] = useState<SignatureRequest | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [step, setStep] = useState<"read" | "sign" | "confirm">("read");

  const { data: signatures = [], isLoading } = useQuery<SignatureRequest[]>({
    queryKey: ["/api/portal/signatures"],
  });

  const signMutation = useMutation({
    mutationFn: async ({ id, signerName, signatureData }: { id: string; signerName: string; signatureData: string }) => {
      await apiRequest("POST", `/api/portal/signatures/${id}/sign`, { signerName, signatureData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/signatures"] });
      setSignDoc(null);
      setSignerName("");
      setSignatureData("");
      setStep("read");
      toast({ title: "Document signed!", description: "Your signature has been recorded. Thank you!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const pending = signatures.filter(s => s.status === "pending");
  const signed = signatures.filter(s => s.status === "signed");

  const openSignDialog = (sig: SignatureRequest) => {
    setSignDoc(sig);
    setStep("read");
    setSignerName("");
    setSignatureData("");
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-signatures">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="w-6 h-6" />
          Documents to Sign
        </h1>
        <p className="text-muted-foreground mt-1">Review and sign documents sent by CC Trucking Services</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : signatures.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No documents to sign right now.</p>
            <p className="text-sm text-muted-foreground mt-1">You'll see documents here when they're sent to you.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Needs Your Signature ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(sig => (
                  <Card key={sig.id} className="border-orange-200 dark:border-orange-800" data-testid={`sig-pending-${sig.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
                            <Clock className="w-7 h-7 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-lg font-semibold">{sig.documentName}</p>
                            {sig.documentDescription && (
                              <p className="text-sm text-muted-foreground mt-0.5">{sig.documentDescription}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent on {format(new Date(sig.sentAt), "MMMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="lg"
                          className="h-14 px-8 text-lg font-semibold shrink-0"
                          onClick={() => openSignDialog(sig)}
                          data-testid={`button-sign-${sig.id}`}
                        >
                          <PenLine className="w-5 h-5 mr-2" />
                          Sign Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {signed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Completed ({signed.length})
              </h2>
              <div className="space-y-3">
                {signed.map(sig => (
                  <Card key={sig.id} data-testid={`sig-signed-${sig.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{sig.documentName}</p>
                            <p className="text-xs text-muted-foreground">
                              Signed by {sig.signerName} on {sig.signedAt ? format(new Date(sig.signedAt), "MMMM d, yyyy") : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">Signed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!signDoc} onOpenChange={(open) => { if (!open) { setSignDoc(null); setStep("read"); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{signDoc?.documentName}</DialogTitle>
          </DialogHeader>
          {signDoc && (
            <div className="space-y-6">
              {step === "read" && (
                <>
                  {signDoc.documentDescription && (
                    <p className="text-sm text-muted-foreground">{signDoc.documentDescription}</p>
                  )}
                  <div className="border rounded-lg p-5 bg-muted/30 whitespace-pre-wrap text-sm leading-relaxed max-h-[300px] overflow-auto">
                    {signDoc.documentContent}
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      Please read the document above carefully. When you're ready, click the button below to add your signature.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-semibold"
                    onClick={() => setStep("sign")}
                    data-testid="button-ready-to-sign"
                  >
                    <PenLine className="w-5 h-5 mr-2" />
                    I've Read It - Ready to Sign
                  </Button>
                </>
              )}

              {step === "sign" && (
                <>
                  <div className="space-y-3">
                    <label className="text-base font-medium">Your Full Name *</label>
                    <Input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Type your full legal name"
                      className="h-12 text-base"
                      data-testid="input-signer-name"
                    />
                  </div>
                  <SignaturePad onSave={(data) => { setSignatureData(data); setStep("confirm"); }} />
                </>
              )}

              {step === "confirm" && (
                <>
                  <div className="text-center space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-base font-medium text-green-800 dark:text-green-200">Ready to submit your signature</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Name: <strong>{signerName}</strong></p>
                      <p className="text-sm text-muted-foreground">Document: <strong>{signDoc.documentName}</strong></p>
                      {signatureData && (
                        <div className="border rounded p-3 bg-white inline-block">
                          <img src={signatureData} alt="Your signature" className="max-h-16" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 text-base"
                      onClick={() => { setSignatureData(""); setStep("sign"); }}
                      data-testid="button-redo-signature"
                    >
                      Redo Signature
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 h-14 text-base font-semibold"
                      onClick={() => signMutation.mutate({ id: signDoc.id, signerName, signatureData })}
                      disabled={!signerName.trim() || signMutation.isPending}
                      data-testid="button-submit-signature"
                    >
                      {signMutation.isPending ? "Submitting..." : "Submit Signature"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

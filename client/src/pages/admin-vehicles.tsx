import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client } from "@shared/schema";
import { Plus, Search, Truck, Wrench, AlertTriangle, CheckCircle, ArrowLeft, Calendar } from "lucide-react";
import { format } from "date-fns";

const VEHICLE_TYPES = ["Tractor", "Trailer", "Straight Truck", "Box Truck", "Flatbed", "Tanker", "Reefer", "Other"];
const VEHICLE_STATUSES = ["active", "inactive", "in_shop", "out_of_service"];
const MAINTENANCE_TYPES = ["Oil Change", "Tire Rotation", "Brake Service", "DOT Inspection", "Engine Repair", "Transmission", "Electrical", "HVAC", "Body Work", "Preventive Maintenance", "Other"];

export default function AdminVehicles() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [form, setForm] = useState({
    clientId: "", unitNumber: "", vin: "", year: "", make: "", model: "",
    vehicleType: "Tractor", licensePlate: "", licensePlateState: "", status: "active",
    lastInspectionDate: "", nextInspectionDue: "", notes: "",
  });
  const [maintForm, setMaintForm] = useState({
    serviceType: "", description: "", serviceDate: "", mileage: "", cost: "", vendor: "", nextServiceDue: "", notes: "",
  });

  const { data: vehiclesData, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/vehicles"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: maintenanceData } = useQuery<any[]>({
    queryKey: ["/api/admin/vehicles", selectedVehicleId, "maintenance"],
    enabled: !!selectedVehicleId,
    queryFn: () => fetch(`/api/admin/vehicles/${selectedVehicleId}/maintenance`, { credentials: "include" }).then(r => r.json()),
  });

  const selectedVehicle = (vehiclesData || []).find(v => v.id === selectedVehicleId);

  const addMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/vehicles", form); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vehicles"] });
      setShowAdd(false);
      setForm({ clientId: "", unitNumber: "", vin: "", year: "", make: "", model: "", vehicleType: "Tractor", licensePlate: "", licensePlateState: "", status: "active", lastInspectionDate: "", nextInspectionDue: "", notes: "" });
      toast({ title: "Vehicle added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/vehicles/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vehicles"] });
      setSelectedVehicleId(null);
      toast({ title: "Vehicle removed" });
    },
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/vehicles/${selectedVehicleId}/maintenance`, maintForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vehicles", selectedVehicleId, "maintenance"] });
      setShowMaintenance(false);
      setMaintForm({ serviceType: "", description: "", serviceDate: "", mileage: "", cost: "", vendor: "", nextServiceDue: "", notes: "" });
      toast({ title: "Maintenance record added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (vehiclesData || []).filter(v => {
    const q = search.toLowerCase();
    return !q || v.unitNumber?.toLowerCase().includes(q) || v.vin?.toLowerCase().includes(q) ||
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q) || v.client?.companyName?.toLowerCase().includes(q);
  });

  if (selectedVehicle) {
    return (
      <div className="p-6 space-y-6" data-testid="page-vehicle-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedVehicleId(null)} data-testid="button-back-vehicles">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-vehicle-title">
              Unit #{selectedVehicle.unitNumber} — {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </h1>
            <p className="text-sm text-muted-foreground">{selectedVehicle.client?.companyName} | VIN: {selectedVehicle.vin || "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 text-sm space-y-2">
              <div><span className="text-muted-foreground">Type:</span> {selectedVehicle.vehicleType}</div>
              <div><span className="text-muted-foreground">License:</span> {selectedVehicle.licensePlate || "—"} {selectedVehicle.licensePlateState}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selectedVehicle.status}</Badge></div>
              <div><span className="text-muted-foreground">Last Inspection:</span> {selectedVehicle.lastInspectionDate ? format(new Date(selectedVehicle.lastInspectionDate), "MM/dd/yyyy") : "—"}</div>
              <div><span className="text-muted-foreground">Next Inspection:</span> {selectedVehicle.nextInspectionDue ? format(new Date(selectedVehicle.nextInspectionDue), "MM/dd/yyyy") : "—"}</div>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" /> Maintenance History</CardTitle>
              <Dialog open={showMaintenance} onOpenChange={setShowMaintenance}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-maintenance"><Plus className="w-3 h-3 mr-1" /> Add Record</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Maintenance Record</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Service Type *</Label>
                      <Select value={maintForm.serviceType} onValueChange={v => setMaintForm(f => ({ ...f, serviceType: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>{MAINTENANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Service Date</Label><Input type="date" value={maintForm.serviceDate} onChange={e => setMaintForm(f => ({ ...f, serviceDate: e.target.value }))} /></div>
                      <div><Label>Mileage</Label><Input type="number" value={maintForm.mileage} onChange={e => setMaintForm(f => ({ ...f, mileage: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Cost ($)</Label><Input type="number" value={maintForm.cost} onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))} /></div>
                      <div><Label>Vendor</Label><Input value={maintForm.vendor} onChange={e => setMaintForm(f => ({ ...f, vendor: e.target.value }))} /></div>
                    </div>
                    <div><Label>Next Service Due</Label><Input type="date" value={maintForm.nextServiceDue} onChange={e => setMaintForm(f => ({ ...f, nextServiceDue: e.target.value }))} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowMaintenance(false)}>Cancel</Button>
                    <Button onClick={() => addMaintenanceMutation.mutate()} disabled={!maintForm.serviceType || addMaintenanceMutation.isPending} data-testid="button-save-maintenance">Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {(maintenanceData || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No maintenance records yet</p>
              ) : (
                <div className="space-y-2">
                  {(maintenanceData || []).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded border text-sm" data-testid={`maintenance-${r.id}`}>
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{r.serviceType}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.serviceDate ? format(new Date(r.serviceDate), "MM/dd/yyyy") : ""} | {r.vendor || "—"} | ${r.cost || "0"}
                        </div>
                      </div>
                      {r.nextServiceDue && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 mr-1" />Next: {format(new Date(r.nextServiceDue), "MM/dd/yy")}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-vehicles">
      <PageHeader title="Vehicles" description="Manage fleet vehicles, inspections, and maintenance" icon={<Truck className="w-5 h-5" />} />

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by unit #, VIN, make, model..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-vehicles" />
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vehicle"><Plus className="w-4 h-4 mr-1" /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Carrier *</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger data-testid="select-vehicle-client"><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                  <SelectContent>{(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Unit # *</Label><Input value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))} data-testid="input-vehicle-unit" /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.vehicleType} onValueChange={v => setForm(f => ({ ...f, vehicleType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Year</Label><Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} maxLength={4} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Make</Label><Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="Peterbilt" /></div>
                <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="579" /></div>
              </div>
              <div><Label>VIN</Label><Input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} maxLength={17} data-testid="input-vehicle-vin" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>License Plate</Label><Input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} /></div>
                <div><Label>Plate State</Label><Input value={form.licensePlateState} onChange={e => setForm(f => ({ ...f, licensePlateState: e.target.value }))} maxLength={2} placeholder="TX" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Last Inspection</Label><Input type="date" value={form.lastInspectionDate} onChange={e => setForm(f => ({ ...f, lastInspectionDate: e.target.value }))} /></div>
                <div><Label>Next Inspection Due</Label><Input type="date" value={form.nextInspectionDue} onChange={e => setForm(f => ({ ...f, nextInspectionDue: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.clientId || !form.unitNumber || addMutation.isPending} data-testid="button-save-vehicle">Add Vehicle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="No vehicles found" description="Add your first vehicle to start tracking your fleet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <Card key={v.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedVehicleId(v.id)} data-testid={`card-vehicle-${v.id}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-lg">Unit #{v.unitNumber}</div>
                    <div className="text-sm text-muted-foreground">{v.year} {v.make} {v.model}</div>
                  </div>
                  <Badge variant={v.status === "active" ? "default" : v.status === "in_shop" ? "secondary" : "outline"}>{v.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{v.client?.companyName}</div>
                  <div>VIN: {v.vin || "N/A"} | {v.vehicleType}</div>
                  {v.nextInspectionDue && (
                    <div className="flex items-center gap-1">
                      {new Date(v.nextInspectionDue) < new Date() ? (
                        <><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-red-500">Inspection overdue</span></>
                      ) : (
                        <><Calendar className="w-3 h-3" />Next inspection: {format(new Date(v.nextInspectionDue), "MM/dd/yyyy")}</>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

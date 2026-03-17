import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, TrendingUp, Users, Activity, Clock, Star, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface EmployeeData {
  id: string;
  name: string;
  username: string;
  role: string;
  totalActions: number;
  last30Actions: number;
  last90Actions: number;
  totalScore: number;
  last30Score: number;
  grade: string;
  actionBreakdown: Record<string, Record<string, number>>;
  entityBreakdown: Record<string, number>;
  weeklyActivity: { week: string; actions: number; score: number }[];
  topEntities: { entity: string; count: number }[];
  recentActivity: { action: string; entityType: string; details: string; createdAt: string }[];
}

const gradeColors: Record<string, string> = {
  "A+": "bg-emerald-500",
  "A": "bg-emerald-400",
  "B+": "bg-blue-500",
  "B": "bg-blue-400",
  "C+": "bg-yellow-500",
  "C": "bg-yellow-400",
  "D": "bg-orange-500",
  "F": "bg-red-500",
};

const gradeTextColors: Record<string, string> = {
  "A+": "text-emerald-600 dark:text-emerald-400",
  "A": "text-emerald-500 dark:text-emerald-400",
  "B+": "text-blue-600 dark:text-blue-400",
  "B": "text-blue-500 dark:text-blue-400",
  "C+": "text-yellow-600 dark:text-yellow-400",
  "C": "text-yellow-500 dark:text-yellow-400",
  "D": "text-orange-600 dark:text-orange-400",
  "F": "text-red-600 dark:text-red-400",
};

const CHART_COLORS = ["hsl(215, 70%, 50%)", "hsl(180, 60%, 45%)", "hsl(140, 60%, 45%)", "hsl(30, 80%, 55%)", "hsl(280, 60%, 55%)", "hsl(350, 70%, 50%)"];

function entityLabel(key: string): string {
  const labels: Record<string, string> = {
    client: "Clients",
    invoice: "Invoices",
    ticket: "Tickets",
    document: "Documents",
    tax_document: "Tax Documents",
    form_template: "Form Templates",
    filled_form: "Filled Forms",
    notarization: "Notarizations",
    service_item: "Service Items",
    signature_request: "Signatures",
  };
  return labels[key] || key;
}

function actionLabel(key: string): string {
  const labels: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    uploaded: "Uploaded",
    downloaded: "Downloaded",
    viewed: "Viewed",
    analyzed: "Analyzed",
    exported: "Exported",
    sent_for_signature: "Sent for Signature",
  };
  return labels[key] || key;
}

function GradeDisplay({ grade, size = "lg" }: { grade: string; size?: "sm" | "lg" }) {
  const sizeClasses = size === "lg" ? "w-16 h-16 text-2xl" : "w-10 h-10 text-base";
  return (
    <div className={`${sizeClasses} ${gradeColors[grade] || "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold shadow-md`} data-testid={`grade-${grade}`}>
      {grade}
    </div>
  );
}

function EmployeeCard({ employee }: { employee: EmployeeData }) {
  const entityData = employee.topEntities.map(e => ({
    name: entityLabel(e.entity),
    value: e.count,
  }));

  return (
    <Card data-testid={`employee-card-${employee.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GradeDisplay grade={employee.grade} />
            <div>
              <CardTitle className="text-lg">{employee.name}</CardTitle>
              <p className="text-sm text-muted-foreground">@{employee.username}</p>
              <Badge variant={employee.role === "owner" ? "default" : "secondary"} className="mt-1">
                {employee.role === "owner" ? "Admin (Owner)" : "Staff"}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" data-testid={`score-${employee.id}`}>{employee.last30Score}</p>
            <p className="text-xs text-muted-foreground">30-day score</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-semibold">{employee.last30Actions}</p>
            <p className="text-xs text-muted-foreground">Last 30 Days</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-semibold">{employee.last90Actions}</p>
            <p className="text-xs text-muted-foreground">Last 90 Days</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <p className="text-lg font-semibold">{employee.totalActions}</p>
            <p className="text-xs text-muted-foreground">All Time</p>
          </div>
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="activity" data-testid={`tab-activity-${employee.id}`}>Activity</TabsTrigger>
            <TabsTrigger value="breakdown" data-testid={`tab-breakdown-${employee.id}`}>Breakdown</TabsTrigger>
            <TabsTrigger value="recent" data-testid={`tab-recent-${employee.id}`}>Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employee.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number, name: string) => [value, name === "score" ? "Score" : "Actions"]}
                  />
                  <Bar dataKey="score" fill="hsl(215, 70%, 50%)" radius={[2, 2, 0, 0]} name="Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-3">
            {entityData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={entityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {entityData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No activity data yet</p>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-3">
            {employee.recentActivity.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {employee.recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm border-b pb-2 last:border-0">
                    <Activity className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{actionLabel(item.action)}</span>
                        {" "}
                        <span className="text-muted-foreground">{entityLabel(item.entityType)}</span>
                      </p>
                      {item.details && (
                        <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function AdminEmployeePerformance() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<{ employees: EmployeeData[] }>({
    queryKey: ["/api/admin/employee-performance"],
    enabled: user?.role === "owner",
  });

  if (user?.role !== "owner") {
    return (
      <div className="flex items-center justify-center h-full" data-testid="access-restricted">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Only owners can view employee performance data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="error-state">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Failed to Load Data</h2>
          <p className="text-sm text-muted-foreground">Could not load employee performance data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const employees = data?.employees || [];
  const topPerformer = employees.length > 0 ? employees[0] : null;
  const totalTeamActions = employees.reduce((s, e) => s + e.last30Actions, 0);
  const avgScore = employees.length > 0 ? Math.round(employees.reduce((s, e) => s + e.last30Score, 0) / employees.length) : 0;

  const teamTrend: { week: string; score: number }[] = [];
  if (employees.length > 0 && employees[0].weeklyActivity.length > 0) {
    for (let i = 0; i < employees[0].weeklyActivity.length; i++) {
      const week = employees[0].weeklyActivity[i].week;
      const totalScore = employees.reduce((s, e) => s + (e.weeklyActivity[i]?.score || 0), 0);
      teamTrend.push({ week, score: totalScore });
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-employee-performance">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-employee-performance">Employee Performance</h1>
        <p className="text-sm text-muted-foreground">Track staff activity, scores, and grades for review meetings</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="metric-team-size">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{employees.length}</p>
                    <p className="text-xs text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-team-actions">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalTeamActions}</p>
                    <p className="text-xs text-muted-foreground">Actions (30 Days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-avg-score">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgScore}</p>
                    <p className="text-xs text-muted-foreground">Avg Score (30 Days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-top-performer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-yellow-500/10">
                    <Award className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate">{topPerformer?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground">Top Performer</p>
                    {topPerformer && (
                      <span className={`text-xs font-semibold ${gradeTextColors[topPerformer.grade]}`}>
                        Grade: {topPerformer.grade}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {teamTrend.length > 0 && (
            <Card data-testid="chart-team-trend">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Team Performance Trend (12 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={teamTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="hsl(215, 70%, 50%)" strokeWidth={2} dot={{ r: 3 }} name="Team Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Individual Performance</h2>
            </div>

            <Card className="mb-4 p-4" data-testid="grading-legend">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Grading Scale (30-Day Score)</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { grade: "A+", range: "500+" },
                  { grade: "A", range: "350-499" },
                  { grade: "B+", range: "250-349" },
                  { grade: "B", range: "150-249" },
                  { grade: "C+", range: "80-149" },
                  { grade: "C", range: "40-79" },
                  { grade: "D", range: "15-39" },
                  { grade: "F", range: "< 15" },
                ].map(({ grade, range }) => (
                  <div key={grade} className="flex items-center gap-1.5">
                    <GradeDisplay grade={grade} size="sm" />
                    <span className="text-xs text-muted-foreground">{range}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {employees.map(emp => (
                <EmployeeCard key={emp.id} employee={emp} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Download, History, LogOut, Search, Send, Tag, User,
  Zap, ChevronRight, Clock, CheckCircle2, XCircle, Mail, Building2, Phone
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import MobileBottomNav, { type UserTab } from "@/components/MobileBottomNav";
import { cn } from "@/lib/utils";

interface DownloadRecord {
  id: string;
  lead_count: number;
  promo_code: string;
  downloaded_at: string;
  filters: Record<string, string> | null;
}

interface PromoCodeDetails {
  id: string;
  code: string;
  total_leads: number;
  gender: "male" | "female" | "mix";
  language: "gujarati" | "hindi" | "mix";
  is_used: boolean;
  created_at: string;
}

interface LeadRequestRecord {
  id: string;
  requested_leads: number;
  gender: "male" | "female" | "mix";
  language: "gujarati" | "hindi" | "mix";
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ProfileData {
  full_name: string;
  email: string;
  mobile_number: string;
  company_name: string;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<UserTab>("dashboard");
  const [promoCode, setPromoCode] = useState("");
  const [promoDetails, setPromoDetails] = useState<PromoCodeDetails | null>(null);
  const [assignedCodes, setAssignedCodes] = useState<PromoCodeDetails[]>([]);
  const [requestLeadCount, setRequestLeadCount] = useState("10");
  const [requestGender, setRequestGender] = useState<"male" | "female" | "mix">("mix");
  const [requestLanguage, setRequestLanguage] = useState<"gujarati" | "hindi" | "mix">("mix");
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [requests, setRequests] = useState<LeadRequestRecord[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadHistory = async () => {
    const { data } = await supabase.from("download_history").select("*").order("downloaded_at", { ascending: false });
    setHistory((data as DownloadRecord[]) || []);
  };

  const loadRequests = async () => {
    const { data } = await supabase.from("lead_requests" as any).select("id, requested_leads, gender, language, status, created_at").order("created_at", { ascending: false });
    setRequests((data as unknown as LeadRequestRecord[]) || []);
  };

  const loadAssignedCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("id, code, total_leads, gender, language, is_used, created_at").order("created_at", { ascending: false });
    setAssignedCodes((data as PromoCodeDetails[]) || []);
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, email, mobile_number, company_name").eq("user_id", user.id).maybeSingle();
    if (data) setProfile(data);
  };

  useEffect(() => {
    loadHistory();
    loadRequests();
    loadAssignedCodes();
    loadProfile();
  }, []);

  const fetchPromoCodeDetails = async () => {
    const trimmedCode = promoCode.trim();
    if (!trimmedCode) {
      setPromoDetails(null);
      toast({ title: "Promo code required", description: "Enter a promo code first.", variant: "destructive" });
      return;
    }
    setDetailsLoading(true);
    const { data, error } = await supabase.from("promo_codes").select("id, code, total_leads, gender, language, is_used, created_at").eq("code", trimmedCode).maybeSingle();
    setDetailsLoading(false);
    if (error || !data) {
      setPromoDetails(null);
      toast({ title: "Invalid promo code", description: "Code not found.", variant: "destructive" });
      return;
    }
    const details = data as PromoCodeDetails;
    setPromoDetails(details);
    if (details.is_used) {
      toast({ title: "Already used", description: "This promo code has already been used.", variant: "destructive" });
      return;
    }
    toast({ title: "Promo loaded", description: "Review details and download." });
  };

  const handleDownload = async () => {
    if (!promoCode.trim()) {
      toast({ title: "Promo code required", description: "Enter your promo code.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: leads, error } = await supabase.rpc("consume_promo_code_for_download" as any, { p_promo_code: promoCode.trim() });
      if (error || !leads || (leads as any[]).length === 0) {
        toast({ title: "Download failed", description: error?.message || "Could not process.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const csvHeader = "full_name,phone_number,city,state,gender,language\n";
      const leadsArr = leads as any[];
      const csvRows = leadsArr.map((l: any) => `"${l.full_name}","${l.phone_number}","${l.city}","${l.state}","${l.gender || "-"}","${l.language || "-"}"`).join("\n");
      const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Success!", description: `Downloaded ${leadsArr.length} leads.` });
      setPromoCode("");
      setPromoDetails(null);
      loadHistory();
      loadAssignedCodes();
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCreateLeadRequest = async () => {
    const count = parseInt(requestLeadCount, 10);
    if (!count || count < 1) {
      toast({ title: "Invalid", description: "Enter a valid lead count.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Not logged in", variant: "destructive" });
      return;
    }
    setRequesting(true);
    const { error } = await supabase.from("lead_requests" as any).insert({ user_id: user.id, requested_leads: count, gender: requestGender, language: requestLanguage });
    setRequesting(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted", description: "Admin will review your request." });
    setRequestLeadCount("10");
    setRequestGender("mix");
    setRequestLanguage("mix");
    loadRequests();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const unusedCodes = assignedCodes.filter((c) => !c.is_used);

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-green-100 text-green-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">ShreeLead</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Desktop Tab Bar */}
      <div className="hidden md:block border-b bg-card">
        <div className="container flex gap-1 overflow-x-auto py-2">
          {(["dashboard", "download", "requests", "history", "profile"] as UserTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="container py-4 md:py-6">
        <div className="mx-auto max-w-lg space-y-4">

          {/* ─── Dashboard Tab ─── */}
          {activeTab === "dashboard" && (
            <>
              {/* Welcome */}
              <div className="space-y-1">
                <h1 className="text-xl font-bold">Welcome back{profile ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋</h1>
                <p className="text-sm text-muted-foreground">Here's your lead activity overview</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="flex flex-col items-center p-4">
                    <span className="text-2xl font-bold">{history.length}</span>
                    <span className="text-[11px] text-muted-foreground">Downloads</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-col items-center p-4">
                    <span className="text-2xl font-bold">{unusedCodes.length}</span>
                    <span className="text-[11px] text-muted-foreground">Active Codes</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-col items-center p-4">
                    <span className="text-2xl font-bold">{requests.filter(r => r.status === "pending").length}</span>
                    <span className="text-[11px] text-muted-foreground">Pending</span>
                  </CardContent>
                </Card>
              </div>

              {/* Notification */}
              {unusedCodes.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Bell className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">You have {unusedCodes.length} unused promo code{unusedCodes.length > 1 ? "s" : ""}</p>
                        <div className="flex flex-wrap gap-2">
                          {unusedCodes.slice(0, 3).map((c) => (
                            <Badge key={c.id} variant="secondary" className="text-xs">{c.code}</Badge>
                          ))}
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setActiveTab("download")}>
                          Download Now <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-14 flex-col gap-1 text-sm" onClick={() => setActiveTab("download")}>
                  <Download className="h-5 w-5 text-primary" />
                  Download Leads
                </Button>
                <Button variant="outline" className="h-14 flex-col gap-1 text-sm" onClick={() => setActiveTab("requests")}>
                  <Send className="h-5 w-5 text-primary" />
                  Request Leads
                </Button>
              </div>
            </>
          )}

          {/* ─── Download Tab ─── */}
          {activeTab === "download" && (
            <>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="h-5 w-5 text-primary" />
                    Download Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="promoCode">Promo Code</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="promoCode"
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value); setPromoDetails(null); }}
                          className="h-12 pl-10 text-base rounded-xl"
                        />
                      </div>
                      <Button variant="outline" onClick={fetchPromoCodeDetails} disabled={detailsLoading} className="h-12 rounded-xl px-4">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {promoDetails && (
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                      <p className="font-medium text-sm">Promo Details</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-card p-2 shadow-sm">
                          <p className="text-lg font-bold">{promoDetails.total_leads}</p>
                          <p className="text-[10px] text-muted-foreground">Leads</p>
                        </div>
                        <div className="rounded-lg bg-card p-2 shadow-sm">
                          <p className="text-sm font-bold capitalize">{promoDetails.gender}</p>
                          <p className="text-[10px] text-muted-foreground">Gender</p>
                        </div>
                        <div className="rounded-lg bg-card p-2 shadow-sm">
                          <p className="text-sm font-bold capitalize">{promoDetails.language}</p>
                          <p className="text-[10px] text-muted-foreground">Language</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleDownload}
                    disabled={loading || !promoCode.trim() || (promoDetails?.is_used ?? false)}
                    className="h-14 w-full text-base rounded-xl shadow-md"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {loading ? "Processing..." : "Download Leads"}
                  </Button>
                </CardContent>
              </Card>

              {/* My Promo Codes */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="h-5 w-5 text-primary" />
                    My Promo Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {assignedCodes.map((c) => (
                      <div key={c.id} className="rounded-xl border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <code className="bg-secondary px-2.5 py-1 rounded-lg text-sm font-mono font-semibold">{c.code}</code>
                          <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-medium", c.is_used ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                            {c.is_used ? "Used" : "Unused"}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Leads: <strong className="text-foreground">{c.total_leads}</strong></span>
                          <span>Gender: <strong className="text-foreground capitalize">{c.gender}</strong></span>
                          <span>Lang: <strong className="text-foreground capitalize">{c.language}</strong></span>
                        </div>
                      </div>
                    ))}
                    {assignedCodes.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No promo codes assigned yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── Requests Tab ─── */}
          {activeTab === "requests" && (
            <>
              {/* Request Form */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Send className="h-5 w-5 text-primary" />
                    Request Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Leads</Label>
                    <Input
                      type="number"
                      min="1"
                      value={requestLeadCount}
                      onChange={(e) => setRequestLeadCount(e.target.value)}
                      className="h-12 text-base rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["male", "female", "mix"] as const).map((g) => (
                        <Button
                          key={g}
                          type="button"
                          variant={requestGender === g ? "default" : "outline"}
                          className="h-11 rounded-xl capitalize"
                          onClick={() => setRequestGender(g)}
                        >
                          {g}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["gujarati", "hindi", "mix"] as const).map((l) => (
                        <Button
                          key={l}
                          type="button"
                          variant={requestLanguage === l ? "default" : "outline"}
                          className="h-11 rounded-xl capitalize"
                          onClick={() => setRequestLanguage(l)}
                        >
                          {l}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleCreateLeadRequest} disabled={requesting} className="h-14 w-full text-base rounded-xl shadow-md">
                    <Send className="mr-2 h-5 w-5" />
                    {requesting ? "Submitting..." : "Send Request"}
                  </Button>
                </CardContent>
              </Card>

              {/* Request History */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">My Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {requests.map((r) => (
                      <div key={r.id} className="rounded-xl border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon(r.status)}
                            <span className="text-sm font-medium">{r.requested_leads} leads</span>
                          </div>
                          <span className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-medium capitalize", statusColor(r.status))}>
                            {r.status}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>Gender: <strong className="capitalize text-foreground">{r.gender}</strong></span>
                          <span>Lang: <strong className="capitalize text-foreground">{r.language}</strong></span>
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {requests.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No requests yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── History Tab ─── */}
          {activeTab === "history" && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-primary" />
                  Download History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {history.map((h) => (
                    <div key={h.id} className="rounded-xl border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{h.lead_count} leads</span>
                        <span className="text-xs text-muted-foreground">{new Date(h.downloaded_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <code className="rounded-lg bg-secondary px-2 py-0.5">{h.promo_code}</code>
                        {h.filters && Object.entries(h.filters).map(([k, v]) => (
                          <span key={k} className="rounded-lg bg-accent px-2 py-0.5">{k}: {v}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No downloads yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Profile Tab ─── */}
          {activeTab === "profile" && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  My Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-3 pb-4 border-b">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{profile?.full_name || "User"}</h3>
                    <p className="text-sm text-muted-foreground">{profile?.company_name || "-"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{profile?.email || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Mobile</p>
                      <p className="text-sm font-medium">{profile?.mobile_number || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Company</p>
                      <p className="text-sm font-medium">{profile?.company_name || "-"}</p>
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-12 w-full rounded-xl text-base">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

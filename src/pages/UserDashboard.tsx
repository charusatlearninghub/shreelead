import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Bell, Download, History, LogOut, Search, Send, Tag, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

export default function UserDashboard() {
  const { user } = useAuth();
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadHistory = async () => {
    const { data } = await supabase
      .from("download_history")
      .select("*")
      .order("downloaded_at", { ascending: false });
    setHistory((data as DownloadRecord[]) || []);
  };

  const loadRequests = async () => {
    const { data } = await supabase
      .from("lead_requests")
      .select("id, requested_leads, gender, language, status, created_at")
      .order("created_at", { ascending: false });
    setRequests((data as LeadRequestRecord[]) || []);
  };

  const loadAssignedCodes = async () => {
    const { data } = await supabase
      .from("promo_codes")
      .select("id, code, total_leads, gender, language, is_used, created_at")
      .order("created_at", { ascending: false });
    setAssignedCodes((data as PromoCodeDetails[]) || []);
  };

  useEffect(() => {
    loadHistory();
    loadRequests();
    loadAssignedCodes();
  }, []);

  const fetchPromoCodeDetails = async () => {
    const trimmedCode = promoCode.trim();
    if (!trimmedCode) {
      setPromoDetails(null);
      toast({ title: "Promo code required", description: "Enter a promo code first.", variant: "destructive" });
      return;
    }

    setDetailsLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("id, code, total_leads, gender, language, is_used, created_at")
      .eq("code", trimmedCode)
      .maybeSingle();
    setDetailsLoading(false);

    if (error || !data) {
      setPromoDetails(null);
      toast({
        title: "Invalid promo code",
        description: "Code not found or not assigned to your account.",
        variant: "destructive",
      });
      return;
    }

    const details = data as PromoCodeDetails;
    setPromoDetails(details);

    if (details.is_used) {
      toast({ title: "Promo already used", description: "This promo code has already been used.", variant: "destructive" });
      return;
    }

    toast({ title: "Promo loaded", description: "Review the assigned details and download." });
  };

  const handleDownload = async () => {
    if (!promoCode.trim()) {
      toast({ title: "Promo code required", description: "Enter your promo code.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: leads, error } = await supabase.rpc("consume_promo_code_for_download", {
        p_promo_code: promoCode.trim(),
      });

      if (error || !leads || leads.length === 0) {
        toast({
          title: "Download failed",
          description: error?.message || "Could not process this promo code.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const csvHeader = "full_name,phone_number,city,state,gender,language\n";
      const csvRows = leads
        .map(
          (l) =>
            `"${l.full_name}","${l.phone_number}","${l.city}","${l.state}","${l.gender || "-"}","${l.language || "-"}"`
        )
        .join("\n");
      const csv = csvHeader + csvRows;

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success!", description: `Downloaded ${leads.length} leads.` });
      setPromoCode("");
      setPromoDetails(null);
      loadHistory();
      loadAssignedCodes();
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Error", description: "Something went wrong during download.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleCreateLeadRequest = async () => {
    const requestedLeads = parseInt(requestLeadCount, 10);
    if (!requestedLeads || requestedLeads < 1) {
      toast({ title: "Invalid request", description: "Enter a valid lead count.", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Not logged in", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    setRequesting(true);
    const { error } = await supabase.from("lead_requests").insert({
      user_id: user.id,
      requested_leads: requestedLeads,
      gender: requestGender,
      language: requestLanguage,
    });
    setRequesting(false);

    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Request submitted", description: "Admin will review your lead request." });
    setRequestLeadCount("10");
    setRequestGender("mix");
    setRequestLanguage("mix");
    loadRequests();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Lead Download</h1>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
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

      <main className="container py-6 md:py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          {assignedCodes.some((code) => !code.is_used) && (
            <Card className="border-primary/30 bg-primary/5 animate-fade-in">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="space-y-2">
                    <p className="font-medium">You have received a new promo code from admin.</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedCodes
                        .filter((code) => !code.is_used)
                        .slice(0, 3)
                        .map((code) => (
                          <Badge key={code.id} variant="secondary">
                            {code.code}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Download Leads
              </CardTitle>
              <CardDescription>Enter your assigned promo code to download admin-approved leads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="promoCode"
                      placeholder="Enter your promo code"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoDetails(null);
                      }}
                      className="h-12 pl-10 text-base"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fetchPromoCodeDetails}
                    disabled={detailsLoading}
                    className="h-12"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {detailsLoading ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>

              {promoDetails && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                  <p className="font-medium">Promo Code Details</p>
                  <p className="text-sm text-muted-foreground">
                    Total Leads: <span className="font-medium text-foreground">{promoDetails.total_leads}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Gender: <span className="font-medium capitalize text-foreground">{promoDetails.gender}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Language: <span className="font-medium capitalize text-foreground">{promoDetails.language}</span>
                  </p>
                </div>
              )}

              <Button
                onClick={handleDownload}
                disabled={loading || !promoCode.trim() || (promoDetails?.is_used ?? false)}
                className="h-12 w-full text-base"
              >
                <Download className="mr-2 h-5 w-5" />
                {loading ? "Processing..." : "Download Leads"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Request Leads
              </CardTitle>
              <CardDescription>Send a lead request to admin. Promo code is generated after approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestLeads">Number of Leads</Label>
                <Input
                  id="requestLeads"
                  type="number"
                  min="1"
                  value={requestLeadCount}
                  onChange={(e) => setRequestLeadCount(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    className="h-12 w-full rounded-md border bg-background px-3 text-base"
                    value={requestGender}
                    onChange={(e) => setRequestGender(e.target.value as "male" | "female" | "mix")}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="mix">Mix</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <select
                    className="h-12 w-full rounded-md border bg-background px-3 text-base"
                    value={requestLanguage}
                    onChange={(e) => setRequestLanguage(e.target.value as "gujarati" | "hindi" | "mix")}
                  >
                    <option value="gujarati">Gujarati</option>
                    <option value="hindi">Hindi</option>
                    <option value="mix">Mix</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleCreateLeadRequest} disabled={requesting} className="h-12 w-full text-base">
                <Send className="mr-2 h-4 w-4" />
                {requesting ? "Submitting..." : "Submit Request"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {requests.map((req) => (
                  <div key={req.id} className="space-y-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{req.requested_leads} leads</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          req.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : req.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Gender: {req.gender}</span>
                      <span>Language: {req.language}</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No lead requests yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" />
                Download History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="space-y-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{h.lead_count} leads</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.downloaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <code className="rounded bg-secondary px-1.5 py-0.5">{h.promo_code}</code>
                      {h.filters &&
                        Object.entries(h.filters).map(([k, v]) => (
                          <span key={k} className="rounded bg-accent px-1.5 py-0.5">
                            {k}: {v}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No downloads yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

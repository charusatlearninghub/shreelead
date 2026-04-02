import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Download, Tag, LogOut, User, Filter, History } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DownloadRecord {
  id: string;
  lead_count: number;
  promo_code: string;
  downloaded_at: string;
  filters: Record<string, string> | null;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [leadCount, setLeadCount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("download_history")
      .select("*")
      .order("downloaded_at", { ascending: false });
    setHistory((data as DownloadRecord[]) || []);
  };

  const handleDownload = async () => {
    const count = parseInt(leadCount);
    if (!count || count < 1) {
      toast({ title: "Invalid count", description: "Enter a valid number of leads.", variant: "destructive" });
      return;
    }
    if (!promoCode.trim()) {
      toast({ title: "Promo code required", description: "Enter a valid promo code.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Validate promo code
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.trim())
        .is("used_by", null)
        .single();

      if (promoError || !promo) {
        toast({ title: "Invalid promo code", description: "This promo code is invalid or already used.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Build query with filters
      let query = supabase
        .from("leads")
        .select("*")
        .eq("status", "new")
        .order("uploaded_at", { ascending: false })
        .limit(count);

      if (genderFilter !== "all") {
        query = query.eq("gender", genderFilter);
      }
      if (cityFilter.trim()) {
        query = query.ilike("city", `%${cityFilter.trim()}%`);
      }
      if (stateFilter.trim()) {
        query = query.ilike("state", `%${stateFilter.trim()}%`);
      }

      const { data: leads, error: leadsError } = await query;

      if (leadsError || !leads || leads.length === 0) {
        toast({ title: "No leads available", description: "No leads match your filters.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Mark promo as used
      await supabase
        .from("promo_codes")
        .update({ used_by: user!.id, used_at: new Date().toISOString() })
        .eq("id", promo.id);

      // Mark leads as sold
      const leadIds = leads.map(l => l.id);
      for (const id of leadIds) {
        await supabase
          .from("leads")
          .update({ status: "sold", sold_to: user!.id, sold_at: new Date().toISOString() })
          .eq("id", id);
      }

      // Save download history
      const filters: Record<string, string> = {};
      if (genderFilter !== "all") filters.gender = genderFilter;
      if (cityFilter.trim()) filters.city = cityFilter.trim();
      if (stateFilter.trim()) filters.state = stateFilter.trim();

      await supabase.from("download_history").insert({
        user_id: user!.id,
        lead_count: leads.length,
        promo_code: promoCode.trim(),
        filters: Object.keys(filters).length > 0 ? filters : null,
      });

      // Generate CSV
      const csvHeader = "full_name,phone_number,city,state,gender\n";
      const csvRows = leads.map(l =>
        `"${l.full_name}","${l.phone_number}","${l.city}","${l.state}","${(l as any).gender || '-'}"`
      ).join("\n");
      const csv = csvHeader + csvRows;

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Success!", description: `Downloaded ${leads.length} leads.` });
      setLeadCount("");
      setPromoCode("");
      loadHistory();
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
    setLoading(false);
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
        <div className="mx-auto max-w-lg space-y-6">
          {/* Download Card */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Download Leads
              </CardTitle>
              <CardDescription>
                Enter the number of leads, apply filters, and use your promo code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="leadCount">Number of Leads</Label>
                <Input
                  id="leadCount"
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={leadCount}
                  onChange={(e) => setLeadCount(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              {/* Filters */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters (optional)
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Gender</Label>
                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">City</Label>
                    <Input
                      placeholder="Any city"
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State</Label>
                    <Input
                      placeholder="Any state"
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promoCode">Promo Code</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="promoCode"
                    placeholder="Enter your promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="h-12 pl-10 text-base"
                  />
                </div>
              </div>
              <Button
                onClick={handleDownload}
                disabled={loading}
                className="w-full h-12 text-base"
              >
                <Download className="mr-2 h-5 w-5" />
                {loading ? "Processing..." : "Download Leads"}
              </Button>
            </CardContent>
          </Card>

          {/* Download History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-primary" />
                Download History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{h.lead_count} leads</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.downloaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <code className="bg-secondary px-1.5 py-0.5 rounded">{h.promo_code}</code>
                      {h.filters && Object.entries(h.filters).map(([k, v]) => (
                        <span key={k} className="bg-accent px-1.5 py-0.5 rounded">{k}: {v}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No downloads yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

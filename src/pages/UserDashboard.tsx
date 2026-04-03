import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Download, Tag, LogOut, User, History } from "lucide-react";
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
  const [genderFilter, setGenderFilter] = useState<"male" | "female" | "mix">("mix");
  const [languageFilter, setLanguageFilter] = useState<"gujarati" | "hindi" | "mix">("mix");
  const [availableLeads, setAvailableLeads] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countingLeads, setCountingLeads] = useState(false);
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
    countAvailableLeads("mix", "mix");
  }, []);

  useEffect(() => {
    countAvailableLeads(genderFilter, languageFilter);
  }, [genderFilter, languageFilter]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("download_history")
      .select("*")
      .order("downloaded_at", { ascending: false });
    setHistory((data as DownloadRecord[]) || []);
  };

  const countAvailableLeads = async (gender: "male" | "female" | "mix", language: "gujarati" | "hindi" | "mix") => {
    setCountingLeads(true);
    try {
      let query = supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      // Apply gender filter
      if (gender !== "mix") {
        query = query.eq("gender", gender);
      }

      // Apply language filter
      if (language !== "mix") {
        query = query.eq("language", language);
      } else {
        // For "mix", include both gujarati and hindi
        query = query.in("language", ["gujarati", "hindi", "mix"]);
      }

      const { count } = await query;
      setAvailableLeads(count || 0);
    } catch (err) {
      console.error("Error counting leads:", err);
      setAvailableLeads(0);
    } finally {
      setCountingLeads(false);
    }
  };

  const handleDownload = async () => {
    const count = parseInt(leadCount);
    if (!count || count < 1) {
      toast({ title: "Invalid count", description: "Enter a valid number of leads.", variant: "destructive" });
      return;
    }
    if (count > availableLeads) {
      toast({ 
        title: "Insufficient leads", 
        description: `Requested number of leads exceeds the available leads. Available: ${availableLeads}`,
        variant: "destructive" 
      });
      return;
    }
    if (!promoCode.trim()) {
      toast({ title: "Promo code required", description: "Enter a valid promo code.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // First, check if promo code exists (don't filter by is_used yet)
      const { data: allPromos, error: checkError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.trim());

      if (checkError || !allPromos || allPromos.length === 0) {
        toast({ title: "Invalid promo code", description: "The promo code does not exist.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const promo = allPromos[0];

      // Check if the promo code has already been used
      if (promo.is_used || promo.used_by !== null) {
        toast({ 
          title: "Promo code already used", 
          description: "This promo code has already been used and cannot be reused.",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Build query with gender and language filters
      let query = supabase
        .from("leads")
        .select("*")
        .eq("status", "new")
        .order("uploaded_at", { ascending: false })
        .limit(count);

      // Apply gender filter
      if (genderFilter !== "mix") {
        query = query.eq("gender", genderFilter);
      }

      // Apply language filter
      if (languageFilter !== "mix") {
        query = query.eq("language", languageFilter);
      } else {
        // For "mix", include both gujarati and hindi
        query = query.in("language", ["gujarati", "hindi", "mix"]);
      }

      const { data: leads, error: leadsError } = await query;

      if (leadsError || !leads || leads.length === 0) {
        toast({ title: "No leads available", description: "No leads match your filters.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Mark promo as used - set both is_used flag and tracking fields
      const { error: updatePromoError } = await supabase
        .from("promo_codes")
        .update({ 
          used_by: user!.id, 
          used_at: new Date().toISOString() 
        })
        .eq("id", promo.id);

      if (updatePromoError) {
        console.error("Promo update error:", updatePromoError);
        toast({ title: "Error", description: "Failed to mark promo code as used.", variant: "destructive" });
        setLoading(false);
        return;
      }

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
      if (genderFilter !== "mix") {
        filters.gender = genderFilter;
      } else {
        filters.gender = "mix";
      }
      if (languageFilter !== "mix") {
        filters.language = languageFilter;
      } else {
        filters.language = "mix";
      }

      await supabase.from("download_history").insert({
        user_id: user!.id,
        lead_count: leads.length,
        promo_code: promoCode.trim(),
        filters: filters,
      });

      // Generate CSV
      const csvHeader = "full_name,phone_number,city,state,gender,language\n";
      const csvRows = leads.map(l =>
        `"${l.full_name}","${l.phone_number}","${l.city}","${l.state}","${(l as any).gender || '-'}","${(l as any).language || '-'}"`
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
      countAvailableLeads(genderFilter, languageFilter);
    } catch (err) {
      console.error("Download error:", err);
      toast({ title: "Error", description: "Something went wrong during download.", variant: "destructive" });
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
                Select a language, enter lead count, and use your promo code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Gender Filter Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <Label className="block text-sm font-medium">Lead Gender</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <Button
                    onClick={() => setGenderFilter("male")}
                    variant={genderFilter === "male" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Male
                  </Button>
                  <Button
                    onClick={() => setGenderFilter("female")}
                    variant={genderFilter === "female" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Female
                  </Button>
                  <Button
                    onClick={() => setGenderFilter("mix")}
                    variant={genderFilter === "mix" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Mix
                  </Button>
                </div>
              </div>

              {/* Language Filter Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <Label className="block text-sm font-medium">Lead Language</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <Button
                    onClick={() => setLanguageFilter("gujarati")}
                    variant={languageFilter === "gujarati" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Gujarati
                  </Button>
                  <Button
                    onClick={() => setLanguageFilter("hindi")}
                    variant={languageFilter === "hindi" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Hindi
                  </Button>
                  <Button
                    onClick={() => setLanguageFilter("mix")}
                    variant={languageFilter === "mix" ? "default" : "outline"}
                    className="flex-1 h-12 text-base font-medium"
                  >
                    Mix
                  </Button>
                </div>
              </div>

              {/* Available Leads Counter */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Available Leads: <span className="text-lg font-bold">{countingLeads ? "..." : availableLeads}</span>
                </p>
              </div>

              {/* Number of Leads Input */}
              <div className="space-y-2">
                <Label htmlFor="leadCount">Number of Leads</Label>
                <Input
                  id="leadCount"
                  type="number"
                  min="1"
                  max={availableLeads}
                  placeholder={`e.g. 10 (max: ${availableLeads})`}
                  value={leadCount}
                  onChange={(e) => setLeadCount(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              {/* Promo Code Input */}
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

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={loading || availableLeads === 0}
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

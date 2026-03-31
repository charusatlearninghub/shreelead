import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Download, Tag, LogOut, User } from "lucide-react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [leadCount, setLeadCount] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Get leads (LIFO - latest first)
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "new")
        .order("uploaded_at", { ascending: false })
        .limit(count);

      if (leadsError || !leads || leads.length === 0) {
        toast({ title: "No leads available", description: "There are no new leads available for download.", variant: "destructive" });
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

      // Generate CSV
      const csvHeader = "full_name,phone_number,city,state\n";
      const csvRows = leads.map(l => 
        `"${l.full_name}","${l.phone_number}","${l.city}","${l.state}"`
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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-6 md:py-10">
        <div className="mx-auto max-w-lg">
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Download Leads
              </CardTitle>
              <CardDescription>
                Enter the number of leads you want and your promo code
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
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Database, Tag, Upload, LogOut, Shield, Plus,
  FileSpreadsheet, BarChart3, TrendingUp, CheckCircle
} from "lucide-react";

interface LeadStats {
  newLeads: number;
  soldLeads: number;
}

interface PromoCodeRow {
  id: string;
  code: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  user_email?: string;
}

interface ProfileRow {
  full_name: string;
  mobile_number: string;
  email: string;
  company_name: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<LeadStats>({ newLeads: 0, soldLeads: 0 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([]);
  const [promoCount, setPromoCount] = useState("1");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    // Stats
    const { count: newCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new");
    const { count: soldCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "sold");
    setStats({ newLeads: newCount || 0, soldLeads: soldCount || 0 });

    // Users
    const { data: profileData, count: userCount } = await supabase
      .from("profiles")
      .select("full_name, mobile_number, email, company_name", { count: "exact" });
    setProfiles(profileData || []);
    setTotalUsers(userCount || 0);

    // Promo codes
    const { data: promoData } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Resolve user emails for used promo codes
    const enriched: PromoCodeRow[] = [];
    for (const p of promoData || []) {
      let userEmail = "";
      if (p.used_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", p.used_by)
          .single();
        userEmail = profile?.email || "Unknown";
      }
      enriched.push({ ...p, user_email: userEmail });
    }
    setPromoCodes(enriched);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generatePromoCodes = async () => {
    const count = parseInt(promoCount) || 1;
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        code: `PROMO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });
    }
    const { error } = await supabase.from("promo_codes").insert(codes);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Generated ${count} promo code(s).` });
      loadData();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const header = lines[0].toLowerCase();
      
      // Parse CSV
      const leads: { full_name: string; phone_number: string; city: string; state: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        leads.push({
          full_name: cols[0] || "-",
          phone_number: cols[1] || "-",
          city: cols[2] || "-",
          state: cols[3] || "-",
        });
      }

      if (leads.length === 0) {
        toast({ title: "No data", description: "The file contains no lead data.", variant: "destructive" });
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("leads").insert(leads);
      if (error) {
        toast({ title: "Upload error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Uploaded!", description: `${leads.length} leads added to New Data.` });
        loadData();
      }
    } catch {
      toast({ title: "Error", description: "Failed to parse file.", variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const promoUsedCount = promoCodes.filter(p => p.used_by).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4 mb-6">
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={Database} label="New Leads" value={stats.newLeads} />
          <StatCard icon={TrendingUp} label="Sold Leads" value={stats.soldLeads} />
          <StatCard icon={Tag} label="Promos Generated" value={promoCodes.length} />
          <StatCard icon={CheckCircle} label="Promos Used" value={promoUsedCount} />
        </div>

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="leads" className="text-xs md:text-sm">
              <Upload className="mr-1 h-4 w-4 hidden md:inline" />Leads
            </TabsTrigger>
            <TabsTrigger value="promos" className="text-xs md:text-sm">
              <Tag className="mr-1 h-4 w-4 hidden md:inline" />Promos
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm">
              <Users className="mr-1 h-4 w-4 hidden md:inline" />Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Upload Lead Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>New: <strong className="text-foreground">{stats.newLeads}</strong></span>
                  <span className="mx-1">•</span>
                  <span>Sold: <strong className="text-foreground">{stats.soldLeads}</strong></span>
                </div>
                <div>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 hover:border-primary/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload CSV file"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Columns: full_name, phone_number, city, state
                    </span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-primary" />
                  Promo Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={promoCount}
                    onChange={(e) => setPromoCount(e.target.value)}
                    className="w-24 h-12"
                    placeholder="Count"
                  />
                  <Button onClick={generatePromoCodes} className="h-12">
                    <Plus className="mr-2 h-4 w-4" />
                    Generate
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {promoCodes.map((p) => (
                    <div key={p.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-xs bg-secondary px-2 py-1 rounded">{p.code}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.used_by ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                          {p.used_by ? "Used" : "Available"}
                        </span>
                      </div>
                      {p.used_by && (
                        <p className="text-xs text-muted-foreground">
                          Used by {p.user_email} on {new Date(p.used_at!).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                  {promoCodes.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No promo codes yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Registered Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profiles.map((p, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-1">
                      <p className="font-medium text-sm">{p.full_name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{p.email}</span>
                        <span>{p.mobile_number}</span>
                        <span>{p.company_name}</span>
                      </div>
                    </div>
                  ))}
                  {profiles.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No users registered yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, Database, Tag, Upload, LogOut, Shield, Plus, Trash2,
  FileSpreadsheet, BarChart3, TrendingUp, CheckCircle, History, Loader2
} from "lucide-react";
import { buildLeadInsertPayload, normalizeGender, normalizeLanguage, parseLeadsFromFile } from "@/lib/leadUpload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeadStats {
  newLeads: number;
  soldLeads: number;
}

interface PromoCodeRow {
  id: string;
  code: string;
  is_used: boolean;
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

interface DownloadHistoryRow {
  id: string;
  user_id: string;
  lead_count: number;
  promo_code: string;
  downloaded_at: string;
  filters: Record<string, string> | null;
  user_email?: string;
  user_name?: string;
}

interface ManualLeadForm {
  fullName: string;
  phoneNumber: string;
  city: string;
  state: string;
  gender: "male" | "female" | "mix";
  language: "gujarati" | "hindi" | "mix";
}

const LEADS_TABLE = "leads" as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState<LeadStats>({ newLeads: 0, soldLeads: 0 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([]);
  const [promoCount, setPromoCount] = useState("1");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("Idle");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ total: number; uploaded: number; skipped: number } | null>(null);
  const [manualLead, setManualLead] = useState<ManualLeadForm>({
    fullName: "",
    phoneNumber: "",
    city: "",
    state: "",
    gender: "male",
    language: "mix",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();

  const loadData = useCallback(async () => {
    const { count: newCount } = await supabase.from(LEADS_TABLE).select("*", { count: "exact", head: true }).eq("status", "new");
    const { count: soldCount } = await supabase.from(LEADS_TABLE).select("*", { count: "exact", head: true }).eq("status", "sold");
    setStats({ newLeads: newCount || 0, soldLeads: soldCount || 0 });

    const { data: profileData, count: userCount } = await supabase
      .from("profiles")
      .select("full_name, mobile_number, email, company_name", { count: "exact" });
    setProfiles(profileData || []);
    setTotalUsers(userCount || 0);

    // Promo codes with user email resolution
    const { data: promoData } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

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

    // Download history
    const { data: historyData } = await supabase
      .from("download_history")
      .select("*")
      .order("downloaded_at", { ascending: false });

    const enrichedHistory: DownloadHistoryRow[] = [];
    for (const h of (historyData as DownloadHistoryRow[]) || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", h.user_id)
        .single();
      enrichedHistory.push({
        ...h,
        user_email: profile?.email || "Unknown",
        user_name: profile?.full_name || "Unknown",
      });
    }
    setDownloadHistory(enrichedHistory);
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

  const isSchemaCacheError = (message?: string) => {
    const lower = (message || "").toLowerCase();
    return lower.includes("schema cache") ||
      lower.includes("could not find the 'language' column") ||
      lower.includes("could not find the 'gender' column");
  };

  const refreshLeadsSchemaCache = async () => {
    await supabase.rpc("refresh_postgrest_schema_cache");
    await new Promise((resolve) => setTimeout(resolve, 300));
  };

  const validateLeadsSchemaColumns = async () => {
    const requiredColumns = "full_name,phone_number,city,state,gender,language";
    const { error } = await supabase
      .from(LEADS_TABLE)
      .select(requiredColumns)
      .limit(1);

    if (error) {
      throw error;
    }
  };

  const ensureLeadsSchemaReady = async () => {
    try {
      await validateLeadsSchemaColumns();
    } catch (err) {
      const error = err as { message?: string };
      if (!isSchemaCacheError(error?.message)) {
        throw err;
      }

      await refreshLeadsSchemaCache();
      await validateLeadsSchemaColumns();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploading) {
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparing file...");
    setUploadSummary(null);
    console.info("[Lead Upload] File received", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    try {
      setUploadProgress(15);
      setUploadStatus("Reading CSV/Excel...");
      const { leads, missingColumns, detectedColumns, fileType } = await parseLeadsFromFile(file);
      console.info("[Lead Upload] File type detected", { fileType });
      console.info("[Lead Upload] File parsed successfully");
      console.info("[Lead Upload] Rows detected", { totalRows: leads.length });
      console.info("[Lead Upload] Columns detected", { detectedColumns });

      if (missingColumns.length > 0) {
        const firstMissing = missingColumns[0];
        throw new Error(`Missing column "${firstMissing}"`);
      }

      setUploadProgress(45);
      setUploadStatus("Processing rows...");
      const { validLeads, skippedRows } = buildLeadInsertPayload(leads);
      console.info("[Lead Upload] Row processing summary", {
        validRows: validLeads.length,
        invalidRows: skippedRows,
      });
      console.info("[Lead Upload] Rows prepared for insert", { preparedRows: validLeads.length });

      if (leads.length === 0 || validLeads.length === 0) {
        toast({
          title: "No valid data",
          description: `No valid leads found. Skipped Rows: ${leads.length === 0 ? 0 : skippedRows}`,
          variant: "destructive",
        });
        setUploadProgress(0);
        setUploadStatus("Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      setUploadProgress(55);
      setUploadStatus("Saving leads to database...");
      await ensureLeadsSchemaReady();

      const batchSize = 100;
      const totalBatches = Math.ceil(validLeads.length / batchSize);

      let uploadedRows = 0;
      let databaseSkippedRows = 0;
      const dbErrors: string[] = [];

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * batchSize;
        const end = start + batchSize;
        const batchRows = validLeads.slice(start, end);

        setUploadStatus(`Saving leads to database... (batch ${batchIndex + 1}/${totalBatches})`);

        let response = await supabase.from(LEADS_TABLE).insert(batchRows);
        if (response.error && isSchemaCacheError(response.error.message)) {
          await refreshLeadsSchemaCache();
          response = await supabase.from(LEADS_TABLE).insert(batchRows);
        }

        if (response.error) {
          dbErrors.push(response.error.message);
          console.error("[Lead Upload] Batch insert failed", {
            batchNumber: batchIndex + 1,
            batchSize: batchRows.length,
            message: response.error.message,
            details: response.error.details,
            hint: response.error.hint,
            code: response.error.code,
          });

          for (let rowOffset = 0; rowOffset < batchRows.length; rowOffset++) {
            const row = batchRows[rowOffset];
            let rowResponse = await supabase.from(LEADS_TABLE).insert([row]);

            if (rowResponse.error && isSchemaCacheError(rowResponse.error.message)) {
              await refreshLeadsSchemaCache();
              rowResponse = await supabase.from(LEADS_TABLE).insert([row]);
            }

            if (rowResponse.error) {
              databaseSkippedRows += 1;
              dbErrors.push(`Row ${start + rowOffset + 2}: ${rowResponse.error.message}`);
              console.error("[Lead Upload] Row insert failed", {
                rowNumber: start + rowOffset + 2,
                message: rowResponse.error.message,
                details: rowResponse.error.details,
                hint: rowResponse.error.hint,
                code: rowResponse.error.code,
              });
            } else {
              uploadedRows += 1;
            }
          }
        } else {
          uploadedRows += batchRows.length;
          console.info("[Lead Upload] Database insert result", {
            batchNumber: batchIndex + 1,
            insertedRows: batchRows.length,
            success: true,
          });
        }

        const saveProgress = Math.round(((batchIndex + 1) / totalBatches) * 45);
        setUploadProgress(55 + saveProgress);
      }

      const totalSkippedRows = skippedRows + databaseSkippedRows;
      console.info("[Lead Upload] Database insert status", {
        totalRows: leads.length,
        uploadedRows,
        skippedRows: totalSkippedRows,
        dbFailedRows: databaseSkippedRows,
      });

      if (uploadedRows === 0) {
        const firstDbError = dbErrors[0] || "No rows could be uploaded.";
        throw new Error(firstDbError);
      }

      setUploadSummary({
        total: leads.length,
        uploaded: uploadedRows,
        skipped: totalSkippedRows,
      });
      setUploadProgress(100);
      setUploadStatus("Upload Complete");
      toast({
        title: "Upload Complete",
        description: `Total Rows: ${leads.length} | Uploaded Rows: ${uploadedRows} | Skipped Rows: ${totalSkippedRows}`,
      });
      loadData();
    } catch (err) {
      console.error("Lead upload failed:", err);
      const message = err instanceof Error
        ? err.message
        : `Unexpected upload error: ${JSON.stringify(err)}`;
      setUploadProgress(0);
      setUploadStatus(`Upload failed: ${message}`);
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleManualLeadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (role !== "admin") {
      toast({ title: "Error", description: "Only admins can add leads.", variant: "destructive" });
      return;
    }

    const { validLeads } = buildLeadInsertPayload([
      {
        full_name: manualLead.fullName,
        phone_number: manualLead.phoneNumber,
        city: manualLead.city,
        state: manualLead.state,
        gender: normalizeGender(manualLead.gender, "male"),
        language: normalizeLanguage(manualLead.language, "mix"),
      },
    ]);

    if (validLeads.length === 0) {
      toast({
        title: "Validation error",
        description: "Full Name and Phone Number are required.",
        variant: "destructive",
      });
      return;
    }

    setManualSubmitting(true);
    try {
      await ensureLeadsSchemaReady();

      let { error } = await supabase.from(LEADS_TABLE).insert(validLeads);
      if (error && isSchemaCacheError(error.message)) {
        await refreshLeadsSchemaCache();
        const retry = await supabase.from(LEADS_TABLE).insert(validLeads);
        error = retry.error;
      }

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Lead added successfully." });
        setManualLead({
          fullName: "",
          phoneNumber: "",
          city: "",
          state: "",
          gender: "male",
          language: "mix",
        });
        loadData();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add lead.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleClearAllLeadData = async () => {
    if (role !== 'admin') {
      toast({ title: "Error", description: "You don't have permission to clear lead data.", variant: "destructive" });
      return;
    }

    setClearing(true);
    try {
      // Delete all leads with either status (covers all records without UUID issues)
      const { error } = await supabase
        .from(LEADS_TABLE)
        .delete()
        .in("status", ["new", "sold"]);
      
      if (error) {
        toast({ title: "Error", description: `Failed to delete leads: ${error.message}`, variant: "destructive" });
        setClearing(false);
        return;
      }

      // Reset stats
      setStats({ newLeads: 0, soldLeads: 0 });
      toast({ title: "Success", description: "All lead data has been successfully removed." });
      
      // Reload data to ensure consistency
      await loadData();
    } catch (err) {
      console.error("Clear lead data error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to clear lead data.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setClearing(false);
    }
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

      <main className="container py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4 mb-6">
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={Database} label="New Leads" value={stats.newLeads} />
          <StatCard icon={TrendingUp} label="Sold Leads" value={stats.soldLeads} />
          <StatCard icon={Tag} label="Promos Generated" value={promoCodes.length} />
          <StatCard icon={CheckCircle} label="Promos Used" value={promoUsedCount} />
        </div>

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="leads" className="text-xs md:text-sm">
              <Upload className="mr-1 h-4 w-4 hidden md:inline" />Leads
            </TabsTrigger>
            <TabsTrigger value="promos" className="text-xs md:text-sm">
              <Tag className="mr-1 h-4 w-4 hidden md:inline" />Promos
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm">
              <Users className="mr-1 h-4 w-4 hidden md:inline" />Users
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs md:text-sm">
              <History className="mr-1 h-4 w-4 hidden md:inline" />History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Upload Lead Data
                  </CardTitle>
                  {role === 'admin' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Clear All Lead Data</span>
                          <span className="sm:hidden">Clear Data</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Lead Data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete all lead data? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAllLeadData}
                            disabled={clearing}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {clearing ? "Clearing..." : "Delete All"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span>New: <strong className="text-foreground">{stats.newLeads}</strong></span>
                  <span className="mx-1">•</span>
                  <span>Sold: <strong className="text-foreground">{stats.soldLeads}</strong></span>
                </div>
                <div>
                  <label className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors ${uploading ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:border-primary/50"}`}>
                    {uploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading Leads..." : "Click to upload CSV or Excel file"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Columns: full_name, phone_number, city, state, gender, language
                    </span>
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {(uploading || uploadSummary) && (
                  <div className="rounded-md border bg-muted/40 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{uploadStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-3" />
                    {uploading && (
                      <p className="text-xs text-muted-foreground">Processing file... {uploadProgress}%</p>
                    )}
                  </div>
                )}
                {uploadSummary && (
                  <div className="rounded-md border bg-muted/40 p-4 text-sm">
                    <p className="font-semibold">Upload Complete</p>
                    <p>Total Rows: <strong>{uploadSummary.total}</strong></p>
                    <p>Uploaded Rows: <strong>{uploadSummary.uploaded}</strong></p>
                    <p>Skipped Rows: <strong>{uploadSummary.skipped}</strong></p>
                  </div>
                )}
              </CardContent>
            </Card>

            {role === "admin" && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Add Lead Manually</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualLeadSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                      className="h-12 text-base"
                      placeholder="Full Name"
                      value={manualLead.fullName}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                    <Input
                      className="h-12 text-base"
                      placeholder="Phone Number"
                      value={manualLead.phoneNumber}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    />
                    <Input
                      className="h-12 text-base"
                      placeholder="City"
                      value={manualLead.city}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, city: e.target.value }))}
                    />
                    <Input
                      className="h-12 text-base"
                      placeholder="State"
                      value={manualLead.state}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, state: e.target.value }))}
                    />

                    <select
                      className="h-12 rounded-md border bg-background px-3 text-base"
                      value={manualLead.gender}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, gender: e.target.value as ManualLeadForm["gender"] }))}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="mix">Mix</option>
                    </select>

                    <select
                      className="h-12 rounded-md border bg-background px-3 text-base"
                      value={manualLead.language}
                      onChange={(e) => setManualLead((prev) => ({ ...prev, language: e.target.value as ManualLeadForm["language"] }))}
                    >
                      <option value="gujarati">Gujarati</option>
                      <option value="hindi">Hindi</option>
                      <option value="mix">Mix</option>
                    </select>

                    <Button type="submit" className="h-12 text-base md:col-span-2" disabled={manualSubmitting}>
                      {manualSubmitting ? "Adding..." : "Add Lead"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
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
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-mono text-xs bg-secondary px-2 py-1 rounded truncate">{p.code}</code>
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${p.used_by || p.is_used ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700"}`}>
                          {p.used_by || p.is_used ? "Used" : "Available"}
                        </span>
                      </div>
                      {(p.used_by || p.is_used) && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            Used by: <span className="font-medium">{p.user_email || "Unknown User"}</span>
                          </p>
                          <p>
                            Used at: <span className="font-medium">
                              {p.used_at ? new Date(p.used_at).toLocaleString() : "Unknown"}
                            </span>
                          </p>
                        </div>
                      )}
                      {!p.used_by && !p.is_used && (
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(p.created_at).toLocaleString()}
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

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5 text-primary" />
                  Download History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {downloadHistory.map((h) => (
                    <div key={h.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{h.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.downloaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{h.lead_count} leads</span>
                        <span>•</span>
                        <span>{h.user_email}</span>
                        <code className="bg-secondary px-1.5 py-0.5 rounded">{h.promo_code}</code>
                        {h.filters && Object.entries(h.filters).map(([k, v]) => (
                          <span key={k} className="bg-accent px-1.5 py-0.5 rounded">{k}: {v}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {downloadHistory.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No downloads yet.</p>
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

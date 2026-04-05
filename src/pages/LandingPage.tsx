import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield, Download, Tag, Users, Zap, Lock, Smartphone,
  Filter, History, Upload, ArrowRight, CheckCircle2
} from "lucide-react";

const features = [
  { icon: Lock, title: "Secure Promo Code System", desc: "Users can download leads using unique one-time promo codes." },
  { icon: Smartphone, title: "Mobile Friendly Dashboard", desc: "Simple interface designed for mobile users." },
  { icon: Filter, title: "Lead Filtering", desc: "Download leads by Gender and Language." },
  { icon: Download, title: "Fast Lead Download", desc: "Instant CSV downloads of selected leads." },
  { icon: Upload, title: "Admin Lead Management", desc: "Admins can upload leads via CSV, Excel, or manual entry." },
  { icon: History, title: "Download History", desc: "Users can see their previous lead downloads." },
];

const steps = [
  { num: "01", title: "Create Your Account", desc: "Sign up with your name, email, and company details." },
  { num: "02", title: "Get Promo Code", desc: "Enter the promo code provided by your admin." },
  { num: "03", title: "Choose Filters", desc: "Select lead gender and language preferences." },
  { num: "04", title: "Download Leads", desc: "Download verified leads instantly as CSV." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-bold tracking-tight">ShreeLead</span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground ml-1.5">by Shree Ads Mall</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="h-9" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="container relative py-20 md:py-32 lg:py-40">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Smart Lead Download Platform
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Shree<span className="text-primary">Lead</span>
            </h1>

            <p className="mx-auto max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              A powerful platform where users can download verified leads using
              secure promo codes. Built for marketing teams and lead generation
              agencies.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
              <Button size="lg" className="h-13 px-8 text-base gap-2" asChild>
                <Link to="/register">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-13 px-8 text-base" asChild>
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t bg-secondary/30">
        <div className="container py-16 md:py-24">
          <SectionHeader
            title="Platform Features"
            subtitle="Everything you need for efficient lead distribution"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md border-border/60">
                <CardContent className="p-5 space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-[15px]">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t">
        <div className="container py-16 md:py-24">
          <SectionHeader
            title="How It Works"
            subtitle="Get started in four simple steps"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((s) => (
              <Card key={s.num} className="relative overflow-hidden border-border/60">
                <CardContent className="p-5 space-y-2">
                  <span className="text-4xl font-extrabold text-primary/10 absolute top-3 right-4 select-none">
                    {s.num}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {s.num}
                  </div>
                  <h3 className="font-semibold text-[15px]">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="border-t bg-secondary/30">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center space-y-4">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">About ShreeLead</h2>
            <p className="text-muted-foreground leading-relaxed">
              ShreeLead is a lead distribution platform developed by{" "}
              <span className="font-semibold text-foreground">Shree Ads Mall</span>. It
              allows businesses and marketers to access verified leads through a
              secure promo code system.
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-4 text-sm text-muted-foreground">
              {["One-time promo codes", "Gender & language filters", "CSV instant download", "Admin dashboard"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-xl rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground space-y-5">
            <h2 className="text-2xl font-bold sm:text-3xl leading-tight">
              Start Downloading Quality Leads Today
            </h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base">
              Create your free account and start using promo codes to access verified leads.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="h-13 px-8 text-base font-semibold"
                asChild
              >
                <Link to="/register">Register Now</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-card">
        <div className="container py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">ShreeLead</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">by Shree Ads Mall</p>
            </div>

            <div className="flex items-center gap-5 text-sm">
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
              <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                Register
              </Link>
              <a
                href="https://wa.me/919265106657"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ShreeLead by Shree Ads Mall. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-lg text-center mb-10 md:mb-14">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield, Download, Lock, Smartphone,
  Filter, History, Upload, ArrowRight, CheckCircle2,
  Zap, Menu, X
} from "lucide-react";
import { useState } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/25">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <span className="text-lg font-bold tracking-tight">ShreeLead</span>
              <span className="hidden sm:inline text-[11px] text-muted-foreground ml-1.5">by Shree Ads Mall</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/about">About</Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="sm" className="h-9 ml-2 bg-gradient-to-r from-primary to-primary/85 shadow-md shadow-primary/25" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card px-4 pb-4 pt-2 space-y-1 animate-fade-in">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent transition-colors">Home</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent transition-colors">About</Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-3 text-sm font-medium hover:bg-accent transition-colors">Login</Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-4 py-3 mt-2 text-sm font-semibold text-center text-primary-foreground bg-gradient-to-r from-primary to-primary/85 shadow-md shadow-primary/25 transition-colors">Get Started</Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />

        <div className="container relative py-16 sm:py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-2xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur-sm px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Shield className="h-4 w-4 text-primary" />
              Smart Lead Download Platform
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                Shree<span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Lead</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-muted-foreground">
                Smart Lead Download Platform
              </p>
            </div>

            <p className="mx-auto max-w-lg text-base sm:text-lg text-muted-foreground/80 leading-relaxed">
              A powerful platform where users can download verified leads using
              secure promo codes. Built for marketing teams and lead generation agencies.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
              <Button size="lg" className="h-14 px-8 text-base gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/85 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all" asChild>
                <Link to="/register">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-xl border-2 hover:bg-accent" asChild>
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t bg-secondary/20">
        <div className="container py-20 md:py-28">
          <SectionHeader
            title="Platform Features"
            subtitle="Everything you need for efficient lead distribution"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border bg-card p-6 space-y-4 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t">
        <div className="container py-20 md:py-28">
          <SectionHeader
            title="How It Works"
            subtitle="Get started in four simple steps"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="relative rounded-2xl border bg-card p-6 space-y-3 shadow-sm overflow-hidden">
                <span className="absolute -top-2 -right-1 text-6xl font-black text-primary/[0.06] select-none leading-none">
                  {s.num}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-md shadow-primary/25">
                  {s.num}
                </div>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="border-t bg-secondary/20">
        <div className="container py-20 md:py-28">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">About ShreeLead</h2>
            <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
              ShreeLead is a lead distribution platform developed by{" "}
              <span className="font-semibold text-foreground">Shree Ads Mall</span>. It
              allows businesses and marketers to access verified leads through a
              secure promo code system.
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-4">
              {["One-time promo codes", "Gender & language filters", "CSV instant download", "Admin dashboard"].map((t) => (
                <span key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t">
        <div className="container py-20 md:py-28">
          <div className="mx-auto max-w-xl rounded-3xl bg-gradient-to-br from-primary to-primary/85 p-8 md:p-12 text-center text-primary-foreground space-y-6 shadow-2xl shadow-primary/20">
            <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl leading-tight">
              Start Downloading Quality Leads Today
            </h2>
            <p className="text-primary-foreground/80 text-sm sm:text-base max-w-sm mx-auto">
              Create your free account and start using promo codes to access verified leads.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
              <Button
                size="lg"
                variant="secondary"
                className="h-14 px-8 text-base font-semibold rounded-xl shadow-lg"
                asChild
              >
                <Link to="/register">Register Now</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base rounded-xl border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
        <div className="container py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">ShreeLead</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">by Shree Ads Mall</p>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
              <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">Register</Link>
              <a href="https://wa.me/919265106657" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ShreeLead by Shree Ads Mall. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-lg text-center mb-12 md:mb-16 space-y-3">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{title}</h2>
      <p className="text-muted-foreground text-base sm:text-lg">{subtitle}</p>
    </div>
  );
}

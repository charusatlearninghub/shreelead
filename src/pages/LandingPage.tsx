import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Download, Tag, Users, Zap, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ShreeLead</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container relative py-20 md:py-32">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Trusted Lead Platform
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
              Download Verified Leads{" "}
              <span className="text-primary">Instantly</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              A smart platform to download verified leads using promo codes. 
              Filter by gender, language, and location — get exactly the data you need.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-13 px-8 text-base" asChild>
                <Link to="/register">
                  Create Free Account
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-13 px-8 text-base" asChild>
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-card/50">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-lg text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Simple, fast, and secure lead downloads</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <FeatureCard
              icon={Tag}
              title="Use Promo Code"
              description="Enter your promo code to unlock lead downloads. Each code is single-use for security."
            />
            <FeatureCard
              icon={Download}
              title="Download Leads"
              description="Select gender, language, and lead count. Download as CSV instantly."
            />
            <FeatureCard
              icon={Lock}
              title="Exclusive Data"
              description="Once downloaded, leads are marked as sold. You get fresh, exclusive data every time."
            />
            <FeatureCard
              icon={Users}
              title="Filtered Results"
              description="Filter leads by gender (Male / Female) and language (Gujarati / Hindi)."
            />
            <FeatureCard
              icon={Shield}
              title="Admin Dashboard"
              description="Admins can upload leads, manage promo codes, and track all activity."
            />
            <FeatureCard
              icon={Zap}
              title="Instant Access"
              description="Register, get a promo code from admin, and start downloading immediately."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-lg text-center space-y-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to Get Started?</h2>
            <p className="text-muted-foreground">
              Create your account today and start downloading verified leads.
            </p>
            <Button size="lg" className="h-13 px-10 text-base" asChild>
              <Link to="/register">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ShreeLead. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

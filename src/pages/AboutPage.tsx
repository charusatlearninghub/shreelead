import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap, ArrowLeft, Layers, Target, Users, Clock,
  Sparkles, Megaphone, User, Briefcase
} from "lucide-react";

const strengths = [
  { icon: Layers, title: "All In One Place", desc: "Complete marketing, content, and advertising solutions for your brand." },
  { icon: Target, title: "Results Driven", desc: "50+ successful campaigns delivered with measurable results." },
  { icon: Users, title: "Client Focused", desc: "Trusted by 100+ happy clients who rely on our marketing expertise." },
  { icon: Clock, title: "Fast Delivery", desc: "Quick turnaround time with most projects delivered within 12–24 hours." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">ShreeLead</span>
          </div>
          <Button variant="ghost" size="sm" className="h-9 gap-1.5" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Page Title */}
      <section className="border-b bg-secondary/30">
        <div className="container py-12 md:py-16 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">About Us</h1>
          <p className="mt-2 text-muted-foreground">Learn more about our mission and the team behind ShreeLead</p>
        </div>
      </section>

      {/* Section 1 – About Founder */}
      <section className="border-b">
        <div className="container py-14 md:py-20">
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">About Our Founder</h2>
              <p className="text-primary font-medium">Meet Mahipal Jinjala</p>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                I'm <span className="font-semibold text-foreground">Mahipal Jinjala</span>, founder
                of Shree Ads Mall. I help brands grow through content, ads, and smart marketing
                strategies.
              </p>
              <p>
                As a passionate and growing agency, we are dedicated to helping businesses grow
                through creative content, smart advertising, and data-driven marketing. At Shree Ads
                Mall, our goal is to transform businesses with powerful visual storytelling and
                effective strategies that deliver real results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 – Why Choose Us */}
      <section className="border-b bg-secondary/30">
        <div className="container py-14 md:py-20">
          <div className="mx-auto max-w-lg text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Growth Partner in Gujarat</h2>
            <p className="mt-2 text-muted-foreground">Why businesses choose Shree Ads Mall</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
            {strengths.map((s) => (
              <Card key={s.title} className="border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="p-5 space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 – Founder Profile */}
      <section className="border-b">
        <div className="container py-14 md:py-20">
          <div className="mx-auto max-w-sm">
            <Card className="overflow-hidden border-border/60">
              <div className="h-24 bg-gradient-to-br from-primary to-primary/70" />
              <CardContent className="relative pt-0 pb-6 px-6 text-center -mt-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-secondary">
                  <User className="h-9 w-9 text-primary" />
                </div>
                <h3 className="mt-3 text-xl font-bold">Mahipal Jinjala</h3>
                <p className="text-sm text-muted-foreground">Founder & Creative Director</p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Megaphone className="h-3 w-3" />
                    Marketing Expert
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    Content Creator
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 4 – Closing */}
      <section className="border-b bg-secondary/30">
        <div className="container py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center space-y-5">
            <Briefcase className="h-8 w-8 text-primary mx-auto" />
            <p className="text-muted-foreground leading-relaxed text-base sm:text-lg">
              At Shree Ads Mall, we believe every brand deserves the opportunity to grow. Our
              mission is to help businesses succeed through creative storytelling, strategic
              marketing, and consistent results.
            </p>
            <Button size="lg" className="h-13 px-8 text-base" asChild>
              <Link to="/register">Join ShreeLead</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card">
        <div className="container py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ShreeLead by Shree Ads Mall. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

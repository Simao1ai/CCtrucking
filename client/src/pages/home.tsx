import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Truck, Shield, FileText, Receipt, Clock, CheckCircle, ArrowRight,
  Phone, Mail, MapPin, Users, BarChart3, Zap, Lock, Globe,
  ClipboardCheck, Calculator, BookOpen, HeadphonesIcon
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description: "Organize all your carrier clients in one place. Track contact info, DOT/MC numbers, compliance status, and service history.",
  },
  {
    icon: ClipboardCheck,
    title: "DOT & IFTA Compliance",
    description: "Manage MCS-150 updates, UCR renewals, and quarterly IFTA filings with deadline tracking and automated reminders.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    description: "Generate professional invoices, track payment status, and send automated reminders. Export to PDF in one click.",
  },
  {
    icon: FileText,
    title: "Document Management",
    description: "Securely store and organize permits, insurance certificates, BOC-3 filings, and compliance documents per client.",
  },
  {
    icon: Calculator,
    title: "Bookkeeping & Tax Prep",
    description: "Upload bank statements, categorize transactions with AI, generate financial summaries, and prepare tax documents.",
  },
  {
    icon: BarChart3,
    title: "Business Analytics",
    description: "Track revenue, client growth, employee performance, and service delivery metrics with visual dashboards.",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Built for Trucking",
    description: "Every feature is purpose-built for the trucking industry. No generic CRMs. No workarounds.",
  },
  {
    icon: Lock,
    title: "Secure & Compliant",
    description: "Enterprise-grade security with encrypted data, role-based access, and full audit logging.",
  },
  {
    icon: Globe,
    title: "Your Brand, Your Platform",
    description: "White-label ready with custom branding, your own login page, and a dedicated client portal.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    description: "Our team understands trucking operations. Get help from people who speak your language.",
  },
];

const stats = [
  { value: "10,000+", label: "Carriers Managed" },
  { value: "99.9%", label: "Uptime" },
  { value: "50%", label: "Less Admin Time" },
  { value: "3", label: "Portals in One Platform" },
];

export default function Home() {
  return (
    <div data-testid="page-home">
      <section className="relative py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(45,100,180,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(200,120,30,0.08),_transparent_50%)]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-14">
            <div className="flex-1 space-y-7">
              <BrandLogo size="lg" variant="light" showTagline data-testid="img-hero-logo" />
              <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.1]">
                Run Your Trucking Consulting Business{" "}
                <span className="text-amber-400">From One Platform</span>
              </h1>
              <p className="text-lg text-white/70 max-w-xl leading-relaxed">
                CarrierDeskHQ gives trucking consultants, compliance firms, and carrier service companies the tools to manage clients, filings, invoices, documents, and bookkeeping — all in one place.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/contact">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg" data-testid="button-get-started">
                    Request a Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/faqs">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-learn-more">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 text-center">
                  <div className="text-3xl font-bold text-amber-400">{stat.value}</div>
                  <div className="text-sm text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Everything You Need</p>
            <h2 className="text-3xl md:text-4xl font-bold">One Platform. Every Tool.</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
              Stop juggling spreadsheets, email chains, and disconnected software. CarrierDeskHQ brings your entire operation under one roof.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-md transition-shadow" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Who It's For</p>
            <h2 className="text-3xl md:text-4xl font-bold">Built for People Who Serve the Trucking Industry</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
              Whether you manage 10 carriers or 500, CarrierDeskHQ scales with your business.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm" data-testid="card-audience-consultants">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Trucking Consultants</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Manage multiple carrier clients, track every filing deadline, and give clients their own portal to view progress.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="card-audience-compliance">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                  <ClipboardCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Compliance Firms</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automate DOT, IFTA, UCR, and MCS-150 workflows. Never miss a deadline with built-in compliance calendars.
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="card-audience-carriers">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Carrier Service Companies</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Offer your carriers a branded client portal for document uploads, invoice payments, and real-time service updates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Why CarrierDeskHQ</p>
            <h2 className="text-3xl md:text-4xl font-bold">Purpose-Built for Trucking Operations</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center" data-testid={`benefit-${benefit.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto mb-4">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Modernize Your Operations?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto text-lg">
            Join trucking consultants and carrier service companies who are saving hours every week with CarrierDeskHQ.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg" data-testid="button-contact-us">
                Request a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-sign-in-cta">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-14 px-6 md:px-12 lg:px-24 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="mb-4">
                <BrandLogo size="sm" variant="dark" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The all-in-one operations platform for trucking consultants and carrier service companies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Platform</h4>
              <div className="space-y-2.5">
                <Link href="/" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Features</Link>
                <Link href="/faqs" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">FAQs</Link>
                <Link href="/contact" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Request Demo</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Account</h4>
              <div className="space-y-2.5">
                <Link href="/login" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Sign In</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Contact</h4>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  support@carrierdeskhq.com
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  (888) 555-DESK
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CarrierDeskHQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

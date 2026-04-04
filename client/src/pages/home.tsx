import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Truck, Shield, FileText, ArrowRight,
  Phone, Mail, Users, BarChart3, Zap, Globe,
  ClipboardCheck, Calculator, CheckCircle, Building2,
  UserCheck, Car, CalendarCheck, FolderOpen, MessageSquare,
  ChevronRight, Repeat, Eye, Layers
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const serviceFirmFeatures = [
  {
    icon: Users,
    title: "Client and Service Management",
    description: "Track clients, open tickets, manage statuses, assign internal staff, and keep every service tied to the right documents and deadlines.",
  },
  {
    icon: FileText,
    title: "Forms and Document Automation",
    description: "Map service types to required forms, auto-fill client details, generate paperwork faster, and keep completed forms stored in the right place.",
  },
  {
    icon: MessageSquare,
    title: "Invoicing and Communication",
    description: "Send invoices, reminders, welcome messages, and follow-up communications through one operational workflow.",
  },
  {
    icon: UserCheck,
    title: "Preparer and Staff Workflows",
    description: "Give your team clear visibility into assigned tasks, bookkeeping work, compliance preparation, and internal notes.",
  },
];

const fleetFeatures = [
  {
    icon: ClipboardCheck,
    title: "Driver and DQF Management",
    description: "Track required driver records, monitor expirations, and organize qualification documents for better compliance oversight.",
  },
  {
    icon: Car,
    title: "Vehicles, Insurance, and Deadlines",
    description: "Maintain centralized records for vehicles, policies, and recurring deadlines with alerts and visibility across the team.",
  },
  {
    icon: FolderOpen,
    title: "Onboarding and Document Workflows",
    description: "Collect signatures, manage forms, and guide new drivers or new entities through a consistent onboarding process.",
  },
  {
    icon: CalendarCheck,
    title: "Internal Operations Workflow",
    description: "Use tickets, notes, documents, and statuses to coordinate compliance and admin work across departments.",
  },
];

const whyReasons = [
  {
    icon: Zap,
    title: "Vertical-Specific",
    description: "Built specifically around trucking workflows, not generic CRM templates.",
  },
  {
    icon: Eye,
    title: "Multi-Role Visibility",
    description: "Support admins, staff, preparers, clients, and operators with the right access and workflow structure.",
  },
  {
    icon: Repeat,
    title: "Repeatable Operations",
    description: "Turn recurring filings, compliance work, and admin processes into standardized workflows.",
  },
  {
    icon: Layers,
    title: "Better Organization",
    description: "Keep documents, forms, conversations, statuses, and next steps tied to the right client or record.",
  },
  {
    icon: Globe,
    title: "Room to Grow",
    description: "Support growing service firms and expanding fleets without rebuilding your process from scratch.",
  },
];

const homepageFaqs = [
  {
    question: "Is CarrierDeskHQ for trucking companies or consultants?",
    answer: "Both. CarrierDeskHQ supports trucking service firms that manage clients and recurring filings, as well as fleets that need stronger compliance and administrative workflows.",
  },
  {
    question: "Does CarrierDeskHQ replace a TMS?",
    answer: "No. CarrierDeskHQ is best positioned as a compliance, document, onboarding, and back-office workflow platform rather than a dispatch or telematics system.",
  },
  {
    question: "Can it support multiple staff roles?",
    answer: "Yes. CarrierDeskHQ is built to support role-based workflows across admins, preparers, clients, and internal teams.",
  },
  {
    question: "Can we use it for recurring compliance services?",
    answer: "Yes. CarrierDeskHQ is designed to help teams manage recurring deadlines, service workflows, forms, and communication in a more structured way.",
  },
];

export default function Home() {
  return (
    <div data-testid="page-home">
      <section className="relative py-24 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(45,100,180,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(200,120,30,0.08),_transparent_50%)]" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <BrandLogo size="lg" variant="light" showTagline data-testid="img-hero-logo" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.1] mb-6">
            The Operating System for Trucking{" "}
            <span className="text-amber-400">Administration, Compliance, and Client Workflow</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-10">
            CarrierDeskHQ helps trucking service firms and fleet operators centralize documents, deadlines, onboarding, forms, communication, and recurring operational work in one platform.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg" data-testid="button-book-demo">
                Book a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="button-see-how">
                See How It Works
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Choose Your Path</p>
            <h2 className="text-3xl md:text-4xl font-bold">One Platform. Two Powerful Use Cases.</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl mx-auto text-lg">
              Whether you run a trucking service firm serving multiple carrier clients or operate a fleet with growing compliance and administrative complexity, CarrierDeskHQ helps you centralize the work that usually lives across email, spreadsheets, PDFs, text messages, and disconnected systems.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="relative overflow-hidden border-2 hover:border-amber-500/50 transition-colors group" data-testid="card-path-service-firm">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-5">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">For Trucking Service Firms</h3>
                <p className="text-muted-foreground mb-5 leading-relaxed">
                  Manage clients, filings, staff workflows, invoicing, documents, and compliance tasks in one place.
                </p>
                <a href="#service-firm" className="inline-flex items-center text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                  Explore Service Firm Edition
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-2 hover:border-amber-500/50 transition-colors group" data-testid="card-path-fleet">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-5">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">For Fleets</h3>
                <p className="text-muted-foreground mb-5 leading-relaxed">
                  Centralize driver onboarding, compliance records, insurance tracking, deadlines, and back-office operations.
                </p>
                <a href="#fleet" className="inline-flex items-center text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                  Explore Fleet Compliance Edition
                  <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-muted/40" id="service-firm">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Service Firm Edition</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Trucking Consultants, Compliance Agencies, and Service Firms</h2>
            <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed">
              If your team handles DOT filings, IFTA, IRP, UCR, bookkeeping, tax prep, new authority setup, or recurring compliance services for trucking clients, CarrierDeskHQ gives you one place to run the operation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="space-y-3">
              {[
                "Manage all clients from one centralized workspace",
                "Create and track service tickets from intake to completion",
                "Auto-generate forms based on service type",
                "Organize documents, signatures, and notarizations",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                "Assign staff and preparers with visibility into workload",
                "Send invoices, reminders, and updates without jumping between systems",
                "Keep recurring compliance work from falling through the cracks",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-6 mb-12">
            <p className="text-lg font-semibold text-center">
              Stop running your trucking service business through spreadsheets, email, PDFs, and memory.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-2">Turn operational chaos into a repeatable system</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CarrierDeskHQ helps your team standardize how work gets opened, assigned, completed, documented, billed, and followed up on.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Deliver a better client experience</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Give clients a more professional process with portals, status visibility, digital forms, signatures, reminders, and organized records.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Scale without adding unnecessary overhead</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When workflows, templates, automations, and communication all live in one system, your team can handle more clients with less manual effort.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {serviceFirmFeatures.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-md transition-shadow" data-testid={`card-sf-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-lg font-semibold mb-4">Run your trucking service firm with more control, consistency, and scale.</p>
            <Link href="/contact">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold" data-testid="button-demo-service">
                Book a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24" id="fleet">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Fleet Compliance Edition</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Fleets That Need Better Compliance and Back-Office Control</h2>
            <p className="text-muted-foreground max-w-3xl text-lg leading-relaxed">
              CarrierDeskHQ helps trucking companies centralize driver files, onboarding, insurance records, compliance deadlines, documents, signatures, and recurring admin workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="space-y-3">
              {[
                "Manage driver qualification files in one place",
                "Track expiring documents, policies, and compliance deadlines",
                "Organize vehicle, insurance, and onboarding records",
                "Streamline internal administrative handoffs",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                "Standardize forms, signatures, and document collection",
                "Reduce missed deadlines and manual follow-up",
                "Improve audit readiness and operational visibility",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/10 p-6 mb-12">
            <p className="text-lg font-semibold text-center">
              Replace scattered spreadsheets, folders, and reminders with one compliance and workflow platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-2">Keep compliance visible</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Stay ahead of expiring documents, required filings, onboarding steps, and key deadlines with a centralized operational system.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Simplify driver and admin onboarding</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Create a repeatable process for collecting documents, routing tasks, and tracking progress across your internal team.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Improve control without adding complexity</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                CarrierDeskHQ helps fleets standardize back-office operations without forcing teams to rely on disconnected tools.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fleetFeatures.map((feature) => (
              <Card key={feature.title} className="group hover:shadow-md transition-shadow" data-testid={`card-fleet-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-lg font-semibold mb-4">Bring compliance, onboarding, and administrative workflow into one system.</p>
            <Link href="/contact">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold" data-testid="button-demo-fleet">
                Book a Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">Built for Real Work</p>
            <h2 className="text-3xl md:text-4xl font-bold">Designed for the Real Work Behind Trucking Operations</h2>
            <p className="text-muted-foreground mt-3 max-w-3xl mx-auto text-lg">
              From DOT compliance and recurring filings to onboarding, bookkeeping, documentation, communication, and deadline tracking, CarrierDeskHQ is built for the administrative side of trucking that keeps businesses moving.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-2">The Difference</p>
            <h2 className="text-3xl md:text-4xl font-bold">Why Teams Choose CarrierDeskHQ</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {whyReasons.map((reason) => (
              <div key={reason.title} className="text-center" data-testid={`why-${reason.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto mb-4">
                  <reason.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-1">{reason.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-muted/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {homepageFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger data-testid={`faq-home-${index}`}>{faq.question}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
          <div className="text-center mt-6">
            <Link href="/faqs" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1">
              See all FAQs
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Bring Order to Trucking Operations?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto text-lg">
            See how CarrierDeskHQ can help your team centralize compliance, workflow, and administration.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg" data-testid="button-contact-us">
                Book a Demo
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
                The operating system for trucking administration, compliance, and client workflow.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Platform</h4>
              <div className="space-y-2.5">
                <a href="#service-firm" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Service Firms</a>
                <a href="#fleet" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Fleet Compliance</a>
                <Link href="/faqs" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">FAQs</Link>
                <Link href="/contact" className="block text-sm text-foreground/70 hover:text-foreground transition-colors">Book a Demo</Link>
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

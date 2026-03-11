import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, HelpCircle, Truck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const generalFaqs = [
  {
    question: "What is CarrierDeskHQ?",
    answer: "CarrierDeskHQ is an all-in-one operations platform built specifically for trucking consultants, compliance firms, and carrier service companies. It lets you manage your clients, track compliance deadlines, send invoices, store documents, handle bookkeeping, and give your clients their own branded portal — all from a single dashboard.",
  },
  {
    question: "Who is CarrierDeskHQ designed for?",
    answer: "CarrierDeskHQ is built for anyone who serves the trucking industry: independent consultants managing carrier compliance, DOT/IFTA filing firms, freight service companies, tax preparers specializing in trucking, and carrier service businesses. If you manage trucking clients and their paperwork, this platform is for you.",
  },
  {
    question: "How is this different from a generic CRM?",
    answer: "Generic CRMs don't understand trucking. CarrierDeskHQ is purpose-built with DOT number tracking, IFTA filing management, compliance deadline calendars, UCR/MCS-150 workflows, trucking-specific document categories, and industry terminology throughout. You won't need to hack together workarounds or maintain side spreadsheets.",
  },
  {
    question: "Can my clients access the platform?",
    answer: "Yes. Every account includes a dedicated Client Portal where your carrier clients can log in to view their service tickets, download documents, check invoice status, upload files, and communicate with your team. The portal is branded with your company's name and logo.",
  },
  {
    question: "How do I get started?",
    answer: "Request a demo through our contact page and we'll walk you through the platform. Once you're ready, we'll set up your account, configure your branding, and help you import your existing client list. Most businesses are fully onboarded within a day.",
  },
];

const featureFaqs = [
  {
    question: "What compliance workflows does CarrierDeskHQ support?",
    answer: "The platform supports DOT compliance tracking, IFTA quarterly filing management, UCR annual registration, MCS-150 biennial updates, BOC-3 filings, and general permit management. You can create service tickets for any compliance task, assign them to staff, track deadlines, and notify clients of progress.",
  },
  {
    question: "Does it handle invoicing and payments?",
    answer: "Yes. You can create detailed invoices per client, track payment status, send automated reminders, and export invoices to PDF. Invoices are tied to service tickets so you always know what work was billed.",
  },
  {
    question: "What about bookkeeping and tax prep?",
    answer: "CarrierDeskHQ includes a full bookkeeping module where you can upload bank statements, categorize transactions (with AI assistance), generate monthly financial summaries, and prepare tax documents. You can assign preparers to specific clients and track the entire workflow.",
  },
  {
    question: "Can I manage my team on the platform?",
    answer: "Absolutely. You can add staff members with different roles and permissions. Track employee performance, assign service tickets, and manage workloads. The platform includes role-based access control so each team member only sees what they need.",
  },
  {
    question: "Is there an API for integrations?",
    answer: "Yes. CarrierDeskHQ includes a full REST API for programmatic access to clients, invoices, tickets, and documents. You can generate API keys from your admin dashboard and integrate with your existing tools.",
  },
];

const pricingFaqs = [
  {
    question: "How does pricing work?",
    answer: "CarrierDeskHQ offers tiered subscription plans — Basic, Pro, and Enterprise — based on the number of clients and users you need to manage. Each plan includes access to all core features. Contact us for a personalized quote based on your business size.",
  },
  {
    question: "Is there a free trial?",
    answer: "We offer a guided demo and a trial period so you can explore the platform with your real data before committing. Contact our team to get started.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes. You can change your plan at any time as your business grows or your needs change. Plan changes take effect immediately, and billing is prorated.",
  },
];

const securityFaqs = [
  {
    question: "Is my data secure?",
    answer: "Yes. CarrierDeskHQ uses industry-standard encryption, secure session management, and role-based access control. All data is isolated per account — your clients' data is never visible to other businesses on the platform. We also maintain full audit logs of all system activity.",
  },
  {
    question: "Can I use my own branding?",
    answer: "Yes. Each account supports custom branding including your company name, logo, colors, and a branded login page at your own URL slug. Your clients will see your brand throughout the portal, not ours.",
  },
  {
    question: "Do you offer white-label options?",
    answer: "The platform is designed to be white-labeled from day one. Your clients interact with your brand. CarrierDeskHQ operates behind the scenes as the technology provider.",
  },
];

export default function Faqs() {
  return (
    <div data-testid="page-faqs">
      <div className="py-14 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-white/70 max-w-2xl">
            Everything you need to know about CarrierDeskHQ and how it can help your trucking consulting business.
          </p>
        </div>
      </div>

      <div className="py-14 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="section-general">General</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {generalFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`general-${index}`}>
                      <AccordionTrigger data-testid={`faq-general-${index}`}>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="section-features">Features & Capabilities</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {featureFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`feature-${index}`}>
                      <AccordionTrigger data-testid={`faq-feature-${index}`}>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="section-pricing">Plans & Pricing</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {pricingFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`pricing-${index}`}>
                      <AccordionTrigger data-testid={`faq-pricing-${index}`}>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="section-security">Security & Branding</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {securityFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`security-${index}`}>
                      <AccordionTrigger data-testid={`faq-security-${index}`}>{faq.question}</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Have more questions?</h3>
              <p className="text-muted-foreground mb-4">
                Our team is happy to walk you through the platform and answer anything specific to your business.
              </p>
              <Link href="/contact">
                <Button data-testid="button-contact-from-faq">
                  Request a Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

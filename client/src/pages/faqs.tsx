import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const generalFaqs = [
  {
    question: "What services does CC Trucking Services offer?",
    answer: "We provide comprehensive compliance and administrative services for trucking companies, including DOT compliance, IFTA quarterly filings, tax preparation, business entity setup (LLC formation, EIN applications), UCR registration, MCS-150 updates, and document management.",
  },
  {
    question: "Who do you work with?",
    answer: "We serve owner-operators, small to mid-sized trucking companies, and freight carriers across the United States. Whether you have one truck or a fleet of 50, we can help keep your operations compliant.",
  },
  {
    question: "How do I get started?",
    answer: "Simply reach out through our contact page or give us a call. We'll schedule a consultation to understand your needs and set up your account. Most clients are onboarded within 1-2 business days.",
  },
  {
    question: "What are your business hours?",
    answer: "Our office is open Monday through Friday, 8:00 AM to 6:00 PM CST. For urgent compliance matters, we offer 24/7 support through our emergency line.",
  },
];

const complianceFaqs = [
  {
    question: "What is a DOT number and do I need one?",
    answer: "A DOT (Department of Transportation) number is a unique identifier assigned to commercial motor carriers. You need one if you operate a vehicle that transports passengers or hauls cargo in interstate commerce, or if the vehicle weighs over 10,001 pounds, transports hazardous materials, or carries 9+ passengers for compensation.",
  },
  {
    question: "What is IFTA and when are filings due?",
    answer: "IFTA (International Fuel Tax Agreement) is a tax agreement between US states and Canadian provinces to simplify fuel tax reporting. Quarterly filings are due: Q1 by April 30, Q2 by July 31, Q3 by October 31, and Q4 by January 31. We handle all the calculations and filing for you.",
  },
  {
    question: "What is the MCS-150 and how often must it be updated?",
    answer: "The MCS-150 (Motor Carrier Identification Report) must be updated biennially (every two years) based on your USDOT number. It contains information about your operations, including fleet size, driver count, and types of cargo. Failing to update can result in deactivation of your DOT number.",
  },
  {
    question: "What is UCR registration?",
    answer: "UCR (Unified Carrier Registration) is an annual registration required for motor carriers, brokers, freight forwarders, and leasing companies operating in interstate or international commerce. Fees are based on fleet size and must be renewed each year.",
  },
  {
    question: "What happens if I miss a compliance deadline?",
    answer: "Missing compliance deadlines can result in fines, penalties, and even suspension of your operating authority. DOT violations can range from $1,000 to $16,000+ per offense. That's why we proactively track all your deadlines and send reminders well in advance.",
  },
];

const billingFaqs = [
  {
    question: "How does pricing work?",
    answer: "We offer transparent, service-based pricing. Each service (IFTA filing, DOT compliance review, tax preparation, etc.) has a fixed fee. We also offer bundled packages for clients who need multiple services. Contact us for a personalized quote.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept checks, bank transfers (ACH), and all major credit cards. Invoices are sent electronically and payment is due within 30 days unless otherwise arranged.",
  },
  {
    question: "Do you offer payment plans?",
    answer: "Yes, for larger services like business setup or annual compliance packages, we can arrange payment plans. Please discuss this with your account manager during onboarding.",
  },
];

export default function Faqs() {
  return (
    <div data-testid="page-faqs">
      <div className="py-12 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Find answers to common questions about our services, compliance requirements, and billing.
          </p>
        </div>
      </div>

      <div className="py-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-4" data-testid="section-general">General Questions</h2>
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
            <h2 className="text-xl font-semibold mb-4" data-testid="section-compliance">Compliance & Regulations</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {complianceFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`compliance-${index}`}>
                      <AccordionTrigger data-testid={`faq-compliance-${index}`}>{faq.question}</AccordionTrigger>
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
            <h2 className="text-xl font-semibold mb-4" data-testid="section-billing">Billing & Payments</h2>
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {billingFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`billing-${index}`}>
                      <AccordionTrigger data-testid={`faq-billing-${index}`}>{faq.question}</AccordionTrigger>
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
              <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">
                Our team is here to help. Reach out and we'll get back to you within 24 hours.
              </p>
              <Link href="/contact">
                <Button data-testid="button-contact-from-faq">
                  Contact Us
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

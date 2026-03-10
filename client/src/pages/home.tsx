import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Shield, FileText, Receipt, Clock, CheckCircle, ArrowRight, Phone, Mail, MapPin, Building2, Briefcase } from "lucide-react";
import { useTenant } from "@/context/tenant-context";

const services = [
  {
    icon: Shield,
    title: "DOT Compliance",
    description: "Stay compliant with DOT regulations. We handle permits, MCS-150 updates, and annual compliance reviews.",
  },
  {
    icon: FileText,
    title: "IFTA Filing",
    description: "Quarterly IFTA tax returns filed accurately and on time. We track fuel receipts and mileage for you.",
  },
  {
    icon: Receipt,
    title: "Tax Preparation",
    description: "Quarterly and annual tax filing services tailored for trucking companies and owner-operators.",
  },
  {
    icon: Truck,
    title: "Business Setup",
    description: "LLC formation, EIN applications, operating agreements, and everything to get your trucking business rolling.",
  },
  {
    icon: Clock,
    title: "UCR Registration",
    description: "Unified Carrier Registration renewals handled annually so you never miss a deadline.",
  },
  {
    icon: CheckCircle,
    title: "Document Management",
    description: "Secure tracking of all your compliance documents, permits, insurance certificates, and filings.",
  },
];

const stats = [
  { value: "500+", label: "Carriers Served" },
  { value: "98%", label: "On-Time Filing Rate" },
  { value: "15+", label: "Years Experience" },
  { value: "24/7", label: "Support Available" },
];

export default function Home() {
  const branding = useTenant();
  const IconMap: Record<string, typeof Truck> = { Truck, Building2, Briefcase };
  const BrandIcon = IconMap[branding.sidebarIconName] || Truck;

  return (
    <div data-testid="page-home">
      <section className="relative py-20 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <BrandIcon className="w-4 h-4" />
                Trusted by carriers nationwide
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Keep Your Fleet{" "}
                <span className="text-primary">Compliant</span> & Running
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                {branding.companyName} handles your DOT compliance, IFTA filings, tax preparation, and business setup so you can focus on what matters — moving freight.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact">
                  <Button size="lg" data-testid="button-get-started">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/faqs">
                  <Button size="lg" variant="outline" data-testid="button-learn-more">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Our Services</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Comprehensive compliance and administrative services designed specifically for the trucking industry.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.title} className="group">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <service.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12 lg:px-24 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of carriers who trust {branding.companyName} to keep their operations compliant and their paperwork in order.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <Button size="lg" data-testid="button-contact-us">
                Contact Us Today
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 md:px-12 lg:px-24 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
                  <BrandIcon className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">{branding.companyName}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {branding.tagline}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground">Home</Link>
                <Link href="/faqs" className="block text-sm text-muted-foreground hover:text-foreground">FAQs</Link>
                <Link href="/contact" className="block text-sm text-muted-foreground hover:text-foreground">Contact</Link>
                <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground">Client Portal</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Contact Info</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {branding.supportPhone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {branding.contactEmail}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {branding.address}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {branding.companyName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

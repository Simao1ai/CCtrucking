import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Mail, Clock, Send, Truck, CheckCircle } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({
        title: "Request received!",
        description: "We'll reach out within 1 business day to schedule your demo.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div data-testid="page-contact">
      <div className="py-14 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-[hsl(220,35%,13%)] via-[hsl(220,30%,18%)] to-[hsl(220,25%,22%)] text-white">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Get a Demo</h1>
          </div>
          <p className="text-white/70 max-w-2xl">
            See how CarrierDeskHQ can help you manage your trucking consulting business more efficiently. Fill out the form and we'll schedule a walkthrough.
          </p>
        </div>
      </div>

      <div className="py-14 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Request a Demo</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-contact">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required data-testid="input-first-name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required data-testid="input-last-name" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input id="email" type="email" placeholder="john@yourcompany.com" required data-testid="input-email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" placeholder="(555) 123-4567" data-testid="input-phone" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input id="companyName" placeholder="Your Consulting Firm" required data-testid="input-company" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">What best describes your business?</Label>
                      <Select>
                        <SelectTrigger data-testid="select-business-type">
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trucking-consultant">Trucking Consultant</SelectItem>
                          <SelectItem value="compliance-firm">DOT/IFTA Compliance Firm</SelectItem>
                          <SelectItem value="carrier-services">Carrier Service Company</SelectItem>
                          <SelectItem value="tax-preparer">Trucking Tax Preparer</SelectItem>
                          <SelectItem value="freight-broker">Freight Broker</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientCount">How many carrier clients do you manage?</Label>
                      <Select>
                        <SelectTrigger data-testid="select-client-count">
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1 - 10</SelectItem>
                          <SelectItem value="11-50">11 - 50</SelectItem>
                          <SelectItem value="51-200">51 - 200</SelectItem>
                          <SelectItem value="201-500">201 - 500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Anything else we should know?</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your current workflow, pain points, or specific features you're interested in..."
                        rows={4}
                        data-testid="input-message"
                      />
                    </div>
                    <Button type="submit" disabled={sending} className="w-full" data-testid="button-send-message">
                      {sending ? "Submitting..." : "Request Demo"}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">We'll reach out</div>
                      <div className="text-sm text-muted-foreground">Within 1 business day to schedule a time that works for you.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Live platform walkthrough</div>
                      <div className="text-sm text-muted-foreground">A 30-minute demo tailored to your business and use case.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Get set up</div>
                      <div className="text-sm text-muted-foreground">We'll configure your account, import your clients, and set up your branding.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Email</div>
                      <div className="text-sm text-muted-foreground">support@carrierdeskhq.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Phone</div>
                      <div className="text-sm text-muted-foreground">(888) 555-DESK</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Business Hours</div>
                      <div className="text-sm text-muted-foreground">Mon - Fri: 8:00 AM - 6:00 PM CST</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Already a subscriber?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign in to access your admin dashboard and manage your clients.
                  </p>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-sign-in">
                      Sign In
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Mail, MapPin, Clock, Send, Truck } from "lucide-react";

export default function Contact() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div data-testid="page-contact">
      <div className="py-12 px-6 md:px-12 lg:px-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Contact Us</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Have questions or ready to get started? Reach out and our team will respond within 24 hours.
          </p>
        </div>
      </div>

      <div className="py-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
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
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="john@example.com" required data-testid="input-email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" placeholder="(555) 123-4567" data-testid="input-phone" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input id="companyName" placeholder="Your Trucking Company LLC" data-testid="input-company" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service">Service Interested In</Label>
                      <Select>
                        <SelectTrigger data-testid="select-service">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dot-compliance">DOT Compliance</SelectItem>
                          <SelectItem value="ifta-filing">IFTA Filing</SelectItem>
                          <SelectItem value="tax-preparation">Tax Preparation</SelectItem>
                          <SelectItem value="business-setup">Business Setup</SelectItem>
                          <SelectItem value="ucr-registration">UCR Registration</SelectItem>
                          <SelectItem value="full-package">Full Service Package</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us about your needs..."
                        rows={5}
                        required
                        data-testid="input-message"
                      />
                    </div>
                    <Button type="submit" disabled={sending} className="w-full" data-testid="button-send-message">
                      {sending ? "Sending..." : "Send Message"}
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Phone</div>
                      <div className="text-sm text-muted-foreground">(555) 123-4567</div>
                      <div className="text-xs text-muted-foreground">Toll-free: (800) 555-0199</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Email</div>
                      <div className="text-sm text-muted-foreground">info@cctruckingservices.com</div>
                      <div className="text-xs text-muted-foreground">support@cctruckingservices.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Office</div>
                      <div className="text-sm text-muted-foreground">1200 Main Street, Suite 400</div>
                      <div className="text-sm text-muted-foreground">Houston, TX 77002</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Business Hours</div>
                      <div className="text-sm text-muted-foreground">Mon - Fri: 8:00 AM - 6:00 PM CST</div>
                      <div className="text-xs text-muted-foreground">24/7 Emergency Line Available</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Already a client?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access your dashboard to view tickets, documents, and invoices.
                  </p>
                  <a href="/login">
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-client-portal">
                      Go to Client Portal
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

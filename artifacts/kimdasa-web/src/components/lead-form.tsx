import { useState } from "react";
import { useCreateLead } from "@workspace/api-client-react";
import { trackLeadConversion } from "@/lib/gtag";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { BookingCalendar } from "@/components/booking-calendar";

type FormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  zipCode: string;
  serviceType: string;
  urgency: string;
  budgetApprox: string;
  bestContactTime: string;
  measurements: string;
  comments: string;
  preferredContact: string;
  photoFiles: FileList | null;
};

const EMPTY_FORM: FormData = {
  name: "",
  phone: "",
  email: "",
  address: "",
  zipCode: "",
  serviceType: "",
  urgency: "",
  budgetApprox: "",
  bestContactTime: "",
  measurements: "",
  comments: "",
  preferredContact: "",
  photoFiles: null,
};

const SERVICE_KEYS = [
  "Roofing", "Siding", "Vinyl Siding", "Hardie Siding", "Gutters",
  "Soffit", "Fascia", "Window Capping", "Windows", "Doors",
  "Exterior Remodeling", "Repairs",
  "Kitchen Remodeling", "Bathroom Remodeling", "Drywall",
  "Interior Painting", "Flooring", "Hardwood Flooring", "Tile Work",
  "Interior Carpentry", "Custom Closets", "Basement Finishing",
  "Attic Finishing", "Interior Demolition",
] as const;

export function LeadFormSection() {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<number | undefined>(undefined);

  const { toast } = useToast();
  const createLead = useCreateLead();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelect = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedStep0 = formData.name.trim() && formData.phone.trim() && formData.email.trim();
  const canProceedStep1 = formData.address.trim() && formData.zipCode.trim() && formData.serviceType;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullComments = [
      formData.preferredContact ? `Preferred contact: ${formData.preferredContact}` : "",
      formData.measurements ? `Measurements: ${formData.measurements}` : "",
      formData.comments,
    ]
      .filter(Boolean)
      .join(" | ");

    createLead.mutate(
      {
        data: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.zipCode ? `${formData.address}, ${formData.zipCode}` : formData.address,
          serviceType: formData.serviceType,
          urgency: formData.urgency || undefined,
          budgetApprox: formData.budgetApprox || undefined,
          bestContactTime: formData.bestContactTime || undefined,
          comments: fullComments || undefined,
          source: "website",
          language: lang,
        },
      },
      {
        onSuccess: (data) => {
          setCreatedLeadId(data.id);
          trackLeadConversion();
          setStep(3);
        },
        onError: () => {
          toast({
            title: t.form.errorTitle,
            description: t.form.errorBody,
            variant: "destructive",
          });
        },
      }
    );
  };

  if (submitted) {
    return (
      <section id="estimate" className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-card border border-border p-12 rounded-sm text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold uppercase tracking-tight mb-4">{t.form.receivedTitle}</h2>
            <p className="text-lg text-muted-foreground mb-4">{t.form.receivedBody}</p>
            <Button
              className="mt-8 uppercase tracking-wider"
              onClick={() => setSubmitted(false)}
              data-testid="button-submit-another"
            >
              {t.form.submitAnother}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="estimate" className="py-24 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
              {t.form.title}
            </h2>
            <p className="text-lg text-muted-foreground">{t.form.subtitle}</p>
          </div>

          <div className="flex items-center justify-center gap-0 mb-10">
            {t.form.stepLabels.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground border border-border"
                    }`}
                    data-testid={`step-indicator-${i}`}
                  >
                    {i + 1}
                  </div>
                  <div className="text-xs mt-1 font-semibold uppercase tracking-wider text-center">
                    <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                </div>
                {i < t.form.stepLabels.length - 1 && (
                  <div
                    className={`w-16 h-px mx-2 mb-6 transition-colors ${
                      i < step ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-card border border-border p-8 md:p-10 rounded-sm shadow-2xl">
            <form onSubmit={handleSubmit} data-testid="form-estimate-request">
              {step === 0 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold uppercase tracking-wider mb-6">
                    {t.form.contactHeader}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t.form.fullName} *</Label>
                      <Input id="name" name="name" required value={formData.name} onChange={handleChange} className="bg-background" data-testid="input-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.form.phone} *</Label>
                      <Input id="phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} className="bg-background" data-testid="input-phone" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t.form.email} *</Label>
                    <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="bg-background" data-testid="input-email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferredContact">{t.form.preferredContact}</Label>
                    <Select value={formData.preferredContact} onValueChange={(v) => handleSelect("preferredContact", v)}>
                      <SelectTrigger className="bg-background" data-testid="select-preferred-contact">
                        <SelectValue placeholder={t.form.preferredPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Call">{t.form.contactCall}</SelectItem>
                        <SelectItem value="Text">{t.form.contactText}</SelectItem>
                        <SelectItem value="Email">{t.form.contactEmail}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4">
                    <Button
                      type="button"
                      className="w-full h-12 font-bold uppercase tracking-wider"
                      disabled={!canProceedStep0}
                      onClick={() => setStep(1)}
                      data-testid="button-next-step-1"
                    >
                      {t.form.nextProject}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold uppercase tracking-wider mb-6">
                    {t.form.projectHeader}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">{t.form.address} *</Label>
                      <Input id="address" name="address" required value={formData.address} onChange={handleChange} className="bg-background" placeholder={t.form.addressPlaceholder} data-testid="input-address" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">{t.form.zipCode}</Label>
                      <Input id="zipCode" name="zipCode" required value={formData.zipCode} onChange={handleChange} className="bg-background" placeholder={t.form.zipCodePlaceholder} maxLength={10} data-testid="input-zip-code" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label>{t.form.serviceNeeded} *</Label>
                      <Select value={formData.serviceType} onValueChange={(v) => handleSelect("serviceType", v)} required>
                        <SelectTrigger className="bg-background" data-testid="select-service-type">
                          <SelectValue placeholder={t.form.servicePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_KEYS.map((key) => (
                            <SelectItem key={key} value={key}>{t.services.items[key].title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.form.urgency}</Label>
                      <Select value={formData.urgency} onValueChange={(v) => handleSelect("urgency", v)}>
                        <SelectTrigger className="bg-background" data-testid="select-urgency">
                          <SelectValue placeholder={t.form.urgencyPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASAP">{t.form.urgencyAsap}</SelectItem>
                          <SelectItem value="Within 1 month">{t.form.urgency1Month}</SelectItem>
                          <SelectItem value="1-3 months">{t.form.urgency1to3}</SelectItem>
                          <SelectItem value="3-6 months">{t.form.urgency3to6}</SelectItem>
                          <SelectItem value="Planning ahead">{t.form.urgencyPlanning}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.form.budget}</Label>
                      <Select value={formData.budgetApprox} onValueChange={(v) => handleSelect("budgetApprox", v)}>
                        <SelectTrigger className="bg-background" data-testid="select-budget">
                          <SelectValue placeholder={t.form.budgetPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Under $5,000">{t.form.budgetUnder5k}</SelectItem>
                          <SelectItem value="$5,000 - $15,000">{t.form.budget5to15k}</SelectItem>
                          <SelectItem value="$15,000 - $30,000">{t.form.budget15to30k}</SelectItem>
                          <SelectItem value="$30,000 - $60,000">{t.form.budget30to60k}</SelectItem>
                          <SelectItem value="$60,000+">{t.form.budget60kPlus}</SelectItem>
                          <SelectItem value="Not sure">{t.form.budgetUnsure}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.form.bestTime}</Label>
                      <Select value={formData.bestContactTime} onValueChange={(v) => handleSelect("bestContactTime", v)}>
                        <SelectTrigger className="bg-background" data-testid="select-best-time">
                          <SelectValue placeholder={t.form.bestTimePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning (8am-12pm)">{t.form.timeMorning}</SelectItem>
                          <SelectItem value="Afternoon (12pm-5pm)">{t.form.timeAfternoon}</SelectItem>
                          <SelectItem value="Evening (5pm-8pm)">{t.form.timeEvening}</SelectItem>
                          <SelectItem value="Anytime">{t.form.timeAnytime}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurements">
                      {t.form.measurements}
                      <span className="text-muted-foreground font-normal ml-1 text-xs">{t.form.measurementsHint}</span>
                    </Label>
                    <Input id="measurements" name="measurements" value={formData.measurements} onChange={handleChange} className="bg-background" placeholder={t.form.measurementsPlaceholder} data-testid="input-measurements" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photos">
                      {t.form.photos}
                      <span className="text-muted-foreground font-normal ml-1 text-xs">{t.form.photosHint}</span>
                    </Label>
                    <Input
                      id="photos"
                      name="photos"
                      type="file"
                      accept="image/*,.heic,.heif"
                      multiple
                      className="bg-background file:mr-3 file:py-1 file:px-3 file:border-0 file:rounded-sm file:text-xs file:font-semibold file:uppercase file:tracking-wider file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      onChange={(e) => setFormData((prev) => ({ ...prev, photoFiles: e.target.files }))}
                      data-testid="input-photos"
                    />
                    {formData.photoFiles && formData.photoFiles.length > 0 && (
                      <p className="text-xs text-primary">{t.form.photosSelected(formData.photoFiles.length)}</p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" className="h-12 font-bold uppercase tracking-wider" onClick={() => setStep(0)} data-testid="button-back-step-0">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t.form.back}
                    </Button>
                    <Button type="button" className="flex-1 h-12 font-bold uppercase tracking-wider" disabled={!canProceedStep1} onClick={() => setStep(2)} data-testid="button-next-step-2">
                      {t.form.nextReview}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold uppercase tracking-wider mb-6">{t.form.reviewHeader}</h3>

                  <div className="bg-secondary/50 border border-border rounded-sm p-5 text-sm space-y-2">
                    <div className="font-bold uppercase tracking-wider text-xs text-muted-foreground mb-3">
                      {t.form.reviewYourInfo}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <span className="text-muted-foreground">{t.form.reviewName}</span>
                      <span data-testid="review-name">{formData.name}</span>
                      <span className="text-muted-foreground">{t.form.reviewPhone}</span>
                      <span data-testid="review-phone">{formData.phone}</span>
                      <span className="text-muted-foreground">{t.form.reviewEmail}</span>
                      <span data-testid="review-email">{formData.email}</span>
                      <span className="text-muted-foreground">{t.form.reviewAddress}</span>
                      <span data-testid="review-address">{formData.address}</span>
                      <span className="text-muted-foreground">{t.form.reviewZip}</span>
                      <span data-testid="review-zip">{formData.zipCode}</span>
                      <span className="text-muted-foreground">{t.form.reviewService}</span>
                      <span data-testid="review-service">
                        {formData.serviceType && (SERVICE_KEYS as readonly string[]).includes(formData.serviceType)
                          ? t.services.items[formData.serviceType as typeof SERVICE_KEYS[number]].title
                          : formData.serviceType}
                      </span>
                      {formData.urgency && (
                        <>
                          <span className="text-muted-foreground">{t.form.reviewTimeline}</span>
                          <span>{
                            ({
                              "ASAP": t.form.urgencyAsap,
                              "Within 1 month": t.form.urgency1Month,
                              "1-3 months": t.form.urgency1to3,
                              "3-6 months": t.form.urgency3to6,
                              "Planning ahead": t.form.urgencyPlanning,
                            } as Record<string, string>)[formData.urgency] ?? formData.urgency
                          }</span>
                        </>
                      )}
                      {formData.budgetApprox && (
                        <>
                          <span className="text-muted-foreground">{t.form.reviewBudget}</span>
                          <span>{
                            ({
                              "Under $5,000": t.form.budgetUnder5k,
                              "$5,000 - $15,000": t.form.budget5to15k,
                              "$15,000 - $30,000": t.form.budget15to30k,
                              "$30,000 - $60,000": t.form.budget30to60k,
                              "$60,000+": t.form.budget60kPlus,
                              "Not sure": t.form.budgetUnsure,
                            } as Record<string, string>)[formData.budgetApprox] ?? formData.budgetApprox
                          }</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comments">
                      {t.form.additionalNotes}
                      <span className="text-muted-foreground font-normal ml-1 text-xs">{t.form.additionalNotesHint}</span>
                    </Label>
                    <Textarea
                      id="comments"
                      name="comments"
                      rows={4}
                      value={formData.comments}
                      onChange={handleChange}
                      placeholder={t.form.additionalNotesPlaceholder}
                      className="bg-background"
                      data-testid="textarea-comments"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">{t.form.photosLater}</p>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="h-12 font-bold uppercase tracking-wider" onClick={() => setStep(1)} data-testid="button-back-step-1">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t.form.back}
                    </Button>
                    <Button type="submit" className="flex-1 h-12 text-base font-bold uppercase tracking-wider" disabled={createLead.isPending} data-testid="button-submit-estimate">
                      {createLead.isPending ? t.form.submitting : t.form.nextBook}
                      {!createLead.isPending && <ChevronRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {step === 3 && (
              <div>
                <h3 className="text-lg font-bold uppercase tracking-wider mb-6 text-center">
                  {t.form.bookHeader}
                </h3>
                <BookingCalendar
                  leadId={createdLeadId}
                  initialName={formData.name}
                  initialPhone={formData.phone}
                  initialEmail={formData.email}
                  initialService={formData.serviceType}
                  initialAddress={formData.address}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

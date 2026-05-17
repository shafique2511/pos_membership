import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { createPublicBooking, getPublicBookingContext, type BookingOption } from "@/features/bookings/booking-service";
import { useToast } from "@/components/ui/toast";

type PublicContext = {
  business: { id: string; name: string; slug: string };
  branches: BookingOption[];
  services: BookingOption[];
  resources: BookingOption[];
};

export function PublicBookingPage() {
  const { businessSlug } = useParams();
  const { toast } = useToast();
  const [context, setContext] = useState<PublicContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadContext();
  }, [businessSlug]);

  async function loadContext() {
    if (!businessSlug) return;
    try {
      setLoading(true);
      setContext(await getPublicBookingContext(businessSlug));
    } catch (error) {
      toast({ title: "Public booking unavailable", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) return;
    const formData = new FormData(event.currentTarget);

    try {
      setSaving(true);
      await createPublicBooking({
        business_id: context.business.id,
        branch_id: String(formData.get("branch_id") ?? "") || null,
        service_id: String(formData.get("service_id") ?? "") || null,
        resource_id: String(formData.get("resource_id") ?? "") || null,
        booking_date: String(formData.get("booking_date") ?? ""),
        start_time: String(formData.get("start_time") ?? ""),
        end_time: null,
        status: "pending",
        source: "public",
        notes: String(formData.get("notes") ?? ""),
        internal_notes: null,
        total_amount: 0,
        deposit_amount: 0,
      });
      event.currentTarget.reset();
      toast({ title: "Booking request sent", description: "Your request is pending approval." });
    } catch (error) {
      toast({ title: "Booking request failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState title="Loading public booking page" />;
  if (!context) return <EmptyState title="Business not found" description="This public booking page is not available." />;

  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{context.business.name}</CardTitle>
          <CardDescription>Public booking request for appointments, tables, rooms, resources, or walk-ins.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <Select name="branch_id" label="Branch" options={context.branches} />
            <Select name="service_id" label="Service" options={context.services} />
            <Select name="resource_id" label="Resource / room / table" options={context.resources} />
            <Field name="booking_date" label="Date" type="date" />
            <Field name="start_time" label="Time" type="time" />
            <div className="grid gap-2">
              <Label>Notes</Label>
              <textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" name="notes" />
            </div>
            <Button disabled={saving} type="submit">{saving ? "Sending" : "Request booking"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({ name, label, type }: { name: string; label: string; type: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input name={name} required type={type} />
    </div>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: BookingOption[] }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" name={name}>
        <option value="">None</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import type { BookingRecord } from "@/features/bookings/booking-service";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { createCustomerBooking, getLinkedCustomer, getPortalBookingOptions, listCustomerBookings, updateCustomerBookingStatus, type CustomerProfileRecord, type PortalBookingOptions } from "@/features/portal/customer-portal-service";

export function CustomerBookingsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerProfileRecord | null>(null);
  const [options, setOptions] = useState<PortalBookingOptions>({ branches: [], services: [], resources: [] });
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"new" | "reschedule" | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadBookings();
  }, [auth.business?.id, auth.user?.id]);

  async function loadBookings() {
    if (!auth.business?.id || !auth.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const linkedCustomer = await getLinkedCustomer(auth.business.id, auth.user.id);
      setCustomer(linkedCustomer);
      if (!linkedCustomer) {
        setBookings([]);
        return;
      }
      const [nextBookings, nextOptions] = await Promise.all([
        listCustomerBookings(auth.business.id, linkedCustomer.id),
        getPortalBookingOptions(auth.business.id),
      ]);
      setBookings(nextBookings);
      setOptions(nextOptions);
    } catch (error) {
      toast({ title: "Booking history failed", description: error instanceof Error ? error.message : "Customer RLS may need linked customer records." });
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id || !customer) return;

    const formData = new FormData(event.currentTarget);
    try {
      setSaving(true);
      await createCustomerBooking({
        businessId: auth.business.id,
        userId: auth.user.id,
        customerId: customer.id,
        branchId: String(formData.get("branch_id") ?? "") || null,
        serviceId: String(formData.get("service_id") ?? "") || null,
        resourceId: String(formData.get("resource_id") ?? "") || null,
        bookingDate: String(formData.get("booking_date") ?? ""),
        startTime: String(formData.get("start_time") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      });
      setDialog(null);
      toast({ title: "Booking requested", description: "The business will confirm your request." });
      await loadBookings();
    } catch (error) {
      toast({ title: "Booking request failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking(booking: BookingRecord) {
    if (!auth.business?.id || !auth.user?.id || !customer) return;
    await updateCustomerBookingStatus({ businessId: auth.business.id, customerId: customer.id, bookingId: booking.id, userId: auth.user.id, status: "cancelled" });
    toast({ title: "Booking cancelled" });
    await loadBookings();
  }

  async function rescheduleBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.business?.id || !auth.user?.id || !customer || !selectedBooking) return;
    const formData = new FormData(event.currentTarget);
    await updateCustomerBookingStatus({
      businessId: auth.business.id,
      customerId: customer.id,
      bookingId: selectedBooking.id,
      userId: auth.user.id,
      status: "rescheduled",
      bookingDate: String(formData.get("booking_date") ?? ""),
      startTime: String(formData.get("start_time") ?? ""),
    });
    setDialog(null);
    setSelectedBooking(null);
    toast({ title: "Booking rescheduled", description: "The business will review the new time." });
    await loadBookings();
  }

  if (loading) return <LoadingState title="Loading booking history" />;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Booking history</CardTitle>
              <CardDescription>Book appointments, tables, rooms, resources, and view your history.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setDialog("new")}><CalendarPlus className="h-4 w-4" />Book</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!customer ? (
            <EmptyState title="Customer record not linked" description="Your customer profile must be linked before booking." />
          ) : bookings.length === 0 ? (
            <EmptyState title="No bookings yet" description="Your upcoming and past bookings will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.booking_date}</TableCell>
                    <TableCell>{booking.start_time}</TableCell>
                    <TableCell><Badge variant="secondary">{booking.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>
                      {["pending", "confirmed", "rescheduled"].includes(booking.status) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedBooking(booking); setDialog("reschedule"); }}>Reschedule</Button>
                          <Button size="sm" variant="ghost" onClick={() => void cancelBooking(booking)}>Cancel</Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog === "new"} title="Book appointment" description="Request a service, table, room, resource, or walk-in slot." onClose={() => setDialog(null)}>
        <BookingForm options={options} saving={saving} onSubmit={submitBooking} />
      </Dialog>

      <Dialog open={dialog === "reschedule"} title="Reschedule booking" description="Choose a new date and time." onClose={() => setDialog(null)}>
        <form className="grid gap-4" onSubmit={rescheduleBooking}>
          <Field name="booking_date" label="New date" type="date" defaultValue={selectedBooking?.booking_date} />
          <Field name="start_time" label="New time" type="time" defaultValue={selectedBooking?.start_time} />
          <Button type="submit">Request reschedule</Button>
        </form>
      </Dialog>
    </div>
  );
}

function BookingForm({ options, saving, onSubmit }: { options: PortalBookingOptions; saving: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Select name="branch_id" label="Branch" options={options.branches} />
      <Select name="service_id" label="Service" options={options.services} />
      <Select name="resource_id" label="Resource / room / table" options={options.resources} />
      <Field name="booking_date" label="Date" type="date" />
      <Field name="start_time" label="Time" type="time" />
      <div className="grid gap-2">
        <Label>Notes</Label>
        <textarea className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" name="notes" />
      </div>
      <Button disabled={saving} type="submit">{saving ? "Sending" : "Request booking"}</Button>
    </form>
  );
}

function Field({ name, label, type, defaultValue }: { name: string; label: string; type: string; defaultValue?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input name={name} required type={type} defaultValue={defaultValue} />
    </div>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: { id: string; label: string }[] }) {
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

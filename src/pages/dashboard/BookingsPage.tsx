import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Download, List, Plus, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { BookingForm } from "@/features/bookings/BookingForm";
import {
  changeBookingStatus,
  createBooking,
  createBookingExport,
  createBookingReminder,
  getBookingOptions,
  listBookings,
  updateBooking,
  type BookingFormValues,
  type BookingOption,
  type BookingRecord,
  type BookingStatus,
} from "@/features/bookings/booking-service";
import { useAuth } from "@/features/auth/auth-context";
import { useBusiness } from "@/features/business/business-context";
import { canExportBusinessData } from "@/lib/auth/access";
import { useToast } from "@/components/ui/toast";

type ViewMode = "list" | "calendar";

const statusOptions = ["all", "pending", "confirmed", "checked_in", "completed", "cancelled", "no_show", "rescheduled"];

const emptyOptions = {
  branches: [] as BookingOption[],
  customers: [] as BookingOption[],
  staff: [] as BookingOption[],
  services: [] as BookingOption[],
  resources: [] as BookingOption[],
};

export function BookingsPage() {
  const auth = useAuth();
  const { getBusinessLabel } = useBusiness();
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [count, setCount] = useState(0);
  const [options, setOptions] = useState(emptyOptions);
  const [editing, setEditing] = useState<BookingRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [staffId, setStaffId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState(auth.profile?.role === "owner" ? "" : auth.profile?.branch_id ?? "");

  const businessId = auth.business?.id;
  const userId = auth.user?.id;

  useEffect(() => {
    void loadOptions();
  }, [businessId, auth.profile?.branch_id]);

  useEffect(() => {
    void loadBookings();
  }, [businessId, branchId, dateFrom, dateTo, status, staffId, customerId]);

  async function loadOptions() {
    if (!businessId) return;
    try {
      setOptions(await getBookingOptions(businessId, auth.profile?.role === "owner" ? null : auth.profile?.branch_id));
    } catch (error) {
      toast({ title: "Booking options failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    }
  }

  async function loadBookings() {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await listBookings({
        businessId,
        branchId: branchId || (auth.profile?.role === "owner" ? null : auth.profile?.branch_id),
        dateFrom,
        dateTo,
        status,
        staffId,
        customerId,
      });
      setBookings(result.bookings);
      setCount(result.count);
    } catch (error) {
      toast({ title: "Bookings failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  async function saveBooking(values: BookingFormValues) {
    if (!businessId || !userId) return;
    if (editing) {
      await updateBooking(businessId, userId, editing.id, values);
      toast({ title: "Booking updated" });
    } else {
      await createBooking(businessId, userId, values);
      toast({ title: "Booking created" });
    }
    setFormOpen(false);
    setEditing(null);
    await loadBookings();
  }

  async function setBookingStatus(booking: BookingRecord, nextStatus: BookingStatus) {
    if (!businessId || !userId) return;
    await changeBookingStatus({
      businessId,
      branchId: booking.branch_id,
      bookingId: booking.id,
      oldStatus: booking.status,
      newStatus: nextStatus,
      userId,
    });
    toast({ title: "Booking status updated", description: formatStatus(nextStatus) });
    await loadBookings();
  }

  async function sendReminder(booking: BookingRecord) {
    if (!businessId || !userId) return;
    await createBookingReminder({
      businessId,
      branchId: booking.branch_id,
      customerId: booking.customer_id,
      bookingId: booking.id,
      userId,
    });
    toast({ title: "Reminder queued", description: "Booking reminder was prepared in notifications." });
  }

  async function exportBookings(format: "csv" | "json") {
    if (!businessId || !userId) return;
    const exportId = await createBookingExport({
      businessId,
      branchId: branchId || null,
      userId,
      dateFrom,
      dateTo,
      staffId,
      customerId,
      status,
      format,
    });
    toast({ title: "Booking export requested", description: `Export ${exportId.slice(0, 8)} includes bookings, payments, and status history.` });
    setExportOpen(false);
  }

  const groupedCalendar = useMemo(() => {
    return bookings.reduce<Record<string, BookingRecord[]>>((groups, booking) => {
      groups[booking.booking_date] = [...(groups[booking.booking_date] ?? []), booking];
      return groups;
    }, {});
  }, [bookings]);

  if (loading) return <LoadingState title="Loading bookings" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supports {getBusinessLabel("booking").toLowerCase()} workflows for services, tables, rooms, resources, walk-ins, and customer portal requests.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setView(view === "list" ? "calendar" : "list")}>
            {view === "list" ? <CalendarDays className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {view === "list" ? "Calendar" : "List"}
          </Button>
          {canExportBusinessData(auth) ? (
            <Button variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          ) : null}
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Create booking
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Server-side filtering by date range, branch, staff, customer, and status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <FilterDate label="From" value={dateFrom} onChange={setDateFrom} />
          <FilterDate label="To" value={dateTo} onChange={setDateTo} />
          <FilterSelect label="Branch" value={branchId} options={options.branches} onChange={setBranchId} disabled={auth.profile?.role !== "owner"} />
          <FilterSelect label="Staff" value={staffId} options={options.staff} onChange={setStaffId} />
          <FilterSelect label="Customer" value={customerId} options={options.customers} onChange={setCustomerId} />
          <div className="grid gap-2">
            <Label>Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {bookings.length === 0 ? (
        <EmptyState title="No bookings found" description="Create a booking or adjust your filters." />
      ) : view === "list" ? (
        <BookingList bookings={bookings} count={count} onEdit={(booking) => { setEditing(booking); setFormOpen(true); }} onStatus={setBookingStatus} onReminder={sendReminder} />
      ) : (
        <BookingCalendar groups={groupedCalendar} onEdit={(booking) => { setEditing(booking); setFormOpen(true); }} />
      )}

      <Dialog open={formOpen} title={editing ? "Edit booking" : "Create booking"} description="Manage service, resource, customer, staff, deposits, notes, and status." onClose={() => setFormOpen(false)}>
        <BookingForm booking={editing} options={options} onCancel={() => setFormOpen(false)} onSubmit={saveBooking} />
      </Dialog>

      <Dialog open={exportOpen} title="Export booking data" description="Owner export includes bookings, booking payments, and booking status history." onClose={() => setExportOpen(false)}>
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">Current filters will be stored with the backup export request.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => exportBookings("json")}>JSON</Button>
            <Button onClick={() => exportBookings("csv")}>CSV</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function BookingList({ bookings, count, onEdit, onStatus, onReminder }: { bookings: BookingRecord[]; count: number; onEdit: (booking: BookingRecord) => void; onStatus: (booking: BookingRecord, status: BookingStatus) => void; onReminder: (booking: BookingRecord) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking list</CardTitle>
        <CardDescription>{count} records matched. Page size is limited for high traffic readiness.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.booking_date}</TableCell>
                <TableCell>{booking.start_time}</TableCell>
                <TableCell><Badge variant="secondary">{formatStatus(booking.status)}</Badge></TableCell>
                <TableCell>{booking.deposit_amount > 0 ? `RM ${booking.deposit_amount}` : "None"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(booking)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => onStatus(booking, "confirmed")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => onStatus(booking, "checked_in")}>Check-in</Button>
                    <Button size="sm" variant="outline" onClick={() => onStatus(booking, "completed")}>Complete</Button>
                    <Button size="sm" variant="outline" onClick={() => onStatus(booking, "no_show")}>No-show</Button>
                    <Button size="sm" variant="outline" onClick={() => onStatus(booking, "rescheduled")}>Reschedule</Button>
                    <Button size="sm" variant="destructive" onClick={() => onStatus(booking, "cancelled")}>Cancel</Button>
                    <Button size="sm" variant="ghost" onClick={() => onReminder(booking)}><Bell className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BookingCalendar({ groups, onEdit }: { groups: Record<string, BookingRecord[]>; onEdit: (booking: BookingRecord) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(groups).map(([date, bookings]) => (
        <Card key={date}>
          <CardHeader>
            <CardTitle>{date}</CardTitle>
            <CardDescription>{bookings.length} booking(s)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {bookings.map((booking) => (
              <button key={booking.id} className="rounded-md border p-3 text-left text-sm hover:bg-secondary" onClick={() => onEdit(booking)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{booking.start_time}</span>
                  <Badge variant="outline">{formatStatus(booking.status)}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{booking.notes || "No notes"}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, disabled }: { label: string; value: string; options: BookingOption[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

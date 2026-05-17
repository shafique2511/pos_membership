import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { listBookings, type BookingRecord } from "@/features/bookings/booking-service";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";

export function CustomerBookingsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadBookings();
  }, [auth.business?.id, auth.profile?.id]);

  async function loadBookings() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await listBookings({
        businessId: auth.business.id,
        pageSize: 50,
      });
      setBookings(result.bookings);
    } catch (error) {
      toast({ title: "Booking history failed", description: error instanceof Error ? error.message : "Customer RLS may need linked customer records." });
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState title="Loading booking history" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking history</CardTitle>
        <CardDescription>Your portal-visible booking records.</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings yet" description="Your upcoming and past bookings will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.booking_date}</TableCell>
                  <TableCell>{booking.start_time}</TableCell>
                  <TableCell><Badge variant="secondary">{booking.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell>{booking.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

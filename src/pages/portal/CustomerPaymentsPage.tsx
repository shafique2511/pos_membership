import { useEffect, useMemo, useState } from "react";
import { Download, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { getLinkedCustomer, getPortalSettings, listCustomerPaymentsAndReceipts, type CustomerPaymentRecord, type CustomerReceiptRecord } from "@/features/portal/customer-portal-service";
import { useToast } from "@/components/ui/toast";

export function CustomerPaymentsPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<CustomerPaymentRecord[]>([]);
  const [receipts, setReceipts] = useState<CustomerReceiptRecord[]>([]);
  const [allowReceiptDownload, setAllowReceiptDownload] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPayments();
  }, [auth.business?.id, auth.user?.id]);

  async function loadPayments() {
    if (!auth.business?.id || !auth.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const customer = await getLinkedCustomer(auth.business.id, auth.user.id);
      if (!customer) {
        setPayments([]);
        setReceipts([]);
        return;
      }
      const [history, settings] = await Promise.all([
        listCustomerPaymentsAndReceipts(auth.business.id, customer.id),
        getPortalSettings(auth.business.id),
      ]);
      setPayments(history.payments);
      setReceipts(history.receipts);
      setAllowReceiptDownload(Boolean(settings.allow_receipt_download));
    } catch (error) {
      toast({ title: "Payment history failed", description: error instanceof Error ? error.message : "Try again later." });
    } finally {
      setLoading(false);
    }
  }

  const receiptsByPaymentId = useMemo(() => new Map(receipts.map((receipt) => [receipt.payment_id, receipt])), [receipts]);

  if (loading) return <LoadingState title="Loading payments" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" />Payments & receipts</CardTitle>
        <CardDescription>Customer-only payment history and receipt downloads when enabled by the business.</CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <EmptyState title="No payment history" description="Your payments and receipts will appear here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const receipt = receiptsByPaymentId.get(payment.id);

                return (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.currency} {Number(payment.amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="secondary">{payment.status}</Badge></TableCell>
                    <TableCell>
                      {receipt?.file_url && allowReceiptDownload ? (
                        <a className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-secondary" href={receipt.file_url} rel="noreferrer" target="_blank">
                          <Download className="h-4 w-4" />Receipt
                        </a>
                      ) : receipt ? (
                        <span className="text-sm text-muted-foreground">{receipt.receipt_number}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not issued</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

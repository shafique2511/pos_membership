import { useEffect, useMemo, useState } from "react";
import { Download, Minus, Plus, Receipt, RefreshCcw, RotateCcw, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/shared/StateViews";
import { canExportBusinessData } from "@/lib/auth/access";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { createDailyClosing, createPosExport, createPosOrder, getPosOptions, listRecentPosOrders, refundPosOrder, type PosCartItem, type PosCatalogItem, type PosOrderRecord, type PosPaymentInput } from "@/features/pos/pos-service";

const money = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });

type Option = { id: string; label: string };

export function PosPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<PosCatalogItem[]>([]);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<Option[]>([]);
  const [orders, setOrders] = useState<PosOrderRecord[]>([]);
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [membershipBenefit, setMembershipBenefit] = useState(0);
  const [prepaidCredit, setPrepaidCredit] = useState(0);
  const [payments, setPayments] = useState<PosPaymentInput[]>([{ method_name: "Cash", amount: 0 }]);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const branchId = auth.profile?.role === "owner" ? null : auth.profile?.branch_id;

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemDiscount = useMemo(() => cart.reduce((sum, item) => sum + item.discount, 0), [cart]);
  const total = Math.max(0, subtotal - itemDiscount - discountAmount - membershipBenefit - prepaidCredit);
  const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  useEffect(() => {
    void loadPos();
  }, [auth.business?.id, auth.profile?.branch_id]);

  async function loadPos() {
    if (!auth.business?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const options = await getPosOptions(auth.business.id, branchId);
      setCustomers(options.customers);
      setStaff(options.staff);
      setPaymentMethods(options.paymentMethods);
      setCatalog(options.catalog);
      setOrders(await listRecentPosOrders(auth.business.id, branchId));
    } catch (error) {
      toast({ title: "POS data failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  function addItem(item: PosCatalogItem) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id && cartItem.type === item.type);
      if (existing) {
        return current.map((cartItem) => cartItem === existing ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
      }
      return [...current, { ...item, quantity: 1, discount: 0 }];
    });
  }

  function updatePayment(index: number, value: Partial<PosPaymentInput>) {
    setPayments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item));
  }

  async function checkout() {
    if (!auth.business?.id || !auth.user?.id || cart.length === 0) return;
    const orderId = await createPosOrder({
      businessId: auth.business.id,
      branchId,
      customerId: customerId || null,
      staffId: staffId || null,
      userId: auth.user.id,
      cart,
      payments,
      discountAmount,
      loyaltyPointsRedeemed: loyaltyPoints,
      prepaidCreditUsed: prepaidCredit,
      membershipBenefitAmount: membershipBenefit,
      notes: "POS checkout",
    });
    toast({ title: "Checkout completed", description: `Order ${orderId.slice(0, 8)} created with receipts and payment records.` });
    setCart([]);
    setDiscountAmount(0);
    setLoyaltyPoints(0);
    setMembershipBenefit(0);
    setPrepaidCredit(0);
    setPayments([{ method_name: "Cash", amount: 0 }]);
    await loadPos();
  }

  async function refund(order: PosOrderRecord) {
    if (!auth.business?.id || !auth.user?.id) return;
    await refundPosOrder(auth.business.id, auth.user.id, order);
    toast({ title: "Refund recorded", description: order.order_number });
    await loadPos();
  }

  async function closeDay() {
    if (!auth.business?.id || !auth.user?.id) return;
    const total = await createDailyClosing(auth.business.id, branchId, auth.user.id);
    toast({ title: "Daily closing recorded", description: `Total sales ${money.format(total)}` });
  }

  async function exportPos(format: "csv" | "json") {
    if (!auth.business?.id || !auth.user?.id) return;
    const exportId = await createPosExport({
      businessId: auth.business.id,
      branchId,
      userId: auth.user.id,
      dateFrom,
      dateTo,
      staffId,
      customerId,
      paymentMethodId: paymentMethodFilter,
      format,
    });
    toast({ title: "POS export requested", description: `Export ${exportId.slice(0, 8)} includes orders, items, receipts, refunds, discounts, and payments.` });
    setExportOpen(false);
  }

  if (loading) return <LoadingState title="Loading POS" />;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">POS</h1>
            <p className="mt-1 text-sm text-muted-foreground">Product, service, membership sales, split payment, loyalty, prepaid credit, receipts, refunds, and inventory deduction.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canExportBusinessData(auth) ? <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" />Export</Button> : null}
            <Button variant="outline" onClick={closeDay}><Receipt className="h-4 w-4" />Daily closing</Button>
            <Button variant="ghost" onClick={() => void loadPos()}><RefreshCcw className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catalog</CardTitle>
            <CardDescription>Products, services, and membership plans.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.length === 0 ? <EmptyState title="No catalog items" description="Add products, services, or membership plans first." /> : catalog.map((item) => (
              <button key={`${item.type}-${item.id}`} className="rounded-lg border p-4 text-left hover:bg-secondary" onClick={() => addItem(item)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.type}</p>
                  </div>
                  <Badge variant="secondary">{money.format(item.price)}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent POS orders</CardTitle>
            <CardDescription>Refunds are recorded as negative payment records.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.order_number}</TableCell>
                    <TableCell>{money.format(order.total_amount)}</TableCell>
                    <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => refund(order)}><RotateCcw className="h-4 w-4" />Refund</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" />Cart</CardTitle>
          <CardDescription>Walk-in or existing customer checkout.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Select label="Customer" value={customerId} options={[{ id: "", label: "Walk-in customer" }, ...customers]} onChange={setCustomerId} />
          <Select label="Cashier / Staff" value={staffId} options={[{ id: "", label: "Unassigned" }, ...staff]} onChange={setStaffId} />
          <div className="grid gap-2">
            {cart.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{money.format(item.price)} x {item.quantity}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setCart((current) => current.filter((cartItem) => cartItem !== item))}><Minus className="h-4 w-4" /></Button>
                </div>
                <Input className="mt-2" type="number" value={item.discount} onChange={(event) => setCart((current) => current.map((cartItem) => cartItem === item ? { ...cartItem, discount: Number(event.target.value) } : cartItem))} placeholder="Item discount" />
              </div>
            ))}
          </div>
          <NumberField label="Discount" value={discountAmount} onChange={setDiscountAmount} />
          <NumberField label="Loyalty points redeemed" value={loyaltyPoints} onChange={setLoyaltyPoints} />
          <NumberField label="Membership benefit" value={membershipBenefit} onChange={setMembershipBenefit} />
          <NumberField label="Prepaid credit" value={prepaidCredit} onChange={setPrepaidCredit} />
          <div className="grid gap-2">
            <p className="text-sm font-medium">Split payments</p>
            {payments.map((payment, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px] gap-2">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={payment.payment_method_id ?? ""} onChange={(event) => {
                  const option = paymentMethods.find((method) => method.id === event.target.value);
                  updatePayment(index, { payment_method_id: event.target.value || null, method_name: option?.label ?? "Manual" });
                }}>
                  <option value="">Manual</option>
                  {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
                </select>
                <Input type="number" value={payment.amount} onChange={(event) => updatePayment(index, { amount: Number(event.target.value) })} />
              </div>
            ))}
            <Button variant="outline" onClick={() => setPayments((current) => [...current, { method_name: "Manual", amount: 0 }])}><Plus className="h-4 w-4" />Payment</Button>
          </div>
          <div className="grid gap-1 rounded-lg border p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money.format(subtotal)}</span></div>
            <div className="flex justify-between"><span>Discounts</span><span>{money.format(itemDiscount + discountAmount + membershipBenefit + prepaidCredit)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{money.format(total)}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>{money.format(paid)}</span></div>
          </div>
          <Button disabled={cart.length === 0 || paid < total} onClick={checkout}>Checkout & generate receipt</Button>
        </CardContent>
      </Card>

      <Dialog open={exportOpen} title="Export POS data" description="Owner export includes orders, items, receipts, refunds, discounts, payment records, and inventory deductions." onClose={() => setExportOpen(false)}>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label="From" value={dateFrom} onChange={setDateFrom} />
            <DateField label="To" value={dateTo} onChange={setDateTo} />
            <Select label="Payment method" value={paymentMethodFilter} options={[{ id: "", label: "All" }, ...paymentMethods]} onChange={setPaymentMethodFilter} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => exportPos("json")}>JSON</Button>
            <Button onClick={() => exportPos("csv")}>CSV</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.id || option.label} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

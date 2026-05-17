import { useEffect, useMemo, useState } from "react";
import { Download, PackagePlus, Plus, RefreshCcw } from "lucide-react";
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
import {
  createCategory,
  createInventoryExport,
  createSupplier,
  getInventoryOptions,
  listInventoryTransactions,
  listProducts,
  recordStockMovement,
  upsertProduct,
  type InventoryMovementType,
  type InventoryOption,
  type InventoryTransaction,
  type ProductFormValues,
  type ProductRecord,
} from "@/features/inventory/inventory-service";

const movementTypes = ["all", "stock_in", "stock_out", "adjustment", "transfer_in", "transfer_out", "sale_return"];
const money = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });

export function InventoryPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [options, setOptions] = useState({ branches: [] as InventoryOption[], categories: [] as InventoryOption[], suppliers: [] as InventoryOption[] });
  const [productOpen, setProductOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [branchId, setBranchId] = useState(auth.profile?.role === "owner" ? "" : auth.profile?.branch_id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [movementType, setMovementType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const businessId = auth.business?.id;
  const userId = auth.user?.id;
  const lowStock = products.filter((product) => product.track_inventory && product.stock_quantity <= product.low_stock_threshold);
  const profitPotential = useMemo(() => products.reduce((sum, item) => sum + (item.selling_price - item.cost_price) * item.stock_quantity, 0), [products]);

  useEffect(() => {
    void loadInventory();
  }, [businessId, branchId, categoryId, supplierId, movementType, dateFrom, dateTo]);

  async function loadInventory() {
    if (!businessId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const scopedBranchId = branchId || (auth.profile?.role === "owner" ? null : auth.profile?.branch_id);
      const [nextOptions, nextProducts, nextTransactions] = await Promise.all([
        getInventoryOptions(businessId, scopedBranchId),
        listProducts({ businessId, branchId: scopedBranchId, categoryId, supplierId }),
        listInventoryTransactions({ businessId, branchId: scopedBranchId, movementType, dateFrom, dateTo }),
      ]);
      setOptions(nextOptions);
      setProducts(nextProducts);
      setTransactions(nextTransactions);
    } catch (error) {
      toast({ title: "Inventory failed", description: error instanceof Error ? error.message : "Check Supabase RLS." });
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct(values: ProductFormValues) {
    if (!businessId || !userId) return;
    await upsertProduct(businessId, userId, values, editingProduct?.id);
    toast({ title: editingProduct ? "Product updated" : "Product created" });
    setProductOpen(false);
    setEditingProduct(null);
    await loadInventory();
  }

  async function createQuickCategory() {
    if (!businessId || !userId) return;
    const name = window.prompt("Category name");
    if (!name) return;
    await createCategory(businessId, userId, name, branchId || null);
    toast({ title: "Category created" });
    await loadInventory();
  }

  async function createQuickSupplier() {
    if (!businessId || !userId) return;
    const name = window.prompt("Supplier name");
    if (!name) return;
    await createSupplier(businessId, userId, name, branchId || null);
    toast({ title: "Supplier created" });
    await loadInventory();
  }

  async function exportInventory(format: "csv" | "json") {
    if (!businessId || !userId) return;
    const exportId = await createInventoryExport({ businessId, branchId: branchId || null, userId, categoryId, supplierId, movementType, dateFrom, dateTo, format });
    toast({ title: "Inventory export requested", description: `Export ${exportId.slice(0, 8)} includes products, categories, suppliers, stock levels, and stock transfers.` });
    setExportOpen(false);
  }

  if (loading) return <LoadingState title="Loading inventory" />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Products, suppliers, stock movement, branch inventory, low-stock alerts, profit, and POS deductions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={createQuickCategory}>Category</Button>
          <Button variant="outline" onClick={createQuickSupplier}>Supplier</Button>
          {canExportBusinessData(auth) ? <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" />Export</Button> : null}
          <Button onClick={() => { setEditingProduct(null); setProductOpen(true); }}><Plus className="h-4 w-4" />Product</Button>
          <Button variant="ghost" onClick={() => void loadInventory()}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Products" value={products.length} />
        <Metric label="Low stock alerts" value={lowStock.length} />
        <Metric label="Stock units" value={products.reduce((sum, item) => sum + item.stock_quantity, 0)} />
        <Metric label="Profit potential" value={money.format(profitPotential)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and export by branch, product category, supplier, date range, and stock movement type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <Select label="Branch" value={branchId} options={[{ id: "", label: "All" }, ...options.branches]} onChange={setBranchId} disabled={auth.profile?.role !== "owner"} />
          <Select label="Category" value={categoryId} options={[{ id: "", label: "All" }, ...options.categories]} onChange={setCategoryId} />
          <Select label="Supplier" value={supplierId} options={[{ id: "", label: "All" }, ...options.suppliers]} onChange={setSupplierId} />
          <Select label="Movement" value={movementType} options={movementTypes.map((type) => ({ id: type, label: type.replace(/_/g, " ") }))} onChange={setMovementType} />
          <DateField label="From" value={dateFrom} onChange={setDateFrom} />
          <DateField label="To" value={dateTo} onChange={setDateTo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Cost price, selling price, stock levels, low-stock threshold, and profit calculation.</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? <EmptyState title="No products" description="Create products to start stock tracking." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Selling</TableHead>
                  <TableHead>Profit/unit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}{product.stock_quantity <= product.low_stock_threshold ? <Badge className="ml-2" variant="secondary">Low</Badge> : null}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>{money.format(product.cost_price)}</TableCell>
                    <TableCell>{money.format(product.selling_price)}</TableCell>
                    <TableCell>{money.format(product.selling_price - product.cost_price)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingProduct(product); setProductOpen(true); }}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedProduct(product); setMovementOpen(true); }}><PackagePlus className="h-4 w-4" />Stock</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory report</CardTitle>
          <CardDescription>Manual movements, stock transfers, adjustments, and auto stock deduction from POS.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.transaction_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.reference_type || "manual"}</TableCell>
                  <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={productOpen} title={editingProduct ? "Edit product" : "Create product"} description="Configure category, supplier, cost, selling price, and stock alert." onClose={() => setProductOpen(false)}>
        <ProductForm product={editingProduct} options={options} onCancel={() => setProductOpen(false)} onSubmit={saveProduct} />
      </Dialog>

      <Dialog open={movementOpen} title="Stock movement" description="Stock in, stock out, adjustment, transfer, or sale return." onClose={() => setMovementOpen(false)}>
        {selectedProduct ? <MovementForm product={selectedProduct} onCancel={() => setMovementOpen(false)} onSubmit={async (type, quantity, note) => {
          if (!businessId || !userId) return;
          await recordStockMovement({ businessId, branchId: branchId || null, product: selectedProduct, userId, type, quantity, note });
          toast({ title: "Stock movement recorded" });
          setMovementOpen(false);
          await loadInventory();
        }} /> : null}
      </Dialog>

      <Dialog open={exportOpen} title="Export inventory data" description="Owner export includes products, categories, suppliers, stock levels, transfers, and inventory transactions." onClose={() => setExportOpen(false)}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => exportInventory("json")}>JSON</Button>
          <Button onClick={() => exportInventory("csv")}>CSV</Button>
        </div>
      </Dialog>
    </div>
  );
}

function ProductForm({ product, options, onCancel, onSubmit }: { product: ProductRecord | null; options: { branches: InventoryOption[]; categories: InventoryOption[]; suppliers: InventoryOption[] }; onCancel: () => void; onSubmit: (values: ProductFormValues) => Promise<void> }) {
  const [values, setValues] = useState<ProductFormValues>({
    branch_id: product?.branch_id ?? null,
    category_id: product?.category_id ?? null,
    supplier_id: product?.supplier_id ?? null,
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    cost_price: product?.cost_price ?? 0,
    selling_price: product?.selling_price ?? 0,
    stock_quantity: product?.stock_quantity ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 0,
    track_inventory: product?.track_inventory ?? true,
  });
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void onSubmit(values); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Branch" value={values.branch_id ?? ""} options={[{ id: "", label: "None" }, ...options.branches]} onChange={(value) => setValues({ ...values, branch_id: value || null })} />
        <Select label="Category" value={values.category_id ?? ""} options={[{ id: "", label: "None" }, ...options.categories]} onChange={(value) => setValues({ ...values, category_id: value || null })} />
        <Select label="Supplier" value={values.supplier_id ?? ""} options={[{ id: "", label: "None" }, ...options.suppliers]} onChange={(value) => setValues({ ...values, supplier_id: value || null })} />
        <Field label="SKU" value={values.sku ?? ""} onChange={(value) => setValues({ ...values, sku: value })} />
        <Field label="Name" value={values.name} onChange={(value) => setValues({ ...values, name: value })} />
        <NumberField label="Cost price" value={values.cost_price} onChange={(value) => setValues({ ...values, cost_price: value })} />
        <NumberField label="Selling price" value={values.selling_price} onChange={(value) => setValues({ ...values, selling_price: value })} />
        <NumberField label="Stock quantity" value={values.stock_quantity} onChange={(value) => setValues({ ...values, stock_quantity: value })} />
        <NumberField label="Low stock threshold" value={values.low_stock_threshold} onChange={(value) => setValues({ ...values, low_stock_threshold: value })} />
      </div>
      <label className="flex items-center gap-3 text-sm"><input className="h-4 w-4 accent-primary" type="checkbox" checked={values.track_inventory} onChange={(event) => setValues({ ...values, track_inventory: event.target.checked })} />Track inventory</label>
      <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Save product</Button></div>
    </form>
  );
}

function MovementForm({ product, onCancel, onSubmit }: { product: ProductRecord; onCancel: () => void; onSubmit: (type: InventoryMovementType, quantity: number, note: string) => Promise<void> }) {
  const [type, setType] = useState<InventoryMovementType>("stock_in");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void onSubmit(type, quantity, note); }}>
      <p className="text-sm text-muted-foreground">{product.name} current stock: {product.stock_quantity}</p>
      <Select label="Movement type" value={type} options={movementTypes.filter((item) => item !== "all").map((item) => ({ id: item, label: item.replace(/_/g, " ") }))} onChange={(value) => setType(value as InventoryMovementType)} />
      <NumberField label="Quantity" value={quantity} onChange={setQuantity} />
      <Field label="Note" value={note} onChange={setNote} />
      <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Record movement</Button></div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><CardHeader><CardDescription>{label}</CardDescription><CardTitle>{value}</CardTitle></CardHeader></Card>;
}

function Select({ label, value, options, onChange, disabled }: { label: string; value: string; options: InventoryOption[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="grid gap-2"><Label>{label}</Label><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.id || option.label} value={option.id}>{option.label}</option>)}</select></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="grid gap-2"><Label>{label}</Label><Input type="date" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

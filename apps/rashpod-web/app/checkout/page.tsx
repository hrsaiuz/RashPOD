"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Circle, Plus, X } from "lucide-react";
import { ApiError, api, type Order } from "../../lib/api";
import { FreeDeliveryBar, useCart, type CartItem } from "../../components/cart/CartProvider";
import { Button, formatPrice, FormField, Input, PageContainer } from "@rashpod/ui";

type CheckoutStep = "address" | "shipping" | "payment";
type AuthState = "checking" | "guest" | "authed";

const STEP_LABELS: Array<{ key: CheckoutStep; label: string }> = [
  { key: "address", label: "Address" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>("address");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [selectedAddress, setSelectedAddress] = useState("home");
  const [selectedShipping, setSelectedShipping] = useState("free");
  const [customerName, setCustomerName] = useState("Huzefa Bagwala");
  const [customerPhone, setCustomerPhone] = useState("+998901234567");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("1131 Dusty Townline, Tashkent");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverCartCount, setServerCartCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = (await res.json()) as { user?: unknown };
        if (cancelled) return;
        if (data.user) {
          setAuthState("authed");
          const serverCart = await api.get<{ items?: unknown[] }>("/cart").catch(() => ({ items: [] }));
          if (!cancelled) setServerCartCount(serverCart.items?.length ?? 0);
        } else {
          setAuthState("guest");
          window.location.href = `/auth/login?next=${encodeURIComponent("/checkout")}`;
        }
      } catch {
        if (!cancelled) {
          setAuthState("guest");
          window.location.href = `/auth/login?next=${encodeURIComponent("/checkout")}`;
        }
      }
    }
    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const canContinue = (items.length > 0 || serverCartCount > 0) && authState === "authed";

  async function placeOrder() {
    if (!canContinue) return;
    setPlacingOrder(true);
    setError(null);
    try {
      await syncLocalCartToServer(items);
      const order = await api.post<Order>("/orders", {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        deliveryType: selectedShipping === "priority" ? "PRIORITY" : "STANDARD",
        deliveryZone: "UZ",
        deliveryAddress,
        pickupLocation: selectedAddress === "pickup" ? "RashPOD pickup counter" : undefined,
        customerNote: `Address profile: ${selectedAddress}. Shipping: ${selectedShipping}.`,
        paymentMethod: "CLICK",
      });
      const payment = await api.post<{ paymentId: string; checkoutUrl?: string }>("/payments/click/create", { orderId: order.id });
      clearCart();
      window.location.href = payment.checkoutUrl || `/checkout/success?orderId=${encodeURIComponent(order.id)}&paymentId=${encodeURIComponent(payment.paymentId)}`;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        window.location.href = `/auth/login?next=${encodeURIComponent("/checkout")}`;
        return;
      }
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PageContainer variant="storefront" compact className="pb-16 pt-4">
        <BreadcrumbTrail />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <section>
            <StepNav active={step} setStep={setStep} />
            {authState === "checking" ? <p className="mt-12 text-brand-muted">Checking your session...</p> : null}
            {items.length === 0 && serverCartCount === 0 && authState === "authed" ? (
              <div className="mt-12 max-w-form rounded-md bg-brand-bg p-8">
                <h1 className="text-h3 font-bold text-brand-ink">Your cart is empty</h1>
                <p className="mt-3 text-brand-muted">Add a product before starting checkout.</p>
                <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-pill bg-brand-peach px-6 text-sm font-semibold text-white hover:opacity-90">
                  Browse shop
                </Link>
              </div>
            ) : null}
            {items.length > 0 || serverCartCount > 0 ? (
              <>
                {step === "address" ? (
                  <AddressStep
                    selected={selectedAddress}
                    onSelect={setSelectedAddress}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    customerEmail={customerEmail}
                    deliveryAddress={deliveryAddress}
                    setCustomerName={setCustomerName}
                    setCustomerPhone={setCustomerPhone}
                    setCustomerEmail={setCustomerEmail}
                    setDeliveryAddress={setDeliveryAddress}
                  />
                ) : null}
                {step === "shipping" ? <ShippingStep selected={selectedShipping} onSelect={setSelectedShipping} /> : null}
                {step === "payment" ? <PaymentStep /> : null}
              </>
            ) : null}
          </section>

          <OrderSummaryPanel serverCartCount={serverCartCount} />
        </div>

        {error ? <p className="mt-8 text-right text-sm font-bold text-semantic-dangerText">{error}</p> : null}
        <div className="mt-8 flex justify-end">
          {step !== "payment" ? (
            <Button
              disabled={!canContinue}
              onClick={() => setStep(step === "address" ? "shipping" : "payment")}
              variant="primaryPeach"
              size="lg"
            >
              Continue
            </Button>
          ) : (
            <Button
              disabled={!canContinue || placingOrder}
              onClick={placeOrder}
              variant="primaryPeach"
              size="lg"
              loading={placingOrder}
            >
              {placingOrder ? "Preparing Click payment..." : "Place Your Order and Pay"}
            </Button>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

async function syncLocalCartToServer(items: CartItem[]) {
  if (items.length === 0) return;
  const serverCart = await api.get<{ items?: Array<{ id: string }> }>("/cart");
  await Promise.all((serverCart.items || []).map((item) => api.delete(`/cart/items/${item.id}`)));
  for (const item of items) {
    await api.post("/cart", {
      listingId: item.listingId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      material: item.material,
      printSide: item.printSide,
    });
  }
}

function BreadcrumbTrail() {
  return (
    <nav className="inline-flex min-h-10 items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
      {["Home", "Category", "Tshirts", "Products"].map((item) => (
        <span key={item} className="flex shrink-0 items-center gap-3 sm:gap-5">
          <Link href={item === "Home" ? "/" : "/shop"} className="hover:text-brand-blue">{item}</Link>
          <ChevronRight size={18} className="text-brand-subtle" />
        </span>
      ))}
      <span className="shrink-0 font-bold text-brand-ink">Checkout</span>
    </nav>
  );
}

function StepNav({ active, setStep }: { active: CheckoutStep; setStep: (step: CheckoutStep) => void }) {
  return (
    <div className="-mx-1 flex items-center gap-3 overflow-x-auto pb-2 text-base sm:gap-6 sm:text-h3">
      {STEP_LABELS.map((step, index) => (
        <span key={step.key} className="flex shrink-0 items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => setStep(step.key)}
            className={`rounded-pill px-3 py-1.5 sm:px-4 ${active === step.key ? "bg-brand-blueLight font-bold text-brand-ink" : "text-brand-muted"}`}
          >
            {step.label}
          </button>
          {index < STEP_LABELS.length - 1 ? <ChevronRight size={18} className="text-brand-subtle" /> : null}
        </span>
      ))}
    </div>
  );
}

function AddressStep({
  selected,
  onSelect,
  customerName,
  customerPhone,
  customerEmail,
  deliveryAddress,
  setCustomerName,
  setCustomerPhone,
  setCustomerEmail,
  setDeliveryAddress,
}: {
  selected: string;
  onSelect: (value: string) => void;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setCustomerEmail: (value: string) => void;
  setDeliveryAddress: (value: string) => void;
}) {
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Choose Your Address</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <CheckoutInput label="Full name" value={customerName} onChange={setCustomerName} />
        <CheckoutInput label="Phone" value={customerPhone} onChange={setCustomerPhone} />
        <CheckoutInput label="Email" value={customerEmail} onChange={setCustomerEmail} type="email" />
        <CheckoutInput label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} />
      </div>
      <AddressRow
        checked={selected === "home"}
        onClick={() => onSelect("home")}
        name={customerName || "Home address"}
        type="Home"
        address={deliveryAddress || "1131 Dusty Townline, Tashkent"}
        phone={customerPhone}
      />
      <AddressRow
        checked={selected === "office"}
        onClick={() => onSelect("office")}
        name="Office"
        type="Office"
        address="1219 Harvest Path, Tashkent"
        phone={customerPhone}
      />
      <button type="button" onClick={() => onSelect("pickup")} className="mt-6 inline-flex min-h-11 items-center gap-3 text-base text-brand-blue">
        <Plus size={18} /> Pickup counter
      </button>
    </div>
  );
}

function CheckoutInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <FormField label={label}>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  );
}

function AddressRow({ checked, onClick, name, type, address, phone }: { checked: boolean; onClick: () => void; name: string; type: string; address: string; phone?: string }) {
  return (
    <div className="border-b border-brand-line py-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button type="button" onClick={onClick} className="flex items-start gap-4 text-left">
          <span className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${checked ? "border-brand-blue" : "border-brand-subtle"}`}>
            {checked ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
          </span>
          <span>
            <span className="flex flex-wrap items-center gap-3">
              <span className={`text-h3 ${checked ? "text-brand-ink" : "text-brand-muted"}`}>{name}</span>
              <span className="rounded-xs border border-brand-blue px-2 py-0.5 text-caption text-brand-blue">{type}</span>
            </span>
            <span className="mt-3 block text-body text-brand-muted">{address}</span>
            {phone ? <span className="mt-2 block text-body text-brand-muted">Contact — {phone}</span> : null}
          </span>
        </button>
        <div className="flex gap-4 text-sm text-brand-muted sm:mt-1">
          <button type="button" className="hover:text-brand-ink">Edit</button>
          <span className="text-brand-line">|</span>
          <button type="button" className="text-brand-peach hover:opacity-80">Remove</button>
        </div>
      </div>
    </div>
  );
}

function ShippingStep({ selected, onSelect }: { selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Shipment Method</h1>
      <div className="mt-6 overflow-hidden rounded-md bg-brand-surface shadow-soft">
        {[
          ["free", "Free", "You get free shipping"],
          ["priority", "105 000 UZS", "Priority Shipping"],
          ["schedule", "Schedule", "Choose a date that works for you."],
        ].map((row) => (
          <button key={row[0]} type="button" onClick={() => onSelect(row[0])} className="flex w-full flex-col gap-3 border-b border-brand-line px-4 py-4 text-left last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span className="flex items-center gap-4 text-body text-brand-muted">
              <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-2 ${selected === row[0] ? "border-brand-blue" : "border-brand-subtle"}`}>
                {selected === row[0] ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
              </span>
              <span className="font-medium text-brand-ink">{row[1]}</span>
              <span>{row[2]}</span>
            </span>
            {row[0] === "schedule" ? (
              <span className="flex items-center gap-2 text-sm text-brand-muted sm:pl-8">
                Select Date <ChevronDown size={16} /> <CalendarDays size={20} />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md bg-brand-surface p-4 shadow-soft">
          <div className="flex items-center justify-between text-sm text-brand-ink">
            <span>Choose delivery time</span>
            <ChevronDown size={15} />
            <span className="text-caption text-brand-muted">19 SEP</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["7 am–12 pm", "12 pm–6 pm", "6 pm–9 pm"].map((time, index) => (
              <span key={time} className={`rounded-xs px-3 py-1.5 text-sm ${index === 0 ? "bg-brand-peach text-white" : "bg-brand-bg text-brand-ink"}`}>{time}</span>
            ))}
          </div>
        </div>
        <CalendarMock />
      </div>
    </div>
  );
}

function CalendarMock() {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <div className="rounded-md bg-brand-surface p-5 shadow-soft sm:p-7">
      <div className="mb-6 flex items-center justify-between text-brand-muted">
        <ChevronLeft size={18} />
        <span className="font-bold text-brand-ink">September 2026</span>
        <ChevronRight size={18} />
      </div>
      <div className="mb-4 grid grid-cols-7 gap-2 text-center text-caption font-bold uppercase tracking-wider text-brand-subtle">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-base font-bold text-brand-muted">
        {days.map((day) => (
          <span key={day} className={day === 19 ? "grid h-8 w-8 place-items-center rounded-full bg-brand-blue text-white" : ""}>{day}</span>
        ))}
      </div>
    </div>
  );
}

function PaymentStep() {
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Payment Method</h1>
      <div className="mt-6 divide-y divide-brand-line">
        <div className="flex flex-wrap items-center gap-4 py-4">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-brand-blue">
            <span className="h-2 w-2 rounded-full bg-brand-blue" />
          </span>
          <span className="grid h-5 min-w-9 place-items-center rounded-xs bg-brand-peach px-2 text-caption font-black text-white">Click</span>
          <span className="text-base text-brand-ink">Click Uz payment</span>
          <button type="button" className="ml-auto text-brand-peach hover:opacity-80">Remove</button>
        </div>
        <button type="button" className="flex min-h-11 items-center gap-4 py-4 text-brand-blue">
          <Plus size={18} /> Add payment method
        </button>
      </div>
      <p className="mt-6 max-w-form text-body leading-relaxed text-brand-muted">
        You will be routed through the Click payment flow after the order is created. RashPOD does not collect or store card numbers.
      </p>
    </div>
  );
}

const FREE_DELIVERY_TARGET = 500_000;

function OrderSummaryPanel({ serverCartCount }: { serverCartCount: number }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const remaining = Math.max(0, FREE_DELIVERY_TARGET - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_TARGET) * 100);
  return (
    <aside className="rounded-md bg-brand-bg p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-section font-bold uppercase text-brand-ink">Order Summary</h2>
        <X size={22} className="text-brand-muted" />
      </div>
      <FreeDeliveryBar subtotal={subtotal} remaining={remaining} progress={progress} compact />
      <div className="mb-4 grid grid-cols-[1fr_100px_72px] rounded-xs bg-brand-peach px-4 py-2 text-caption font-bold text-white sm:grid-cols-[1fr_140px_80px]">
        <span>Product</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Total</span>
      </div>
      <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-md bg-brand-surface p-8 text-center text-brand-muted">
            {serverCartCount > 0 ? `${serverCartCount} server cart item${serverCartCount === 1 ? "" : "s"} ready for checkout.` : "Your cart is empty."}
          </div>
        ) : null}
        {items.map((item) => (
          <div key={item.key} className="grid grid-cols-[74px_1fr] items-center gap-3 rounded-md bg-brand-surface p-3 sm:grid-cols-[74px_1fr_90px_72px]">
            <div className="relative h-[74px] overflow-hidden rounded-xs bg-brand-bg">
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="74px" className="object-cover" /> : null}
            </div>
            <div>
              <h3 className="text-caption font-bold uppercase text-brand-ink line-clamp-2">{item.title}</h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-xs bg-brand-bg px-2 py-1 text-caption text-brand-blue">
                <span className="h-2 w-2 rounded-full bg-brand-blue" /> {item.size}
              </span>
              <p className="mt-2 flex items-center gap-1 text-caption uppercase text-brand-muted"><Circle size={11} /> {item.color}</p>
            </div>
            <div className="col-start-2 sm:col-start-auto">
              <div className="inline-flex h-7 min-w-[72px] items-center justify-between rounded-pill bg-brand-bg px-3 text-xs font-bold text-brand-ink">
                <button type="button" onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}>-</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
              </div>
              <button type="button" onClick={() => removeItem(item.key)} className="mt-2 text-caption font-medium text-brand-peach">Remove</button>
            </div>
            <p className="text-right text-sm font-bold tabular-nums text-brand-ink sm:text-base">{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

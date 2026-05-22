"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Circle, Plus, X } from "lucide-react";
import { ApiError, api, type Order } from "../../lib/api";
import { FreeDeliveryBar, useCart, type CartItem } from "../../components/cart/CartProvider";

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
      <div className="mx-auto max-w-[1232px] px-5 pb-16 pt-4">
        <BreadcrumbTrail />
        <div className="mt-10 grid gap-16 lg:grid-cols-[1fr_470px]">
          <section>
            <StepNav active={step} setStep={setStep} />
            {authState === "checking" ? <p className="mt-12 text-brand-muted">Checking your session...</p> : null}
            {items.length === 0 && serverCartCount === 0 && authState === "authed" ? (
              <div className="mt-12 max-w-[520px] rounded-[12px] bg-brand-bg p-8">
                <h1 className="text-[24px] font-black text-black">Your cart is empty</h1>
                <p className="mt-3 text-brand-muted">Add a product before starting checkout.</p>
                <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-[13px] bg-brand-peach px-6 font-bold text-white">Browse shop</Link>
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

        {error ? <p className="mt-8 text-right text-sm font-bold text-red-600">{error}</p> : null}
        <div className="mt-8 flex justify-end">
          {step !== "payment" ? (
            <button
              disabled={!canContinue}
              onClick={() => setStep(step === "address" ? "shipping" : "payment")}
              className="h-[50px] min-w-[126px] rounded-[14px] bg-brand-peach px-7 text-[20px] font-bold lowercase text-white disabled:opacity-50"
            >
              countinue
            </button>
          ) : (
            <button
              disabled={!canContinue || placingOrder}
              onClick={placeOrder}
              className="h-[50px] min-w-[235px] rounded-[14px] bg-brand-peach px-7 text-[18px] font-bold text-white disabled:opacity-50"
            >
              {placingOrder ? "Preparing Click payment..." : "Place Your Order and Pay"}
            </button>
          )}
        </div>
      </div>
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
    <nav className="inline-flex min-h-[39px] items-center gap-5 rounded-[9px] bg-brand-bg px-4 text-[18px] text-[#3B3B43]">
      {["Home", "Category", "Tshirts", "Products"].map((item) => (
        <span key={item} className="contents">
          <Link href={item === "Home" ? "/" : item === "Products" ? "/shop" : "/shop"}>{item}</Link>
          <ChevronRight size={21} strokeWidth={2.1} />
        </span>
      ))}
      <span className="font-bold text-[#33333A]">Checkout</span>
    </nav>
  );
}

function StepNav({ active, setStep }: { active: CheckoutStep; setStep: (step: CheckoutStep) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-8 text-[22px]">
      {STEP_LABELS.map((step, index) => (
        <span key={step.key} className="contents">
          <button onClick={() => setStep(step.key)} className={active === step.key ? "font-black text-[#33333A]" : "font-normal text-[#4D4D55]"}>
            {step.label}
          </button>
          {index < STEP_LABELS.length - 1 ? <ChevronRight size={20} /> : null}
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
    <div className="mt-12 max-w-[650px]">
      <h1 className="text-[20px] font-medium text-black">Choose Your Address</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <CheckoutInput label="Full name" value={customerName} onChange={setCustomerName} />
        <CheckoutInput label="Phone" value={customerPhone} onChange={setCustomerPhone} />
        <CheckoutInput label="Email" value={customerEmail} onChange={setCustomerEmail} type="email" />
        <CheckoutInput label="Delivery address" value={deliveryAddress} onChange={setDeliveryAddress} />
      </div>
      <AddressRow
        checked={selected === "home"}
        onClick={() => onSelect("home")}
        name="Huzefa Bagwala"
        type="Home"
        address="1131 Dusty Townline, Jacksonville, TX 40322"
      />
      <AddressRow
        checked={selected === "office"}
        onClick={() => onSelect("office")}
        name="IndiaTech"
        type="OFFICE"
        address="1219 Harvest Path, Jacksonville, TX 40326"
      />
      <button onClick={() => onSelect("pickup")} className="mt-7 inline-flex items-center gap-4 text-[16px] text-brand-blue">
        <Plus size={18} /> Pickup counter
      </button>
    </div>
  );
}

function CheckoutInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-[12px] font-bold uppercase text-[#555]">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-[8px] border border-[#DDE2F4] bg-white px-3 text-[14px] font-medium text-[#33333A] outline-none focus:border-brand-blue"
      />
    </label>
  );
}

function AddressRow({ checked, onClick, name, type, address }: { checked: boolean; onClick: () => void; name: string; type: string; address: string }) {
  return (
    <div className="border-b border-[#DDE2F4] py-8">
      <div className="flex items-start justify-between gap-5">
        <button onClick={onClick} className="flex items-start gap-4 text-left">
          <span className={`mt-1 grid h-[18px] w-[18px] place-items-center rounded-full border-2 ${checked ? "border-brand-blue" : "border-[#A5A8B6]"}`}>
            {checked ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
          </span>
          <span>
            <span className="flex items-center gap-3">
              <span className={`text-[22px] ${checked ? "text-black" : "text-[#8A8A8A]"}`}>{name}</span>
              <span className="rounded-[4px] border border-brand-blue px-2 py-0.5 text-[11px] text-brand-blue">{type}</span>
            </span>
            <span className="mt-4 block text-[14px] text-[#555]">{address}</span>
            <span className="mt-3 block text-[14px] text-[#555]">Contact - (936) 361-0310</span>
          </span>
        </button>
        <div className="mt-1 whitespace-nowrap text-[14px]">
          <button className="text-[#555]">Edit</button>
          <span className="mx-5 text-[#D4D7E5]">|</span>
          <button className="text-brand-peach">Remove</button>
        </div>
      </div>
    </div>
  );
}

function ShippingStep({ selected, onSelect }: { selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="mt-12 max-w-[650px]">
      <h1 className="text-[20px] font-medium text-black">Shipment Method</h1>
      <div className="mt-10 rounded-[8px] bg-white shadow-[0_7px_16px_rgba(0,0,0,0.28)]">
        {[
          ["free", "Free", "You get free shipping"],
          ["priority", "$8.50", "Priority Shipping"],
          ["schedule", "Schedule", "Choose a date that works for you."],
        ].map((row) => (
          <button key={row[0]} onClick={() => onSelect(row[0])} className="flex w-full items-center justify-between border-b border-[#DDE2F4] px-5 py-3 text-left last:border-b-0">
            <span className="flex items-center gap-4 text-[15px] text-[#555]">
              <span className={`grid h-[17px] w-[17px] place-items-center rounded-full border-2 ${selected === row[0] ? "border-brand-blue" : "border-[#A5A8B6]"}`}>
                {selected === row[0] ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
              </span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
            </span>
            <span className="flex items-center gap-3 text-[14px] text-[#555]">Select Date <ChevronDown size={16} /> <CalendarDays size={20} /></span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-7 sm:grid-cols-[290px_300px]">
        <div className="h-[86px] rounded-[8px] bg-white p-4 shadow-[0_7px_16px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[14px] text-black">
            <span>Choose delivery time</span>
            <ChevronDown size={15} />
            <span className="ml-auto text-[11px] text-[#777]">19 SEP</span>
          </div>
          <div className="mt-4 flex gap-2">
            {["7 am- 12 pm", "12 pm- 6 pm", "12 PM- 6 PM"].map((time, index) => (
              <span key={time} className={`rounded-[7px] px-3 py-1 text-[13px] ${index === 0 ? "bg-brand-peach text-white" : "bg-brand-bg text-[#33333A]"}`}>{time}</span>
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
    <div className="rounded-[8px] bg-white p-7 shadow-[0_7px_16px_rgba(0,0,0,0.24)]">
      <div className="mb-7 flex items-center justify-between text-[#56616D]">
        <ChevronLeft size={18} />
        <span className="font-bold">September 2021</span>
        <ChevronRight size={18} />
      </div>
      <div className="mb-6 grid grid-cols-7 gap-4 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-[#B7BFCA]">
        {["San", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-4 text-center text-[19px] font-bold text-[#56616D]">
        {days.map((day) => <span key={day} className={day === 19 ? "grid h-8 w-8 place-items-center rounded-full bg-brand-blue text-white" : ""}>{day}</span>)}
      </div>
    </div>
  );
}

function PaymentStep() {
  return (
    <div className="mt-12 max-w-[650px]">
      <h1 className="text-[20px] font-medium text-black">Payment Method</h1>
      <div className="mt-9 divide-y divide-[#DDE2F4]">
        <div className="flex items-center gap-4 py-4">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-brand-blue"><span className="h-2 w-2 rounded-full bg-brand-blue" /></span>
          <span className="grid h-5 min-w-9 place-items-center rounded-[3px] bg-brand-peach px-2 text-[10px] font-black text-white">Click</span>
          <span className="text-[16px] text-[#33333A]">Click Uz payment</span>
          <button className="ml-auto text-brand-peach">Remove</button>
        </div>
        <button className="flex items-center gap-4 py-4 text-brand-blue">
          <Plus size={18} /> Add payment method
        </button>
      </div>
      <p className="mt-6 max-w-[520px] text-[14px] leading-6 text-[#777]">
        You will be routed through the Click payment flow after the order is created. RashPOD does not collect or store card numbers.
      </p>
    </div>
  );
}

function OrderSummaryPanel({ serverCartCount }: { serverCartCount: number }) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const remaining = Math.max(0, 50 - subtotal);
  const progress = Math.min(100, (subtotal / 50) * 100);
  return (
    <aside className="rounded-[10px] bg-brand-bg p-8 shadow-[8px_10px_16px_rgba(0,0,0,0.25)]">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-[16px] font-bold uppercase text-[#33333A]">Order Summery</h2>
        <X size={22} />
      </div>
      <FreeDeliveryBar subtotal={subtotal} remaining={remaining} progress={progress} compact />
      <div className="mb-4 grid grid-cols-[1fr_140px_80px] rounded-[4px] bg-brand-peach px-4 py-2 text-[10px] font-bold text-white">
        <span>product</span>
        <span className="text-center">Quantity</span>
        <span className="text-right">Total</span>
      </div>
      <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? <div className="rounded-[8px] bg-white p-8 text-center text-brand-muted">{serverCartCount > 0 ? `${serverCartCount} server cart item${serverCartCount === 1 ? "" : "s"} ready for checkout.` : "Your cart is empty."}</div> : null}
        {items.map((item) => (
          <div key={item.key} className="grid grid-cols-[74px_1fr_90px_72px] items-center gap-3 rounded-[8px] bg-white p-3">
            <div className="relative h-[74px] overflow-hidden rounded-[5px] bg-brand-bg">
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="74px" className="object-cover" /> : null}
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase text-black">{item.title}</h3>
              <span className="mt-3 inline-flex items-center gap-1 rounded-[4px] bg-brand-bg px-2 py-1 text-[9px] text-brand-blue">
                <span className="h-2 w-2 rounded-full bg-brand-blue" /> {item.size}
              </span>
              <p className="mt-3 flex items-center gap-1 text-[8px] uppercase text-[#777]"><Circle size={11} /> {item.color}</p>
            </div>
            <div>
              <div className="inline-flex h-[28px] min-w-[72px] items-center justify-between rounded-full bg-brand-bg px-3 text-[11px] font-black text-black">
                <button onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
              </div>
              <button onClick={() => removeItem(item.key)} className="mt-3 text-[8px] font-medium text-brand-peach">REMOVE</button>
            </div>
            <p className="text-right text-[13px] font-black text-black">${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

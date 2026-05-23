"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { ApiError, api, type Order } from "../../../lib/api";
import { FreeDeliveryBar, useCart, type CartItem } from "../../../components/cart/CartProvider";
import { Button, formatPrice, FormField, Input, PageContainer } from "@rashpod/ui";
import type { DeliveryOption, ShopSettings } from "../../../lib/shop-settings";
import { resolveFreeDeliveryThreshold } from "../../../lib/shop-settings";

type CheckoutStep = "address" | "shipping" | "payment";
type AuthState = "checking" | "guest" | "authed";

type CustomerAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  city: string;
  zone: string;
  isDefault: boolean;
};

type CustomerProfile = {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  defaultDeliveryAddress?: string;
};

type DeliveryQuote = {
  providerType: string;
  providerName: string;
  zone: string;
  etaText?: string | null;
  subtotal: number;
  deliveryPrice: number;
  total: number;
};

const STEP_LABELS: Array<{ key: CheckoutStep; label: string }> = [
  { key: "address", label: "Address" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
];

export default function CheckoutPageClient({ shopSettings }: { shopSettings: ShopSettings }) {
  const freeDeliveryThreshold = resolveFreeDeliveryThreshold(shopSettings);
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>("address");
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "pickup" | "new">("new");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [deliveryQuotes, setDeliveryQuotes] = useState<DeliveryQuote[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [addressCity, setAddressCity] = useState("Tashkent");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverCartCount, setServerCartCount] = useState(0);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const pickup = shopSettings.pickup;

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = (await res.json()) as { user?: unknown };
        if (cancelled) return;
        if (!data.user) {
          setAuthState("guest");
          return;
        }
        setAuthState("authed");
        setLoadingCheckout(true);
        const [profile, savedAddresses, serverCart] = await Promise.all([
          api.get<CustomerProfile>("/customer/profile"),
          api.get<CustomerAddress[]>("/customer/addresses").catch(() => [] as CustomerAddress[]),
          api.get<{ items?: unknown[] }>("/cart").catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setCustomerName(profile.displayName);
        setCustomerEmail(profile.email);
        setCustomerPhone(profile.phone ?? "");
        setAddresses(savedAddresses);
        setServerCartCount(serverCart.items?.length ?? 0);
        const defaultAddress = savedAddresses.find((row) => row.isDefault) ?? savedAddresses[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setCustomerName(defaultAddress.recipientName);
          setCustomerPhone(defaultAddress.phone);
          setDeliveryAddress(defaultAddress.line1);
          setAddressCity(defaultAddress.city);
          setAddressLabel(defaultAddress.label);
        } else if (profile.defaultDeliveryAddress) {
          setDeliveryAddress(profile.defaultDeliveryAddress);
          setSelectedAddressId("new");
        }
      } catch {
        if (!cancelled) setAuthState("guest");
      } finally {
        if (!cancelled) {
          setLoadingCheckout(false);
          setAuthState((current) => (current === "checking" ? "guest" : current));
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const deliveryZone = useMemo(() => {
    if (selectedAddressId === "pickup") return pickup?.zone ?? "Workshop";
    const selected = addresses.find((row) => row.id === selectedAddressId);
    return selected?.zone ?? "UZ";
  }, [addresses, pickup?.zone, selectedAddressId]);

  useEffect(() => {
    if (authState !== "authed" || subtotal <= 0) return;
    let cancelled = false;
    async function loadQuotes() {
      try {
        const options = shopSettings.deliveryOptions.filter((row) =>
          selectedAddressId === "pickup" ? row.providerType === "PICKUP" : row.providerType !== "PICKUP",
        );
        const quotes = await Promise.all(
          options.map(async (option) => {
            try {
              return await api.post<DeliveryQuote>("/delivery/quote", {
                zone: option.zone,
                providerType: option.providerType,
                subtotal,
              });
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const valid = quotes.filter((row): row is DeliveryQuote => row != null);
        setDeliveryQuotes(valid);
        if (!selectedProvider && valid[0]) setSelectedProvider(valid[0].providerType);
      } catch {
        if (!cancelled) setDeliveryQuotes([]);
      }
    }
    void loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [authState, selectedAddressId, selectedProvider, shopSettings.deliveryOptions, subtotal]);

  const selectedQuote = deliveryQuotes.find((row) => row.providerType === selectedProvider) ?? deliveryQuotes[0] ?? null;
  const canContinue = (items.length > 0 || serverCartCount > 0) && authState === "authed";

  const validateStep = useCallback(
    (target: CheckoutStep) => {
      const nextErrors: Record<string, string> = {};
      if (target !== "address") {
        if (selectedAddressId === "pickup") {
          if (!pickup) nextErrors.pickup = "Pickup is not available right now.";
        } else {
          if (!customerName.trim()) nextErrors.customerName = "Full name is required.";
          if (!customerPhone.trim()) nextErrors.customerPhone = "Phone is required.";
          if (!deliveryAddress.trim()) nextErrors.deliveryAddress = "Delivery address is required.";
          if (!addressCity.trim()) nextErrors.addressCity = "City is required.";
        }
      }
      if (target === "payment" && !selectedQuote) nextErrors.shipping = "Choose a shipping method.";
      setFieldErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [addressCity, customerName, customerPhone, deliveryAddress, pickup, selectedAddressId, selectedQuote],
  );

  function selectAddress(address: CustomerAddress) {
    setSelectedAddressId(address.id);
    setCustomerName(address.recipientName);
    setCustomerPhone(address.phone);
    setDeliveryAddress(address.line1);
    setAddressCity(address.city);
    setAddressLabel(address.label);
    setFieldErrors({});
  }

  async function saveNewAddress() {
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || !addressCity.trim()) {
      setFieldErrors({
        customerName: !customerName.trim() ? "Full name is required." : "",
        customerPhone: !customerPhone.trim() ? "Phone is required." : "",
        deliveryAddress: !deliveryAddress.trim() ? "Delivery address is required." : "",
        addressCity: !addressCity.trim() ? "City is required." : "",
      });
      return null;
    }
    const created = await api.post<CustomerAddress>("/customer/addresses", {
      label: addressLabel.trim() || "Home",
      recipientName: customerName.trim(),
      phone: customerPhone.trim(),
      line1: deliveryAddress.trim(),
      city: addressCity.trim(),
      zone: deliveryZone,
      isDefault: addresses.length === 0,
    });
    setAddresses((current) => [created, ...current.filter((row) => row.id !== created.id)]);
    setSelectedAddressId(created.id);
    return created;
  }

  async function placeOrder() {
    if (!canContinue || !validateStep("payment")) return;
    setPlacingOrder(true);
    setError(null);
    try {
      if (selectedAddressId === "new") await saveNewAddress();
      await syncLocalCartToServer(items);
      const order = await api.post<Order>("/orders", {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryType: selectedQuote?.providerType ?? selectedProvider,
        deliveryZone,
        deliveryAddress: selectedAddressId === "pickup" ? undefined : deliveryAddress.trim(),
        pickupLocation: selectedAddressId === "pickup" ? pickup?.address ?? pickup?.displayName ?? "RashPOD pickup" : undefined,
        customerNote: selectedAddressId === "pickup" ? "Pickup order" : undefined,
        paymentMethod: "CLICK",
      });
      const payment = await api.post<{ paymentId: string; checkoutUrl?: string }>("/payments/click/create", { orderId: order.id });
      clearCart();
      window.location.href =
        payment.checkoutUrl ||
        `/checkout/success?orderId=${encodeURIComponent(order.id)}&paymentId=${encodeURIComponent(payment.paymentId)}`;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setAuthState("guest");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setPlacingOrder(false);
    }
  }

  function goNext() {
    const nextStep = step === "address" ? "shipping" : "payment";
    if (!validateStep(nextStep)) return;
    setStep(nextStep);
  }

  return (
    <div className="min-h-screen bg-white">
      <PageContainer variant="storefront" compact className="pb-16 pt-4">
        <BreadcrumbTrail />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
          <section>
            <StepNav active={step} setStep={setStep} />
            {authState === "checking" || loadingCheckout ? (
              <p className="mt-12 text-brand-muted">Checking your session...</p>
            ) : null}
            {authState === "guest" ? <AuthGatePanel /> : null}
            {authState === "authed" && items.length === 0 && serverCartCount === 0 ? (
              <div className="mt-12 max-w-form rounded-md bg-brand-bg p-8">
                <h1 className="text-h3 font-bold text-brand-ink">Your cart is empty</h1>
                <p className="mt-3 text-brand-muted">Add a product before starting checkout.</p>
                <Link href="/shop" className="mt-6 inline-flex h-12 items-center rounded-pill bg-brand-peach px-6 text-sm font-semibold text-white hover:opacity-90">
                  Browse shop
                </Link>
              </div>
            ) : null}
            {authState === "authed" && (items.length > 0 || serverCartCount > 0) ? (
              <>
                {step === "address" ? (
                  <AddressStep
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    onSelectAddress={selectAddress}
                    onSelectPickup={() => setSelectedAddressId("pickup")}
                    onSelectNew={() => setSelectedAddressId("new")}
                    pickup={pickup}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    customerEmail={customerEmail}
                    deliveryAddress={deliveryAddress}
                    addressCity={addressCity}
                    addressLabel={addressLabel}
                    fieldErrors={fieldErrors}
                    setCustomerName={setCustomerName}
                    setCustomerPhone={setCustomerPhone}
                    setCustomerEmail={setCustomerEmail}
                    setDeliveryAddress={setDeliveryAddress}
                    setAddressCity={setAddressCity}
                    setAddressLabel={setAddressLabel}
                  />
                ) : null}
                {step === "shipping" ? (
                  <ShippingStep
                    quotes={deliveryQuotes}
                    selectedProvider={selectedProvider}
                    onSelect={setSelectedProvider}
                    freeDeliveryThreshold={freeDeliveryThreshold}
                    error={fieldErrors.shipping}
                  />
                ) : null}
                {step === "payment" ? <PaymentStep /> : null}
              </>
            ) : null}
          </section>

          <OrderSummaryPanel
            serverCartCount={serverCartCount}
            freeDeliveryThreshold={freeDeliveryThreshold}
            deliveryFee={selectedQuote?.deliveryPrice ?? 0}
          />
        </div>

        {error ? <p className="mt-8 text-right text-sm font-bold text-semantic-dangerText">{error}</p> : null}
        {authState === "authed" && (items.length > 0 || serverCartCount > 0) ? (
          <div className="mt-8 flex justify-end">
            {step !== "payment" ? (
              <Button disabled={!canContinue} onClick={goNext} variant="primaryPeach" size="lg">
                Continue
              </Button>
            ) : (
              <Button disabled={!canContinue || placingOrder} onClick={placeOrder} variant="primaryPeach" size="lg" loading={placingOrder}>
                {placingOrder ? "Preparing Click payment..." : "Place Your Order and Pay"}
              </Button>
            )}
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}

function AuthGatePanel() {
  return (
    <div className="mt-12 max-w-form rounded-[24px] bg-brand-bg p-8">
      <h1 className="text-h3 font-bold text-brand-ink">Sign in to complete your order</h1>
      <p className="mt-3 text-brand-muted">Your cart stays saved while you sign in or create an account.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/auth/login?next=%2Fcheckout" className="inline-flex h-12 items-center justify-center rounded-pill bg-brand-peach px-6 text-sm font-semibold text-white hover:opacity-90">
          Sign in
        </Link>
        <Link href="/auth/register?next=%2Fcheckout" className="inline-flex h-12 items-center justify-center rounded-pill border border-brand-blue px-6 text-sm font-semibold text-brand-blue hover:bg-brand-blueLight">
          Create account
        </Link>
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
    <nav aria-label="Breadcrumb" className="inline-flex min-h-10 items-center gap-3 overflow-x-auto rounded-xs bg-brand-bg px-4 text-sm text-brand-text sm:gap-5 sm:text-base">
      <Link href="/" className="hover:text-brand-blue">Home</Link>
      <ChevronRight size={18} className="text-brand-subtle" />
      <Link href="/shop" className="hover:text-brand-blue">Shop</Link>
      <ChevronRight size={18} className="text-brand-subtle" />
      <span className="shrink-0 font-bold text-brand-ink">Checkout</span>
    </nav>
  );
}

function StepNav({ active, setStep }: { active: CheckoutStep; setStep: (step: CheckoutStep) => void }) {
  return (
    <div role="tablist" aria-label="Checkout steps" className="-mx-1 flex items-center gap-3 overflow-x-auto pb-2 text-base sm:gap-6 sm:text-h3">
      {STEP_LABELS.map((step, index) => (
        <span key={step.key} className="flex shrink-0 items-center gap-3 sm:gap-6">
          <button
            type="button"
            role="tab"
            aria-selected={active === step.key}
            aria-current={active === step.key ? "step" : undefined}
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

function AddressStep(props: {
  addresses: CustomerAddress[];
  selectedAddressId: string | "pickup" | "new";
  onSelectAddress: (address: CustomerAddress) => void;
  onSelectPickup: () => void;
  onSelectNew: () => void;
  pickup: ShopSettings["pickup"];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  addressCity: string;
  addressLabel: string;
  fieldErrors: Record<string, string>;
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setCustomerEmail: (value: string) => void;
  setDeliveryAddress: (value: string) => void;
  setAddressCity: (value: string) => void;
  setAddressLabel: (value: string) => void;
}) {
  const showForm = props.selectedAddressId === "new" || props.addresses.length === 0;
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Choose your address</h1>
      <div className="mt-6 grid gap-4">
        {props.addresses.map((address) => (
          <AddressRow
            key={address.id}
            checked={props.selectedAddressId === address.id}
            onClick={() => props.onSelectAddress(address)}
            name={address.recipientName}
            type={address.label}
            address={`${address.line1}, ${address.city}`}
            phone={address.phone}
          />
        ))}
        {props.pickup ? (
          <AddressRow
            checked={props.selectedAddressId === "pickup"}
            onClick={props.onSelectPickup}
            name={props.pickup.displayName}
            type="Pickup"
            address={props.pickup.address ?? props.pickup.zone}
            phone={props.pickup.hours ?? undefined}
          />
        ) : null}
      </div>
      <button type="button" onClick={props.onSelectNew} className="mt-6 inline-flex min-h-11 items-center gap-3 text-base text-brand-blue">
        <Plus size={18} /> Add a new address
      </button>
      {showForm ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <CheckoutInput label="Label" value={props.addressLabel} onChange={props.setAddressLabel} error={props.fieldErrors.addressLabel} />
          <CheckoutInput label="Full name" value={props.customerName} onChange={props.setCustomerName} error={props.fieldErrors.customerName} />
          <CheckoutInput label="Phone" value={props.customerPhone} onChange={props.setCustomerPhone} error={props.fieldErrors.customerPhone} />
          <CheckoutInput label="Email" value={props.customerEmail} onChange={props.setCustomerEmail} type="email" />
          <CheckoutInput label="Delivery address" value={props.deliveryAddress} onChange={props.setDeliveryAddress} error={props.fieldErrors.deliveryAddress} className="sm:col-span-2" />
          <CheckoutInput label="City" value={props.addressCity} onChange={props.setAddressCity} error={props.fieldErrors.addressCity} />
        </div>
      ) : null}
    </div>
  );
}

function CheckoutInput({
  label,
  value,
  onChange,
  type = "text",
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  className?: string;
}) {
  return (
    <FormField label={label} className={className}>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error ? <p className="mt-1 text-sm text-semantic-dangerText">{error}</p> : null}
    </FormField>
  );
}

function AddressRow({ checked, onClick, name, type, address, phone }: { checked: boolean; onClick: () => void; name: string; type: string; address: string; phone?: string }) {
  return (
    <div className="border-b border-brand-line py-6 sm:py-8">
      <button type="button" onClick={onClick} className="flex w-full items-start gap-4 text-left">
        <span className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${checked ? "border-brand-blue" : "border-brand-subtle"}`}>
          {checked ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
        </span>
        <span>
          <span className="flex flex-wrap items-center gap-3">
            <span className={`text-h3 ${checked ? "text-brand-ink" : "text-brand-muted"}`}>{name}</span>
            <span className="rounded-xs border border-brand-blue px-2 py-0.5 text-caption text-brand-blue">{type}</span>
          </span>
          <span className="mt-3 block text-body text-brand-muted">{address}</span>
          {phone ? <span className="mt-2 block text-body text-brand-muted">{phone}</span> : null}
        </span>
      </button>
    </div>
  );
}

function ShippingStep({
  quotes,
  selectedProvider,
  onSelect,
  freeDeliveryThreshold,
  error,
}: {
  quotes: DeliveryQuote[];
  selectedProvider: string;
  onSelect: (value: string) => void;
  freeDeliveryThreshold: number;
  error?: string;
}) {
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Shipment method</h1>
      <p className="mt-2 text-sm text-brand-muted">Free delivery applies from {formatPrice(freeDeliveryThreshold)} on eligible methods.</p>
      <div className="mt-6 overflow-hidden rounded-md bg-brand-surface shadow-soft">
        {quotes.length === 0 ? (
          <p className="px-5 py-6 text-brand-muted">Loading delivery options...</p>
        ) : (
          quotes.map((quote) => (
            <button
              key={quote.providerType}
              type="button"
              onClick={() => onSelect(quote.providerType)}
              className="flex w-full flex-col gap-3 border-b border-brand-line px-4 py-4 text-left last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <span className="flex items-center gap-4 text-body text-brand-muted">
                <span className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border-2 ${selectedProvider === quote.providerType ? "border-brand-blue" : "border-brand-subtle"}`}>
                  {selectedProvider === quote.providerType ? <span className="h-2 w-2 rounded-full bg-brand-blue" /> : null}
                </span>
                <span className="font-medium text-brand-ink">{quote.providerName}</span>
                <span>{quote.etaText ?? quote.zone}</span>
              </span>
              <span className="font-bold text-brand-ink sm:pl-8">{quote.deliveryPrice <= 0 ? "Free" : formatPrice(quote.deliveryPrice)}</span>
            </button>
          ))
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-semantic-dangerText">{error}</p> : null}
    </div>
  );
}

function PaymentStep() {
  return (
    <div className="mt-8 max-w-form lg:mt-12">
      <h1 className="text-section font-semibold text-brand-ink">Payment method</h1>
      <div className="mt-6 divide-y divide-brand-line">
        <div className="flex flex-wrap items-center gap-4 py-4">
          <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-brand-blue">
            <span className="h-2 w-2 rounded-full bg-brand-blue" />
          </span>
          <span className="grid h-5 min-w-9 place-items-center rounded-xs bg-brand-peach px-2 text-caption font-black text-white">Click</span>
          <span className="text-base text-brand-ink">Click Uz payment</span>
        </div>
      </div>
      <p className="mt-6 max-w-form text-body leading-relaxed text-brand-muted">
        You will be routed through the Click payment flow after the order is created. RashPOD does not collect or store card numbers.
      </p>
    </div>
  );
}

function OrderSummaryPanel({
  serverCartCount,
  freeDeliveryThreshold,
  deliveryFee,
}: {
  serverCartCount: number;
  freeDeliveryThreshold: number;
  deliveryFee: number;
}) {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
  const total = subtotal + deliveryFee;
  return (
    <aside className="rounded-md bg-brand-bg p-6 shadow-soft sm:p-8">
      <h2 className="mb-6 text-section font-bold uppercase text-brand-ink">Order Summary</h2>
      <FreeDeliveryBar subtotal={subtotal} remaining={remaining} progress={progress} threshold={freeDeliveryThreshold} compact />
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
              <h3 className="line-clamp-2 text-caption font-bold uppercase text-brand-ink">{item.title}</h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-xs bg-brand-bg px-2 py-1 text-caption text-brand-blue">
                <span className="h-2 w-2 rounded-full bg-brand-blue" /> {item.size}
              </span>
            </div>
            <div className="col-start-2 sm:col-start-auto">
              <div className="inline-flex h-7 min-w-[72px] items-center justify-between rounded-pill bg-brand-bg px-3 text-xs font-bold text-brand-ink">
                <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}>-</button>
                <span>{item.quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
              </div>
              <button type="button" onClick={() => removeItem(item.key)} className="mt-2 text-caption font-medium text-brand-peach">Remove</button>
            </div>
            <p className="text-right text-sm font-bold tabular-nums text-brand-ink sm:text-base">{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2 border-t border-brand-line pt-4 text-sm text-brand-muted">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        <div className="flex justify-between"><span>Delivery</span><span>{deliveryFee <= 0 ? "Free" : formatPrice(deliveryFee)}</span></div>
        <div className="flex justify-between text-base font-bold text-brand-ink"><span>Total</span><span>{formatPrice(total)}</span></div>
      </div>
    </aside>
  );
}

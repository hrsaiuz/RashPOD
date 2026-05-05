"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../auth/auth-provider";
import { Card, Button, FormField, Input, Select, EmptyState, ErrorState, Spinner, Badge } from "@rashpod/ui";
import { ShoppingCart, MapPin, Truck, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

type CartItem = {
  id: string;
  listing: { id: string; title: string; price: string };
  quantity: number;
};

type DeliveryOption = {
  id: string;
  providerType: string;
  displayName: string;
  zone: string;
  price: string;
};

type Step = "cart" | "address" | "delivery" | "payment" | "confirm";

const UZBEKISTAN_REGIONS = [
  "Tashkent City",
  "Tashkent Region",
  "Samarkand",
  "Bukhara",
  "Andijan",
  "Fergana",
  "Namangan",
  "Kashkadarya",
  "Surkhandarya",
  "Khorezm",
  "Navoiy",
  "Jizzakh",
  "Syrdarya",
  "Karakalpakstan",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("cart");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);

  // Address state
  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    region: "",
    city: "",
    addressLine: "",
    zip: "",
  });

  // Delivery state
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);

  // Order state
  const [orderId, setOrderId] = useState("");

  // Load cart on mount
  useEffect(() => {
    const loadCart = async () => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      try {
        const res = await fetch("/api/proxy/cart");
        if (!res.ok) throw new Error("Failed to load cart");
        const cart = await res.json();
        setCartItems(cart.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load cart");
      } finally {
        setCartLoading(false);
      }
    };
    void loadCart();
  }, [user, router]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.listing.price) * item.quantity,
    0
  );

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      const res = await fetch(`/api/proxy/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const cart = await res.json();
      setCartItems(cart.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/proxy/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove");
      const cart = await res.json();
      setCartItems(cart.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const handleContinueToAddress = () => {
    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    setStep("address");
  };

  const handleContinueToDelivery = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // TODO: POST /api/proxy/me/addresses if endpoint exists
      console.warn("TODO: Save address to /api/proxy/me/addresses");
      
      // Load delivery options
      const res = await fetch("/api/proxy/delivery/options");
      if (!res.ok) throw new Error("Failed to load delivery options");
      const options = await res.json();
      setDeliveryOptions(options);
      setStep("delivery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to continue");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!selectedDelivery) {
      setError("Please select a delivery option");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Get delivery quote
      const quoteRes = await fetch("/api/proxy/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedDelivery,
          address: address,
        }),
      });
      if (quoteRes.ok) {
        const quote = await quoteRes.json();
        setDeliveryPrice(quote.price || 0);
      }
      setStep("payment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get quote");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError("");
    try {
      // Create order
      const orderRes = await fetch("/api/proxy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          deliveryProvider: selectedDelivery,
          items: cartItems.map((item) => ({
            listingId: item.listing.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.json().catch(() => ({}));
        throw new Error(errBody.message || "Order creation failed");
      }

      const order = await orderRes.json();
      setOrderId(order.id);

      // Create Click payment
      const paymentRes = await fetch("/api/proxy/payments/click/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (paymentRes.ok) {
        const payment = await paymentRes.json();
        if (payment.paymentUrl) {
          // Redirect to Click payment
          window.location.href = payment.paymentUrl;
          return;
        }
      }

      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setLoading(false);
    }
  };

  const renderStepper = () => {
    const steps: { id: Step; label: string; icon: any }[] = [
      { id: "cart", label: "Cart", icon: ShoppingCart },
      { id: "address", label: "Address", icon: MapPin },
      { id: "delivery", label: "Delivery", icon: Truck },
      { id: "payment", label: "Payment", icon: CreditCard },
      { id: "confirm", label: "Confirm", icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((s) => s.id === step);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isDone = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex flex-col items-center ${
                    idx > 0 ? "ml-4" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isDone
                        ? "bg-brand-blue text-white"
                        : isCurrent
                        ? "bg-brand-peach text-white"
                        : "bg-surface-card text-brand-muted"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isCurrent ? "font-semibold text-brand-ink" : "text-brand-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 mx-2 ${
                      idx < currentIndex ? "bg-brand-blue" : "bg-surface-borderSoft"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (cartLoading) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-ink mb-6">Checkout</h1>

      {renderStepper()}

      {error && (
        <Card className="mb-6 p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError("")}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 1: Cart Review */}
      {step === "cart" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart size={20} />
            Review Your Cart
          </h2>

          {cartItems.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={48} />}
              title="Your cart is empty"
              description="Add some items to your cart before checking out"
              action={
                <Button
                  variant="primaryPeach"
                  onClick={() => router.push("/dashboard/customer/shop")}
                >
                  Go to Shop
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-4 bg-surface-card rounded-xl"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-brand-ink">
                        {item.listing.title}
                      </h3>
                      <p className="text-sm text-brand-muted">
                        {item.listing.price} UZS × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-16"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(0)} UZS</span>
                </div>
              </div>

              <Button
                variant="primaryPeach"
                onClick={handleContinueToAddress}
                className="w-full"
              >
                Continue to Address
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 2: Address */}
      {step === "address" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Delivery Address
          </h2>

          <form onSubmit={handleContinueToDelivery} className="space-y-4">
            <FormField label="Full Name" required>
              <Input
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </FormField>

            <FormField label="Phone" required>
              <Input
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
                required
              />
            </FormField>

            <FormField label="Region" required>
              <Select
                value={address.region}
                onChange={(e) => setAddress({ ...address, region: e.target.value })}
                required
              >
                <option value="">Select region</option>
                {UZBEKISTAN_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="City" required>
              <Input
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="Tashkent"
                required
              />
            </FormField>

            <FormField label="Address Line" required>
              <Input
                value={address.addressLine}
                onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
                placeholder="Street, building, apartment"
                required
              />
            </FormField>

            <FormField label="ZIP Code">
              <Input
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                placeholder="100000"
              />
            </FormField>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("cart")}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primaryPeach"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Loading..." : "Continue to Delivery"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 3: Delivery */}
      {step === "delivery" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Truck size={20} />
            Delivery Method
          </h2>

          {deliveryOptions.length === 0 ? (
            <ErrorState
              title="No delivery options available"
              description="Please contact support for assistance"
              retry={
                <Button
                  variant="ghost"
                  onClick={() => setStep("address")}
                >
                  Back to Address
                </Button>
              }
            />
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {deliveryOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`block p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedDelivery === option.providerType
                        ? "border-brand-blue bg-blue-50"
                        : "border-surface-borderSoft hover:border-brand-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={option.providerType}
                      checked={selectedDelivery === option.providerType}
                      onChange={(e) => setSelectedDelivery(e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-medium">{option.displayName}</span>
                    <span className="ml-2 text-brand-muted">
                      ({option.zone})
                    </span>
                    <span className="float-right font-semibold">
                      {option.price} UZS
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("address")}
                >
                  Back
                </Button>
                <Button
                  variant="primaryPeach"
                  onClick={handleContinueToPayment}
                  disabled={!selectedDelivery || loading}
                  className="flex-1"
                >
                  {loading ? "Loading..." : "Continue to Payment"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Step 4: Payment */}
      {step === "payment" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard size={20} />
            Payment Method
          </h2>

          <div className="mb-6">
            <label className="block p-4 border border-brand-blue bg-blue-50 rounded-xl">
              <input
                type="radio"
                name="payment"
                value="click"
                checked
                readOnly
                className="mr-3"
              />
              <span className="font-medium">Click Payment</span>
              <span className="ml-2 px-2 py-1 bg-brand-blue/10 text-brand-blue rounded text-xs font-medium">
                Recommended
              </span>
            </label>
          </div>

          <div className="border-t pt-4 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-brand-muted">Subtotal:</span>
              <span className="font-medium">{subtotal.toFixed(0)} UZS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Delivery:</span>
              <span className="font-medium">{deliveryPrice.toFixed(0)} UZS</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{(subtotal + deliveryPrice).toFixed(0)} UZS</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("delivery")}
            >
              Back
            </Button>
            <Button
              variant="primaryPeach"
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Processing..." : "Place Order & Pay"}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Confirm */}
      {step === "confirm" && (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center">
            <Spinner size="lg" />
            <h2 className="text-lg font-semibold mt-4">Order Placed!</h2>
            <p className="text-brand-muted mt-2">
              Redirecting to payment...
            </p>
            {orderId && (
              <p className="text-sm text-brand-muted mt-2">
                Order ID: {orderId}
              </p>
            )}
          </div>
        </Card>
      )}
    </main>
  );
}

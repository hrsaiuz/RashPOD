"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Tag, X } from "lucide-react";

export interface CartItem {
  key: string;
  listingId: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  designerName: string;
  size: string;
  color: string;
  quantity: number;
}

interface AddCartItemInput extends Omit<CartItem, "key"> {}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  subtotal: number;
  itemCount: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: AddCartItemInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "rashpod_cart_v1";
const FREE_DELIVERY_TARGET = 50;
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const addItem = useCallback((item: AddCartItemInput) => {
    const key = `${item.listingId}:${item.size}:${item.color}`;
    setItems((current) => {
      const existing = current.find((row) => row.key === key);
      if (existing) {
        return current.map((row) => row.key === key ? { ...row, quantity: row.quantity + item.quantity } : row);
      }
      return [{ ...item, key }, ...current];
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.max(1, quantity) } : item));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    isOpen,
    subtotal,
    itemCount,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [addItem, isOpen, itemCount, items, removeItem, subtotal, updateQuantity, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <MiniCartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

function MiniCartDrawer() {
  const { items, isOpen, subtotal, closeCart, updateQuantity, removeItem } = useCart();
  const remaining = Math.max(0, FREE_DELIVERY_TARGET - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_TARGET) * 100);

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-300 ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={closeCart}
      />
      <aside
        aria-hidden={!isOpen}
        className="fixed right-0 top-0 z-50 h-dvh w-full max-w-[620px] overflow-hidden rounded-l-[12px] bg-brand-bg shadow-[0_24px_60px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-out"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 50,
          width: "min(100vw, 620px)",
          maxWidth: "620px",
          height: "100dvh",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          visibility: "visible",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div className="flex h-full flex-col px-5 py-6 sm:px-10 sm:py-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-[20px] font-bold uppercase tracking-[0.04em] text-[#33333A]">Order Summary</h2>
            <button type="button" onClick={closeCart} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-full text-[#33333A] transition-colors hover:bg-white">
              <X size={25} strokeWidth={1.8} />
            </button>
          </div>

          <FreeDeliveryBar subtotal={subtotal} remaining={remaining} progress={progress} />

          <div className="mb-4 grid grid-cols-[1fr_100px_82px] rounded-[5px] bg-brand-peach px-5 py-2 text-[11px] font-bold text-white sm:grid-cols-[1fr_140px_90px]">
            <span>product</span>
            <span className="text-center">Quantity</span>
            <span className="text-right">Total</span>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="rounded-[12px] bg-white p-10 text-center text-brand-muted">Your cart is empty.</div>
            ) : items.map((item) => (
              <div key={item.key} className="grid grid-cols-[74px_1fr] items-center gap-4 rounded-[9px] bg-white p-4 sm:grid-cols-[96px_1fr_110px_88px]">
                <div className="relative h-[92px] overflow-hidden rounded-[7px] bg-brand-bg">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.title} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-brand-blue">
                      <Package size={28} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-[13px] font-black uppercase text-black">{item.title}</h3>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-[5px] bg-brand-bg px-2 py-1 text-[10px] text-brand-blue">
                    <span className="h-3 w-3 rounded-full bg-brand-blue" />
                    {item.size}
                  </span>
                  <p className="mt-4 flex items-center gap-2 text-[10px] uppercase text-[#777]">
                    <span className="h-4 w-4 rounded-full border border-black bg-[#ead7c5]" />
                    {item.color}
                  </p>
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  <QuantityPill quantity={item.quantity} onChange={(next) => updateQuantity(item.key, next)} />
                  <button type="button" onClick={() => removeItem(item.key)} className="mt-4 text-[10px] font-medium text-brand-peach">Remove</button>
                </div>
                <p className="text-right text-[18px] font-black text-black sm:text-right">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="inline-flex h-[30px] w-[205px] items-center gap-2 rounded-full border-2 border-brand-blue bg-white px-4 text-[14px] text-brand-subtle">
              <span>Coupon Code</span>
              <Tag size={17} className="ml-auto text-brand-peach" />
            </div>
            <Link href="/checkout" onClick={closeCart} className="inline-flex h-[55px] min-w-[128px] items-center justify-center rounded-[16px] bg-brand-peach px-7 text-[20px] font-bold lowercase text-white transition-transform hover:-translate-y-0.5">
              continue
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export function FreeDeliveryBar({ subtotal, remaining, progress, compact }: { subtotal: number; remaining: number; progress: number; compact?: boolean }) {
  return (
    <div className={compact ? "mb-4" : "mb-5"}>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black text-black">
        <span>10$</span>
        <span>{remaining > 0 ? `You're $${remaining.toFixed(0)} away from free shipping` : "You unlocked free shipping"}</span>
        <span className="relative grid h-9 w-9 place-items-center text-[10px] font-black">
          <span className="cart-flower absolute inset-0 bg-brand-peach" />
          <span className="relative z-10">500$</span>
        </span>
      </div>
      <div className="h-[13px] overflow-hidden rounded-full border border-brand-blue bg-white">
        <div className="free-shipping-flow h-full rounded-full bg-brand-blue" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function QuantityPill({ quantity, onChange }: { quantity: number; onChange: (quantity: number) => void }) {
  return (
    <div className="inline-flex h-[34px] min-w-[80px] items-center justify-between rounded-full bg-brand-bg px-4 text-[13px] font-black text-black">
      <button type="button" onClick={() => onChange(Math.max(1, quantity - 1))}>-</button>
      <span>{quantity}</span>
      <button type="button" onClick={() => onChange(quantity + 1)}>+</button>
    </div>
  );
}

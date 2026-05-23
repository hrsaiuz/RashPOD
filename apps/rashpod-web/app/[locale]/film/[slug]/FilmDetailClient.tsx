"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorState } from "@rashpod/ui";
import { Film, Ruler } from "lucide-react";
import { api, ApiError } from "../../../../lib/api";
import type { FilmListing } from "../../../../lib/catalog";

type FilmQuote = {
  total: number;
  unitPrice: number;
  subtotal: number;
  minimumOrderAdjustment: number;
  taxAmount: number;
  currency: string;
  areaCm2: number;
  billableAreaCm2: number;
  turnaroundDays?: number | null;
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value || 0);
}

export default function FilmDetailClient({
  slug,
  initialFilm,
}: {
  slug: string;
  initialFilm: FilmListing | null;
}) {
  const router = useRouter();
  const film = initialFilm;
  const [filmType, setFilmType] = useState<"DTF" | "UV_DTF">("DTF");
  const [widthCm, setWidthCm] = useState(28);
  const [heightCm, setHeightCm] = useState(40);
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<FilmQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const quoteInput = useMemo(
    () => ({
      filmType,
      widthCm,
      heightCm,
      quantity,
      listingId: film?.id,
      itemKind: "DESIGN_FILM" as const,
    }),
    [film?.id, filmType, widthCm, heightCm, quantity],
  );

  useEffect(() => {
    if (!film) return;

    async function loadQuote() {
      setQuoting(true);
      try {
        setQuote(await api.post<FilmQuote>("/shop/film/quote", quoteInput));
      } catch {
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }

    const timer = window.setTimeout(loadQuote, 220);
    return () => window.clearTimeout(timer);
  }, [film, quoteInput]);

  async function addToCart() {
    if (!film) return;
    setAdding(true);
    setError("");
    try {
      await api.post("/cart/film/design", {
        listingId: film.id,
        filmType,
        widthCm,
        heightCm,
        quantity,
      });
      router.push("/checkout");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        window.location.href = `/auth/login?next=${encodeURIComponent(`/film/${slug}`)}`;
        return;
      }
      setError(err instanceof Error ? err.message : "Could not add film to cart.");
    } finally {
      setAdding(false);
    }
  }

  if (!film) {
    return (
      <div className="mx-auto max-w-storefront px-6 py-20">
        <ErrorState
          title="Film not found"
          description="We could not find this film."
          retry={
            <Link href="/film">
              <Button variant="primaryBlue">Browse films</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-storefront px-6 py-10">
      <div className="mb-8">
        <Link href="/film" className="text-sm font-semibold text-brand-blue">
          Back to films
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[24px] bg-brand-bg shadow-product">
            {film.imageUrl ? (
              <Image
                src={film.imageUrl}
                alt={film.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
              />
            ) : (
              <Film className="text-brand-blue" size={88} />
            )}
          </div>
          <h1 className="mt-8 text-3xl font-bold text-brand-ink">{film.title}</h1>
          <p className="mt-2 text-brand-muted">by {film.designer.displayName}</p>
          {film.description ? (
            <p className="mt-6 max-w-3xl leading-relaxed text-brand-muted">{film.description}</p>
          ) : null}
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-brand-ink">Order transfer film</h2>
          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-brand-bg p-1">
              <button
                type="button"
                onClick={() => setFilmType("DTF")}
                className={`rounded-[10px] px-4 py-3 text-sm font-bold ${
                  filmType === "DTF" ? "bg-brand-blue text-white" : "text-brand-ink"
                }`}
              >
                DTF
              </button>
              <button
                type="button"
                onClick={() => setFilmType("UV_DTF")}
                className={`rounded-[10px] px-4 py-3 text-sm font-bold ${
                  filmType === "UV_DTF" ? "bg-brand-blue text-white" : "text-brand-ink"
                }`}
              >
                UV-DTF
              </button>
            </div>
            <label className="text-sm font-semibold text-brand-ink">
              Width, cm
              <input
                type="number"
                min={1}
                value={widthCm}
                onChange={(e) => setWidthCm(Number(e.target.value))}
                className="mt-2 w-full rounded-[12px] border border-brand-line px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-brand-ink">
              Height, cm
              <input
                type="number"
                min={1}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="mt-2 w-full rounded-[12px] border border-brand-line px-4 py-3"
              />
            </label>
            <label className="text-sm font-semibold text-brand-ink">
              Quantity
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-2 w-full rounded-[12px] border border-brand-line px-4 py-3"
              />
            </label>
          </div>

          <div className="mt-6 rounded-[12px] bg-brand-bg p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
              <Ruler size={16} /> {quote ? `${quote.areaCm2.toLocaleString()} cm2` : "Quote"}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-brand-muted">Estimated total</p>
                <p className="text-2xl font-black text-brand-ink">
                  {quote ? money(quote.total, quote.currency) : quoting ? "..." : "Unavailable"}
                </p>
              </div>
              {quote?.turnaroundDays ? (
                <p className="text-xs text-brand-muted">{quote.turnaroundDays} days</p>
              ) : null}
            </div>
            {quote?.minimumOrderAdjustment ? (
              <p className="mt-2 text-xs text-semantic-warningText">
                Minimum order adjustment included:{" "}
                {money(quote.minimumOrderAdjustment, quote.currency)}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-[12px] bg-semantic-dangerBg p-3 text-sm text-semantic-dangerText">
              {error}
            </p>
          ) : null}

          <Button
            variant="primaryPeach"
            size="lg"
            className="mt-5 w-full"
            loading={adding}
            disabled={!quote}
            onClick={addToCart}
          >
            Add film to cart
          </Button>
          <Link
            href="/film/custom"
            className="mt-3 block text-center text-sm font-semibold text-brand-blue"
          >
            Order a custom uploaded film
          </Link>
        </Card>
      </div>
    </div>
  );
}

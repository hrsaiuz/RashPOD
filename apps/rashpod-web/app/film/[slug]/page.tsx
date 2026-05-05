"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  Button,
  Skeleton,
  ErrorState,
  Breadcrumbs,
  getApiBase,
  getDashboardUrl,
} from "@rashpod/ui";
import { Film, Ruler, FileImage, AlertCircle } from "lucide-react";

interface FilmDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  dimensions: string;
  licenseRate: number;
  imageUrl?: string;
  previewImageUrl?: string;
  designer: {
    displayName: string;
    handle: string;
    avatarUrl?: string;
  };
  allowFilmSales: boolean;
  filmConsentGrantedAt?: string;
}

export default function FilmDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const apiBase = getApiBase();
  const dashboardUrl = getDashboardUrl();

  const [film, setFilm] = useState<FilmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchFilm = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(`${apiBase}/shop/films/${slug}`, {
          next: { revalidate: 60 },
        });

        if (!res.ok) throw new Error("Film not found");

        const data = await res.json();
        setFilm(data);
        setLoading(false);
      } catch (err) {
        setError(true);
        setLoading(false);
      }
    };

    fetchFilm();
  }, [slug, apiBase]);

  const handleLicenseFilm = () => {
    // Redirect to dashboard login -> film license page
    const licenseUrl = encodeURIComponent(`/dashboard/customer/film-license/${slug}`);
    window.location.href = `${dashboardUrl}/auth/login?next=${licenseUrl}`;
  };

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-10">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="w-full h-96" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !film) {
    return (
      <div className="max-w-[1120px] mx-auto px-6 py-20">
        <ErrorState
          title="Film not found"
          description="We couldn't find the film you're looking for."
          retry={
            <Link href="/film">
              <Button variant="primaryBlue" size="md">
                Browse films
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Films", href: "/film" },
    { label: film.title, href: `/film/${slug}` },
  ];

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      {/* Breadcrumbs */}
      <div className="mb-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Left: Preview image */}
        <div>
          <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-[24px] overflow-hidden">
            {film.previewImageUrl || film.imageUrl ? (
              <Image
                src={film.previewImageUrl || film.imageUrl!}
                alt={film.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Film className="w-20 h-20" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Film info */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-brand-ink mb-4">{film.title}</h1>

          <Link
            href={`/designer/${film.designer.handle}`}
            className="text-brand-muted hover:text-brand-blue mb-6"
          >
            by <span className="font-medium">{film.designer.displayName}</span>
          </Link>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-surface-border-soft">
            <span className="text-[32px] font-bold text-brand-ink">
              {film.licenseRate.toLocaleString()} UZS
            </span>
            <span className="text-sm text-brand-muted">per license</span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <Ruler className="w-5 h-5 text-brand-blue mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-ink text-sm">Dimensions</h4>
                <p className="text-sm text-brand-muted">{film.dimensions}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileImage className="w-5 h-5 text-brand-blue mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-ink text-sm">Format</h4>
                <p className="text-sm text-brand-muted">High-resolution DTF/UV-DTF ready</p>
              </div>
            </div>
          </div>

          {film.allowFilmSales ? (
            <>
              <Button variant="primaryPeach" size="lg" className="mb-4" onClick={handleLicenseFilm}>
                License this film
              </Button>
              <p className="text-xs text-brand-muted">
                You'll need to sign in to complete the licensing process.
              </p>
            </>
          ) : (
            <Card className="p-6 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm mb-1">
                    Not yet available for licensing
                  </h4>
                  <p className="text-sm text-amber-700">
                    This film is pending rights clearance. Check back soon or contact the designer
                    for more information.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-surface-border-soft pt-12 mb-16">
        <h2 className="text-2xl font-bold text-brand-ink mb-6">About this film</h2>
        <p className="text-brand-muted leading-relaxed max-w-3xl">{film.description}</p>
      </div>

      {/* Designer card */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-brand-ink mb-4">About the designer</h3>
        <Link href={`/designer/${film.designer.handle}`}>
          <div className="flex items-center gap-4 group">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center overflow-hidden">
              {film.designer.avatarUrl ? (
                <Image
                  src={film.designer.avatarUrl}
                  alt={film.designer.displayName}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <span className="text-2xl font-bold text-brand-blue">
                  {film.designer.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-brand-ink group-hover:text-brand-blue transition-colors">
                {film.designer.displayName}
              </h4>
              <p className="text-sm text-brand-muted">@{film.designer.handle}</p>
            </div>
            <Button variant="secondary" size="sm">
              View profile
            </Button>
          </div>
        </Link>
      </Card>
    </div>
  );
}


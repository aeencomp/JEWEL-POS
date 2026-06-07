import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Bike, Sparkles } from "lucide-react";
import { IqOrderShell, RestaurantCard } from "./iq-order-shared";

type StoreListing = {
  id: number;
  name: string;
  address: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  menuCount: number;
  deliveryFee: number;
  estMinutes: number;
  minOrder: number;
};

export default function IqOrderHome() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: stores = [], isLoading } = useQuery<StoreListing[]>({
    queryKey: ["/api/public/iq-order/stores"],
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter((s) => s.name.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
  }, [stores, search]);

  return (
    <IqOrderShell isAr={isAr}>
      <div className="p-4 space-y-5 pb-8">
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: "linear-gradient(135deg, #fbbf24, #b45309)" }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                {isAr ? "توصيل سريع" : "Fast Delivery"}
              </div>
              <h1 className="text-xl font-bold">{isAr ? "ماذا تريد أن تطلب؟" : "What are you craving?"}</h1>
              <p className="text-sm text-white/85 mt-1">{isAr ? "اطلب من أفضل المطاعم — يوصل لبابك" : "Order from top restaurants — delivered to your door"}</p>
            </div>
            <LanguageToggle />
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-white/80">
            <MapPin className="h-3.5 w-3.5" />
            <span>{isAr ? "العراق" : "Iraq"}</span>
            <span>·</span>
            <Bike className="h-3.5 w-3.5" />
            <span>{isAr ? "توصيل IQ" : "IQ Delivery"}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث عن مطعم..." : "Search restaurants..."}
            className="ps-9 h-11 rounded-xl bg-card"
          />
        </div>

        <div>
          <h2 className="font-bold text-sm mb-3 flex items-center justify-between">
            <span>{isAr ? "المطاعم المتاحة" : "Available Restaurants"}</span>
            <span className="text-muted-foreground font-normal text-xs">{filtered.length}</span>
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((store) => (
                <RestaurantCard
                  key={store.id}
                  store={store}
                  isAr={isAr}
                  onClick={() => navigate(`/app/store/${store.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {isAr ? "لا مطاعم متاحة للتوصيل حالياً" : "No restaurants available for delivery yet"}
            </p>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground pt-4">
          {isAr ? "طلب IQ — جزء من منصة IQ-POS" : "IQ Order — part of the IQ-POS platform"}
        </p>
      </div>
    </IqOrderShell>
  );
}

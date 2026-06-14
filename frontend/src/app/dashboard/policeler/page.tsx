"use client";

// ─── /dashboard/policeler ────────────────────────────────────────────────────
// Müşterinin tüm poliçe ve tekliflerini listeleyen sayfa.
//
// İki ana kategori (tab):
//   1) "Teklifler"        → Status === "Teklif Bekliyor"  (henüz onaylanmamış)
//   2) "Aktif Poliçeler"  → Status === "Aktif Poliçe"     (ödenmiş, yürürlükte)
//
// Backend `IsActive == false` olan iptal kayıtları zaten filtrelediği için
// burada iptaller listede gözükmez — `musterinin-policelerini-getir`
// endpoint'i sadece IsActive=true döndürür.
//
// Kart click → /dashboard/policeler/{id} detay sayfası.

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useMusteri, type Police } from "@/hooks/useMusteri";
import {
    IconArrowLeft,
    IconArrowRight,
    IconClock,
    IconShieldCheck,
    IconPlus,
    IconCar,
    IconHeartbeat,
    IconHome,
    IconPlane,
    IconShield,
    IconCalendarEvent,
    IconReceipt,
} from "@tabler/icons-react";

// ─── Yardımcılar (teklif-al sayfasıyla tutarlı) ─────────────────────────────

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

// İki tarih arası kalan gün sayısı (negatifse 0)
function kalanGun(bitis: Date) {
    const ms = bitis.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Yakınlık → kısa rozet etiketi (yön: "için kim?")
// "Anneme", "Eşime", "Çocuğuma" — datif eki ile.
function sigortaliRozetMetni(yakinlik: string): string {
    const map: Record<string, string> = {
        Es: "Eşime",
        Anne: "Anneme",
        Baba: "Babama",
        Cocuk: "Çocuğuma",
        Kardes: "Kardeşime",
        Diger: "Yakınıma",
    };
    return map[yakinlik] ?? yakinlik;
}

// Ürün adına göre ikon — teklif-al ile aynı eşleşme mantığı
function urunIkonu(ad: string): React.ElementType {
    const a = ad.toLowerCase();
    if (a.includes("kasko") || a.includes("trafik")) return IconCar;
    if (a.includes("sağlık") || a.includes("saglik") || a.includes("tamamlayıcı") || a.includes("tamamlayici")) return IconHeartbeat;
    if (a.includes("dask") || a.includes("konut") || a.includes("ev")) return IconHome;
    if (a.includes("seyahat")) return IconPlane;
    return IconShield;
}

// ─── Sekme tipi ──────────────────────────────────────────────────────────────

type Sekme = "teklifler" | "policeler";

const SEKMELER: { key: Sekme; etiket: string; durum: string; Icon: React.ElementType }[] = [
    { key: "teklifler", etiket: "Tekliflerim",     durum: "Teklif Bekliyor", Icon: IconClock },
    { key: "policeler", etiket: "Aktif Poliçeler", durum: "Aktif Poliçe",     Icon: IconShieldCheck },
];

// ─── Ana sayfa ───────────────────────────────────────────────────────────────

export default function PolicelerPage() {
    const { policeler, yukleniyor, hata } = useMusteri();
    const [sekme, setSekme] = useState<Sekme>("teklifler");

    // Backend veriyi karışık dönebiliyor — sekmeye göre filtrele.
    // useMemo: policeler veya sekme değişmediyse tekrar hesaplama yapma.
    const filtreli = useMemo(() => {
        const aktifSekme = SEKMELER.find((s) => s.key === sekme);
        if (!aktifSekme) return [];
        return policeler
            .filter((p) => p.status === aktifSekme.durum)
            // En yenisi en üstte — id desc (createdAt yokken pratik proxy)
            .sort((a, b) => b.id - a.id);
    }, [policeler, sekme]);

    // Sekme rozetleri için sayılar
    const sayilar = useMemo(() => {
        const m = new Map<string, number>();
        for (const p of policeler) m.set(p.status, (m.get(p.status) ?? 0) + 1);
        return m;
    }, [policeler]);

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                {/* ── Üst bar: geri + başlık + yeni teklif CTA ──────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-7"
                >
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-4"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Dashboard
                    </Link>

                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                                Poliçelerim
                                <span style={{ color: "#cbd5e1" }}>.</span>
                            </h1>
                            <p className="text-white/45 text-sm mt-1">
                                Tüm tekliflerinizi ve aktif poliçelerinizi tek yerden yönetin.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/teklif-al"
                            className="group/cta inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                            style={{
                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                color: "#0f172a",
                                boxShadow:
                                    "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                border: "1px solid rgba(226,232,240,0.5)",
                            }}
                        >
                            <IconPlus className="w-4 h-4" />
                            Yeni teklif al
                        </Link>
                    </div>
                </motion.div>

                {/* ── Hata satırı ─────────────────────────────────────────────── */}
                {hata && (
                    <div
                        className="mb-4 rounded-xl px-4 py-3 text-sm"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "rgb(252,165,165)",
                        }}
                    >
                        {hata}
                    </div>
                )}

                {/* ── Sekme barı ──────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                    className="flex items-center gap-2 mb-5 p-1 rounded-xl w-fit"
                    style={{
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {SEKMELER.map((s) => {
                        const aktif = s.key === sekme;
                        const sayi = sayilar.get(s.durum) ?? 0;
                        const Icon = s.Icon;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setSekme(s.key)}
                                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                                style={{ color: aktif ? "#0f172a" : "rgba(255,255,255,0.6)" }}
                            >
                                {aktif && (
                                    <motion.span
                                        layoutId="sekme-arkaplan"
                                        className="absolute inset-0 rounded-lg"
                                        style={{
                                            background: "linear-gradient(135deg, #f8fafc, #cbd5e1)",
                                            boxShadow: "0 4px 12px -4px rgba(226,232,240,0.4)",
                                        }}
                                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                    />
                                )}
                                <span className="relative z-10 inline-flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5" />
                                    {s.etiket}
                                    {sayi > 0 && (
                                        <span
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                                            style={{
                                                background: aktif ? "rgba(15,23,42,0.15)" : "rgba(255,255,255,0.08)",
                                                color: aktif ? "#0f172a" : "rgba(255,255,255,0.7)",
                                            }}
                                        >
                                            {sayi}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </motion.div>

                {/* ── İçerik: kart listesi veya boş state ─────────────────────── */}
                <AnimatePresence mode="wait">
                    {filtreli.length === 0 ? (
                        <BosState key={`bos-${sekme}`} sekme={sekme} />
                    ) : (
                        <motion.div
                            key={`liste-${sekme}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 gap-3"
                        >
                            {filtreli.map((p, i) => (
                                <PoliceKarti key={p.id} police={p} index={i} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Tek poliçe / teklif kartı ──────────────────────────────────────────────
function PoliceKarti({ police, index }: { police: Police; index: number }) {
    const Icon = urunIkonu(police.product?.productName ?? "");
    const teklif = police.status === "Teklif Bekliyor";
    const baslangic = new Date(police.startDate);
    const bitis = new Date(police.endDate);
    const kalan = kalanGun(bitis);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
        >
            <Link
                href={`/dashboard/policeler/${police.id}`}
                className="group/card block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(2,6,16,0.6))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 20px 60px -30px rgba(2,8,20,0.5)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <div className="px-5 lg:px-6 py-5 flex items-center gap-5">
                    {/* Sol: ürün ikonu — durum rengine göre tonlu */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: teklif
                                ? "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))"
                                : "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))",
                            border: `1px solid ${teklif ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.25)"}`,
                        }}
                    >
                        <Icon
                            className="w-5 h-5"
                            style={{ color: teklif ? "rgb(252,211,77)" : "rgb(110,231,183)" }}
                        />
                    </div>

                    {/* Orta: ürün adı + durum + sigortalı rozeti + tarih + poliçe no */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white text-[15px] font-semibold truncate">
                                {police.product?.productName ?? "Sigorta Ürünü"}
                            </p>
                            <DurumRozeti status={police.status} />
                            {/* Sigortalı kişi farklıysa — "Anneme", "Eşime" gibi etiket
                                Tek bakışta kullanıcının kim için sigorta yaptırdığını anlamasını sağlar */}
                            {police.insuredPerson && (
                                <span
                                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                    style={{
                                        background: "rgba(226,232,240,0.08)",
                                        border: "1px solid rgba(226,232,240,0.2)",
                                        color: "#cbd5e1",
                                    }}
                                    title={`Sigortalı: ${police.insuredPerson.adSoyad}`}
                                >
                                    {sigortaliRozetMetni(police.insuredPerson.yakinlik)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-[12px] text-white/45">
                            <span className="font-mono tabular-nums">{police.policyNumber}</span>
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span>
                                {tarihFormat(baslangic)} → {tarihFormat(bitis)}
                            </span>
                            {!teklif && kalan > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-white/15" />
                                    <span style={{ color: "rgb(110,231,183)" }}>{kalan} gün kaldı</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sağ: fiyat + ok */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                            <p className="text-white text-base font-bold tabular-nums">
                                {paraFormat(police.price)}
                            </p>
                            <p className="text-white/35 text-[11px]">{teklif ? "Teklif" : "Yıllık"}</p>
                        </div>
                        <IconArrowRight
                            className="w-4 h-4 text-white/30 transition-all duration-200 group-hover/card:text-white/80 group-hover/card:translate-x-1"
                        />
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Durum rozeti — küçük renkli pill ────────────────────────────────────────
function DurumRozeti({ status }: { status: string }) {
    const teklif = status === "Teklif Bekliyor";
    const aktif = status === "Aktif Poliçe";
    const renk = teklif
        ? { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)" }
        : aktif
            ? { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)" }
            : { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.6)" };

    return (
        <span
            className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
            style={{ background: renk.bg, border: `1px solid ${renk.border}`, color: renk.text }}
        >
            {status}
        </span>
    );
}

// ─── Boş state ──────────────────────────────────────────────────────────────
function BosState({ sekme }: { sekme: Sekme }) {
    const teklif = sekme === "teklifler";
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-10 text-center"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                {teklif ? (
                    <IconReceipt className="w-6 h-6" style={{ color: "#cbd5e1" }} />
                ) : (
                    <IconCalendarEvent className="w-6 h-6" style={{ color: "#cbd5e1" }} />
                )}
            </div>
            <h3 className="text-white text-lg font-bold tracking-tight">
                {teklif ? "Henüz teklifiniz yok" : "Aktif poliçeniz bulunmuyor"}
            </h3>
            <p className="text-white/45 text-sm mt-1.5 max-w-sm mx-auto">
                {teklif
                    ? "İlk teklifinizi oluşturun, ihtiyacınıza en uygun ürünü birkaç adımda seçin."
                    : "Onaylanmış bir poliçeniz olduğunda burada listelenecek. Önce bir teklif oluşturmayı deneyin."}
            </p>
            <Link
                href="/dashboard/teklif-al"
                className="group/cta inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{
                    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                    color: "#0f172a",
                    boxShadow:
                        "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                    border: "1px solid rgba(226,232,240,0.5)",
                }}
            >
                <IconPlus className="w-4 h-4" />
                Hemen teklif al
                <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
        </motion.div>
    );
}

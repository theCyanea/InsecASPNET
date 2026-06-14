"use client";

// ─── /dashboard/hasarlarim ───────────────────────────────────────────────────
// Müşterinin tüm hasar talepleri listesi.
//
// Sekmeler durum bazlı:
//   - "İncelemede" — yeni açılan, henüz değerlendirilmemiş
//   - "Onaylandı"  — admin onayladı, ödeme bekliyor
//   - "Ödendi"     — ödenmiş, kapanmış dosya
//   - "Reddedildi" — ekspertiz reddi
//
// Backend: GET /api/Claims/hasarlarim → giriş yapan müşterinin tüm aktif hasarları

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
    IconArrowLeft,
    IconArrowRight,
    IconAlertTriangle,
    IconClock,
    IconCheck,
    IconX,
    IconCash,
    IconFileText,
    IconShieldCheck,
    IconPlus,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface ProductMini {
    productName: string;
}

interface PolicyMini {
    id: number;
    policyNumber: string;
    product?: ProductMini;
}

interface ClaimImage {
    id: number;
    imageUrl: string;
}

interface Hasar {
    id: number;
    hasarTuru: string;
    hasarTarihi: string;
    hasarYeri?: string | null;
    claimDescription: string;
    claimAmount?: number | null;   // Tahmini tutar — opsiyonel (eksper belirleyecek)
    claimDate: string;
    claimStatus: string;
    onaylananTutar?: number | null;
    adminNotu?: string | null;
    retSebebi?: string | null;
    sonuclanmaTarihi?: string | null;
    isActive: boolean;
    policyId: number;
    policy?: PolicyMini;
    images?: ClaimImage[];
}

type Sekme = "tumu" | "incelemede" | "onaylandi" | "odendi" | "reddedildi";

const SEKMELER: { key: Sekme; etiket: string; durum: string | null; Icon: React.ElementType }[] = [
    { key: "tumu",       etiket: "Tümü",        durum: null,         Icon: IconFileText },
    { key: "incelemede", etiket: "İncelemede",  durum: "İncelemede", Icon: IconClock },
    { key: "onaylandi",  etiket: "Onaylandı",   durum: "Onaylandı",  Icon: IconCheck },
    { key: "odendi",     etiket: "Ödendi",      durum: "Ödendi",     Icon: IconCash },
    { key: "reddedildi", etiket: "Reddedildi",  durum: "Reddedildi", Icon: IconX },
];

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function HasarlarimPage() {
    const [hasarlar, setHasarlar] = useState<Hasar[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");
    const [sekme, setSekme] = useState<Sekme>("tumu");

    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Claims/hasarlarim`, { credentials: "include" });
                if (r.status === 401) {
                    window.location.href = "/";
                    return;
                }
                if (!r.ok) throw new Error();
                const data = await r.json();
                setHasarlar(Array.isArray(data) ? data : []);
            } catch {
                setHata("Hasar listesi yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, []);

    const filtreli = useMemo(() => {
        const aktifSekme = SEKMELER.find((s) => s.key === sekme);
        if (!aktifSekme || aktifSekme.durum == null) return hasarlar;
        return hasarlar.filter((h) => h.claimStatus === aktifSekme.durum);
    }, [hasarlar, sekme]);

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
                {/* ── Üst başlık + Yeni Hasar Bildir butonu ──────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
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
                                Hasar Taleplerim<span style={{ color: "#cbd5e1" }}>.</span>
                            </h1>
                            <p className="text-white/45 text-sm mt-1">
                                Açtığınız hasar bildirimleri ve durumları.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/hasar-olustur"
                            className="group/cta inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.02]"
                            style={{
                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                color: "#0f172a",
                                boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                border: "1px solid rgba(226,232,240,0.5)",
                            }}
                        >
                            <IconPlus className="w-4 h-4" />
                            Yeni Hasar Bildir
                        </Link>
                    </div>
                </motion.div>

                {/* Hata satırı */}
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

                {/* ── Sekmeler ────────────────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                    {SEKMELER.map((s) => {
                        const aktif = s.key === sekme;
                        const sayi = s.durum == null
                            ? hasarlar.length
                            : hasarlar.filter((h) => h.claimStatus === s.durum).length;
                        return (
                            <button
                                key={s.key}
                                onClick={() => setSekme(s.key)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                                style={{
                                    background: aktif
                                        ? "linear-gradient(135deg, rgba(226,232,240,0.1), rgba(148,163,184,0.04))"
                                        : "rgba(255,255,255,0.02)",
                                    border: aktif
                                        ? "1px solid rgba(226,232,240,0.3)"
                                        : "1px solid rgba(255,255,255,0.06)",
                                    color: aktif ? "#ffffff" : "rgba(255,255,255,0.55)",
                                }}
                            >
                                <s.Icon className="w-3.5 h-3.5" />
                                {s.etiket}
                                <span
                                    className="text-[10px] tabular-nums px-1.5 rounded"
                                    style={{
                                        background: aktif
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(255,255,255,0.04)",
                                        color: aktif ? "#cbd5e1" : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {sayi}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Liste ───────────────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {filtreli.length === 0 ? (
                        <motion.div
                            key={`bos-${sekme}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="rounded-2xl px-6 py-12 text-center"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed rgba(255,255,255,0.08)",
                            }}
                        >
                            <IconShieldCheck className="w-10 h-10 mx-auto mb-3 text-white/25" />
                            <p className="text-white/55 text-sm">Bu durumda hasar talebi bulunmuyor.</p>
                            <p className="text-white/30 text-[12px] mt-1.5">
                                Aktif poliçelerinizden yeni bir hasar bildirimi açabilirsiniz.
                            </p>
                            <Link
                                href="/dashboard/hasar-olustur"
                                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                    color: "#0f172a",
                                    border: "1px solid rgba(226,232,240,0.5)",
                                }}
                            >
                                <IconPlus className="w-3.5 h-3.5" />
                                Yeni Hasar Bildir
                            </Link>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`liste-${sekme}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-2.5"
                        >
                            {filtreli.map((h, i) => (
                                <HasarKarti key={h.id} hasar={h} index={i} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function HasarKarti({ hasar, index }: { hasar: Hasar; index: number }) {
    const renk = durumRengi(hasar.claimStatus);
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
        >
            <Link
                href={`/dashboard/hasarlarim/${hasar.id}`}
                className="group/card block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(2,6,16,0.6))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 20px 60px -30px rgba(2,8,20,0.5)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <div className="px-5 lg:px-6 py-5 flex items-center gap-5">
                    {/* Sol — durum ikonu */}
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: renk.iconBg,
                            border: `1px solid ${renk.iconBorder}`,
                        }}
                    >
                        <IconAlertTriangle className="w-5 h-5" style={{ color: renk.iconColor }} />
                    </div>

                    {/* Orta — hasar bilgileri */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white text-[15px] font-semibold truncate">
                                {hasar.hasarTuru}
                            </p>
                            <span
                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                style={{
                                    background: renk.chipBg,
                                    border: `1px solid ${renk.chipBorder}`,
                                    color: renk.chipText,
                                }}
                            >
                                {hasar.claimStatus}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-[12px] text-white/45">
                            <span>{hasar.policy?.product?.productName ?? "—"}</span>
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span className="font-mono tabular-nums">
                                {hasar.policy?.policyNumber ?? `#${hasar.policyId}`}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span>{tarihFormat(new Date(hasar.hasarTarihi))}</span>
                        </div>
                        <p className="text-white/55 text-[12.5px] mt-1.5 line-clamp-1">
                            {hasar.claimDescription}
                        </p>
                    </div>

                    {/* Sağ — tutar + ok
                        Üç durum:
                          - OnaylananTutar dolu  → admin değerlendirdi
                          - claimAmount dolu     → kullanıcı tahmini girdi
                          - ikisi de null        → "Eksper inceliyor" */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                            {hasar.onaylananTutar != null ? (
                                <>
                                    <p className="text-white text-base font-bold tabular-nums">
                                        {paraFormat(hasar.onaylananTutar)}
                                    </p>
                                    <p className="text-white/35 text-[11px]">Onaylanan</p>
                                </>
                            ) : hasar.claimAmount != null ? (
                                <>
                                    <p className="text-white text-base font-bold tabular-nums">
                                        {paraFormat(hasar.claimAmount)}
                                    </p>
                                    <p className="text-white/35 text-[11px]">Tahmini</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-white/65 text-[12px] font-medium">Beklemede</p>
                                    <p className="text-white/35 text-[10px]">Eksper inceliyor</p>
                                </>
                            )}
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

// Durum bazlı renk paleti — tek yerde tutarlı
function durumRengi(durum: string) {
    if (durum === "Onaylandı") {
        return {
            iconBg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(37,99,235,0.08))",
            iconBorder: "rgba(59,130,246,0.25)",
            iconColor: "rgb(147,197,253)",
            chipBg: "rgba(59,130,246,0.12)",
            chipBorder: "rgba(59,130,246,0.3)",
            chipText: "rgb(147,197,253)",
        };
    }
    if (durum === "Ödendi") {
        return {
            iconBg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))",
            iconBorder: "rgba(16,185,129,0.25)",
            iconColor: "rgb(110,231,183)",
            chipBg: "rgba(16,185,129,0.12)",
            chipBorder: "rgba(16,185,129,0.3)",
            chipText: "rgb(110,231,183)",
        };
    }
    if (durum === "Reddedildi") {
        return {
            iconBg: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.08))",
            iconBorder: "rgba(239,68,68,0.25)",
            iconColor: "rgb(252,165,165)",
            chipBg: "rgba(239,68,68,0.12)",
            chipBorder: "rgba(239,68,68,0.3)",
            chipText: "rgb(252,165,165)",
        };
    }
    // İncelemede (default)
    return {
        iconBg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))",
        iconBorder: "rgba(245,158,11,0.25)",
        iconColor: "rgb(252,211,77)",
        chipBg: "rgba(245,158,11,0.12)",
        chipBorder: "rgba(245,158,11,0.3)",
        chipText: "rgb(252,211,77)",
    };
}

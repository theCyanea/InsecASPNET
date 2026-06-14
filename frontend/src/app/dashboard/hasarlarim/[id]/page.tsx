"use client";

// ─── /dashboard/hasarlarim/[id] ──────────────────────────────────────────────
// Tek hasar detay sayfası. Müşteri kendi hasarının durumunu, admin notunu,
// onaylanan tutarı, ret sebebini görür. "İncelemede" durumundaysa iptal
// edebilir.
//
// Backend: GET /api/Claims/hasar-detayi/{id} → Claim + Policy + Images

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { FotografLightbox } from "@/components/insurtech/FotografLightbox";
import {
    IconArrowLeft,
    IconAlertTriangle,
    IconCalendarEvent,
    IconMapPin,
    IconCash,
    IconFileText,
    IconCheck,
    IconClock,
    IconX,
    IconHash,
    IconShieldCheck,
    IconCamera,
    IconTrash,
    IconUser,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";
// Yüklenen hasar fotoğrafları backend'in static files servisi tarafından
// /uploads/claims/abc.png formatında serve edilir; img tag'ında bu host'la
// birlikte kullanmamız gerek (frontend localhost:3000, backend :5156).
const STATIC_BASE = "http://localhost:5156";

interface ProductMini {
    productName: string;
}

interface InsuredPersonMini {
    adSoyad: string;
    yakinlik: string;
}

interface PolicyMini {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    customerId: number;
    product?: ProductMini;
    insuredPerson?: InsuredPersonMini | null;
}

interface ClaimImage {
    id: number;
    imageUrl: string;
}

interface HasarDetay {
    id: number;
    hasarTuru: string;
    hasarTarihi: string;
    hasarYeri?: string | null;
    claimDescription: string;
    claimAmount?: number | null;   // Tahmini — opsiyonel
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

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function tarihSaatFormat(d: Date) {
    return d.toLocaleString("tr-TR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

export default function HasarDetayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [hasar, setHasar] = useState<HasarDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    // İptal akışı
    const [iptalModalAcik, setIptalModalAcik] = useState(false);
    const [iptalEdiliyor, setIptalEdiliyor] = useState(false);
    const [iptalHatasi, setIptalHatasi] = useState("");

    // Lightbox akışı — hangi fotoğrafa tıklandı, modal açık mı
    const [lightboxAcik, setLightboxAcik] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // ─── Referrer-aware geri navigation ────────────────────────────────────
    // Etiket + davranış birlikte değişir. Bazı durumlarda router.back() yanlış
    // davranış yapardı (örn. yeni hasar oluşturduktan sonra detaya yönlendirildi
    // → back form sayfasına geri dönerdi, kafa karıştırıcı).
    const [geriEtiket, setGeriEtiket] = useState("Hasarlarım");
    const [geriHedef, setGeriHedef] = useState<"back" | "policy" | "hasarlarim">("back");

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const ref = document.referrer || "";
            if (!ref) {
                setGeriHedef("hasarlarim");
                return;
            }
            const refUrl = new URL(ref);
            if (refUrl.host !== window.location.host) {
                setGeriHedef("hasarlarim");
                return;
            }
            const path = refUrl.pathname;
            if (path.startsWith("/dashboard/policeler/") && !path.includes("/duzenle")) {
                setGeriEtiket("Poliçeye dön");
                setGeriHedef("back");
            } else if (path === "/dashboard/hasarlarim") {
                setGeriEtiket("Hasarlarım");
                setGeriHedef("back");
            } else if (path.startsWith("/dashboard/hasar-olustur")) {
                // Yeni hasar oluşturduktan sonra otomatik yönlendirildi.
                // back yapsak form sayfasına döner — istemiyoruz, listeye gitsin.
                setGeriEtiket("Hasarlarım");
                setGeriHedef("hasarlarim");
            } else {
                setGeriEtiket("Geri");
                setGeriHedef("back");
            }
        } catch {
            // sessizce default
        }
    }, [id]);

    const geriDon = () => {
        if (geriHedef === "hasarlarim") {
            router.push("/dashboard/hasarlarim");
            return;
        }
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/dashboard/hasarlarim");
        }
    };

    // Tam URL listesi — lightbox component'ine geçiyoruz.
    // useMemo: hasar nesnesi değişene kadar yeniden hesaplanmasın
    // (lightbox prop'u referans değişmesin diye stabil tutuyoruz).
    const tamFotografUrlleri = useMemo(() => {
        return (hasar?.images ?? []).map((img) =>
            img.imageUrl.startsWith("http") ? img.imageUrl : `${STATIC_BASE}${img.imageUrl}`
        );
    }, [hasar]);

    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Claims/hasar-detayi/${id}`, {
                    credentials: "include",
                });
                if (r.status === 401) {
                    window.location.href = "/";
                    return;
                }
                if (r.status === 404) {
                    setHata("Hasar kaydı bulunamadı veya size ait değil.");
                    return;
                }
                if (!r.ok) throw new Error();
                const data: HasarDetay = await r.json();
                setHasar(data);
            } catch {
                setHata("Hasar detayları yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, [id]);

    const hasariIptalEt = async () => {
        setIptalEdiliyor(true);
        setIptalHatasi("");
        try {
            const r = await fetch(`${API}/Claims/${id}/iptal`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setIptalHatasi(txt || "İptal edilemedi.");
                return;
            }
            router.push("/dashboard/hasarlarim");
        } catch {
            setIptalHatasi("Bağlantı hatası.");
        } finally {
            setIptalEdiliyor(false);
        }
    };

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

    if (hata || !hasar) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href="/dashboard/hasarlarim"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Hasar Listesi
                    </Link>
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(239,68,68,0.05)",
                            border: "1px solid rgba(239,68,68,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <p className="text-white text-base font-semibold">
                            {hata || "Bir şeyler ters gitti."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const renk = durumRengi(hasar.claimStatus);
    const incelemede = hasar.claimStatus === "İncelemede";
    const onaylandi = hasar.claimStatus === "Onaylandı";
    const odendi = hasar.claimStatus === "Ödendi";
    const reddedildi = hasar.claimStatus === "Reddedildi";

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Geri linki */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-5"
                >
                    <button
                        type="button"
                        onClick={geriDon}
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        {geriEtiket}
                    </button>
                </motion.div>

                {/* Ana özet kartı */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <div
                        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
                        style={{ background: `radial-gradient(ellipse, ${renk.glow}, transparent 70%)` }}
                    />

                    {/* Üst — durum + hasar türü */}
                    <div
                        className="relative px-6 lg:px-8 py-6 flex items-start gap-4"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: renk.iconBg,
                                border: `1px solid ${renk.iconBorder}`,
                            }}
                        >
                            <IconAlertTriangle className="w-6 h-6" style={{ color: renk.iconColor }} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">
                                    {hasar.hasarTuru}
                                </h1>
                                <span
                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                                    style={{
                                        background: renk.chipBg,
                                        border: `1px solid ${renk.chipBorder}`,
                                        color: renk.chipText,
                                    }}
                                >
                                    {incelemede && <IconClock className="w-3 h-3" />}
                                    {onaylandi && <IconCheck className="w-3 h-3" />}
                                    {odendi && <IconCash className="w-3 h-3" />}
                                    {reddedildi && <IconX className="w-3 h-3" />}
                                    {hasar.claimStatus}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <IconHash className="w-3.5 h-3.5 text-white/35" />
                                <span className="text-white/55 text-[12px] font-mono tabular-nums">
                                    Dosya No: HSR-{String(hasar.id).padStart(6, "0")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tarih bilgi şeridi */}
                    <div className="px-6 lg:px-8 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <BilgiKutu
                                baslik="Olay Tarihi"
                                deger={tarihFormat(new Date(hasar.hasarTarihi))}
                                Icon={IconCalendarEvent}
                            />
                            <BilgiKutu
                                baslik="Bildirim"
                                deger={tarihFormat(new Date(hasar.claimDate))}
                                Icon={IconFileText}
                            />
                            <BilgiKutu
                                baslik={
                                    hasar.onaylananTutar != null
                                        ? "Onaylanan Tutar"
                                        : hasar.claimAmount != null
                                            ? "Tahmini"
                                            : "Tutar"
                                }
                                deger={
                                    hasar.onaylananTutar != null
                                        ? paraFormat(hasar.onaylananTutar)
                                        : hasar.claimAmount != null
                                            ? paraFormat(hasar.claimAmount)
                                            : "Eksper inceliyor"
                                }
                                Icon={IconCash}
                                vurgu
                            />
                        </div>
                    </div>

                    {/* İptal butonu — sadece İncelemede */}
                    {incelemede && (
                        <div
                            className="px-6 lg:px-8 py-4 flex items-center justify-between gap-4 flex-wrap"
                            style={{
                                borderTop: "1px solid rgba(255,255,255,0.06)",
                                background: "rgba(255,255,255,0.02)",
                            }}
                        >
                            <p className="text-white/50 text-[12px]">
                                Eksperimiz değerlendirme yapana kadar iptal edebilirsin.
                            </p>
                            <button
                                onClick={() => setIptalModalAcik(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                style={{
                                    color: "rgb(252,165,165)",
                                    background: "rgba(239,68,68,0.06)",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                }}
                            >
                                <IconTrash className="w-4 h-4" />
                                Talebi İptal Et
                            </button>
                        </div>
                    )}
                </motion.div>

                {/* ── Olay Açıklaması ─────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.4 }}
                    className="mt-5 rounded-2xl px-5 lg:px-6 py-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <IconFileText className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                        <h2 className="text-white/85 text-sm font-semibold">Olay Açıklaması</h2>
                    </div>
                    <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">
                        {hasar.claimDescription}
                    </p>
                    {hasar.hasarYeri && (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-white/50">
                            <IconMapPin className="w-3.5 h-3.5" />
                            <span>{hasar.hasarYeri}</span>
                        </div>
                    )}
                </motion.div>

                {/* ── Admin değerlendirmesi (varsa) ──────────────────────────── */}
                {(hasar.adminNotu || hasar.retSebebi) && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.4 }}
                        className="mt-5 rounded-2xl px-5 lg:px-6 py-5"
                        style={{
                            background: reddedildi
                                ? "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(220,38,38,0.02))"
                                : "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(37,99,235,0.02))",
                            border: reddedildi
                                ? "1px solid rgba(239,68,68,0.2)"
                                : "1px solid rgba(59,130,246,0.2)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            {reddedildi ? (
                                <IconX className="w-4 h-4 text-red-300" />
                            ) : (
                                <IconShieldCheck className="w-4 h-4" style={{ color: "rgb(147,197,253)" }} />
                            )}
                            <h2 className="text-white/85 text-sm font-semibold">
                                {reddedildi ? "Red Sebebi" : "Eksper Notu"}
                            </h2>
                            {hasar.sonuclanmaTarihi && (
                                <span className="ml-auto text-white/35 text-[11px]">
                                    {tarihSaatFormat(new Date(hasar.sonuclanmaTarihi))}
                                </span>
                            )}
                        </div>
                        <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">
                            {hasar.retSebebi ?? hasar.adminNotu}
                        </p>
                    </motion.div>
                )}

                {/* ── Poliçe bilgisi ─────────────────────────────────────────── */}
                {hasar.policy && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="mt-5 rounded-2xl px-5 lg:px-6 py-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <IconShieldCheck className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                            <h2 className="text-white/85 text-sm font-semibold">Poliçe Bilgisi</h2>
                        </div>
                        <Link
                            href={`/dashboard/policeler/${hasar.policy.id}`}
                            className="group/link block rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.02]"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-white text-[13.5px] font-semibold truncate">
                                        {hasar.policy.product?.productName ?? "Sigorta Ürünü"}
                                    </p>
                                    <p className="text-white/45 text-[12px] mt-0.5 font-mono tabular-nums">
                                        {hasar.policy.policyNumber}
                                    </p>
                                </div>
                                {hasar.policy.insuredPerson && (
                                    <div className="flex items-center gap-1.5 text-[11px]">
                                        <IconUser className="w-3 h-3 text-white/35" />
                                        <span className="text-white/55">{hasar.policy.insuredPerson.adSoyad}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    </motion.div>
                )}

                {/* ── Fotoğraflar ─────────────────────────────────────────────── */}
                {hasar.images && hasar.images.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.4 }}
                        className="mt-5 rounded-2xl px-5 lg:px-6 py-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <IconCamera className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                            <h2 className="text-white/85 text-sm font-semibold">
                                Fotoğraflar
                                <span className="text-white/35 font-normal ml-2">
                                    ({hasar.images.length})
                                </span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {hasar.images.map((img, i) => {
                                // Backend /uploads/claims/abc.png döner; localhost:5156 prefix ekle
                                const tamUrl = img.imageUrl.startsWith("http")
                                    ? img.imageUrl
                                    : `${STATIC_BASE}${img.imageUrl}`;
                                return (
                                    <button
                                        key={img.id}
                                        type="button"
                                        onClick={() => {
                                            setLightboxIndex(i);
                                            setLightboxAcik(true);
                                        }}
                                        className="group/img relative aspect-square rounded-xl overflow-hidden block cursor-zoom-in"
                                        style={{
                                            background: "rgba(255,255,255,0.02)",
                                            border: "1px solid rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={tamUrl}
                                            alt={`Hasar fotoğrafı ${i + 1}`}
                                            className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                        {/* Hover overlay — büyütme ipucu */}
                                        <div
                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            style={{ background: "rgba(0,0,0,0.4)" }}
                                        >
                                            <span className="text-white/90 text-[11px] font-semibold uppercase tracking-wider">
                                                Büyüt
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ── İptal Modalı ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {iptalModalAcik && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget && !iptalEdiliyor) {
                                setIptalModalAcik(false);
                            }
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-sm rounded-2xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,16,0.98))",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}
                        >
                            <div className="p-6 text-center">
                                <div
                                    className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4"
                                    style={{
                                        background: "rgba(239,68,68,0.12)",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                    }}
                                >
                                    <IconAlertTriangle className="w-6 h-6 text-red-300" />
                                </div>
                                <h3 className="text-white text-base font-semibold mb-1">
                                    Hasar talebini iptal et?
                                </h3>
                                <p className="text-white/55 text-[13px]">
                                    Talep iptal edilince geri alınamaz. Aynı olay için yeniden talep açabilirsin.
                                </p>
                                {iptalHatasi && (
                                    <p className="mt-3 text-red-300 text-[12px]">{iptalHatasi}</p>
                                )}
                            </div>
                            <div
                                className="px-6 py-4 flex items-center gap-3 justify-end"
                                style={{
                                    borderTop: "1px solid rgba(255,255,255,0.06)",
                                    background: "rgba(255,255,255,0.02)",
                                }}
                            >
                                <button
                                    onClick={() => setIptalModalAcik(false)}
                                    disabled={iptalEdiliyor}
                                    className="text-[13px] text-white/55 hover:text-white/90 transition-colors disabled:opacity-40"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={hasariIptalEt}
                                    disabled={iptalEdiliyor}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))",
                                        color: "#ffffff",
                                        border: "1px solid rgba(239,68,68,0.5)",
                                    }}
                                >
                                    {iptalEdiliyor ? "İptal ediliyor..." : "Evet, iptal et"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Fotoğraf Lightbox ─────────────────────────────────────────
                Reusable component — tam ekran modal, backdrop blur,
                ESC/← →/X ile kontrol, çoklu fotoğrafta navigation. */}
            <FotografLightbox
                fotograflar={tamFotografUrlleri}
                acik={lightboxAcik}
                baslangicIndex={lightboxIndex}
                onKapat={() => setLightboxAcik(false)}
            />
        </div>
    );
}

function BilgiKutu({
    baslik, deger, Icon, vurgu,
}: {
    baslik: string; deger: string; Icon: React.ElementType; vurgu?: boolean;
}) {
    return (
        <div
            className="rounded-xl px-4 py-3.5"
            style={{
                background: vurgu
                    ? "linear-gradient(135deg, rgba(226,232,240,0.06), rgba(148,163,184,0.02))"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${vurgu ? "rgba(226,232,240,0.18)" : "rgba(255,255,255,0.06)"}`,
            }}
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: vurgu ? "#e2e8f0" : "rgba(255,255,255,0.4)" }} />
                <p
                    className="text-[11px] uppercase tracking-wider font-medium"
                    style={{ color: vurgu ? "#cbd5e1" : "rgba(255,255,255,0.4)" }}
                >
                    {baslik}
                </p>
            </div>
            <p className={`text-base font-semibold tabular-nums ${vurgu ? "text-white" : "text-white/80"}`}>
                {deger}
            </p>
        </div>
    );
}

function durumRengi(durum: string) {
    if (durum === "Onaylandı") {
        return {
            glow: "rgba(59,130,246,0.18)",
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
            glow: "rgba(16,185,129,0.18)",
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
            glow: "rgba(239,68,68,0.18)",
            iconBg: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.08))",
            iconBorder: "rgba(239,68,68,0.25)",
            iconColor: "rgb(252,165,165)",
            chipBg: "rgba(239,68,68,0.12)",
            chipBorder: "rgba(239,68,68,0.3)",
            chipText: "rgb(252,165,165)",
        };
    }
    return {
        glow: "rgba(245,158,11,0.18)",
        iconBg: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))",
        iconBorder: "rgba(245,158,11,0.25)",
        iconColor: "rgb(252,211,77)",
        chipBg: "rgba(245,158,11,0.12)",
        chipBorder: "rgba(245,158,11,0.3)",
        chipText: "rgb(252,211,77)",
    };
}

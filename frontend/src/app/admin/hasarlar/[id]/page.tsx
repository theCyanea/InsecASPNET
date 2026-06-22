"use client";

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
    IconUser,
    IconMail,
    IconAlertCircle,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";
const STATIC_BASE = "http://localhost:5156";

interface ClaimImage {
    id: number;
    imageUrl: string;
}

interface ProductMini { productName: string; }

interface CustomerMini {
    id: number;
    adi: string;
    soyadi: string;
    email: string;
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
    customer?: CustomerMini;
    product?: ProductMini;
    insuredPerson?: InsuredPersonMini | null;
}

interface HasarDetay {
    id: number;
    hasarTuru: string;
    hasarTarihi: string;
    hasarYeri?: string | null;
    claimDescription: string;
    claimAmount?: number | null;
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

export default function AdminHasarDetayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [hasar, setHasar] = useState<HasarDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    const [lightboxAcik, setLightboxAcik] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const [aksiyon, setAksiyon] = useState<"Onaylandı" | "Reddedildi" | "Ödendi" | null>(null);
    const [onaylananTutar, setOnaylananTutar] = useState("");
    const [not, setNot] = useState("");
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [gonderHata, setGonderHata] = useState("");

    const tamFotografUrlleri = useMemo(() => {
        return (hasar?.images ?? []).map((img) =>
            img.imageUrl.startsWith("http") ? img.imageUrl : `${STATIC_BASE}${img.imageUrl}`
        );
    }, [hasar]);

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Claims/hasar-detayi/${id}`, { credentials: "include" });
            if (r.status === 401) { window.location.href = "/"; return; }
            if (r.status === 403) { router.push("/admin/hasarlar"); return; }
            if (r.status === 404) { setHata("Hasar kaydı bulunamadı."); return; }
            if (!r.ok) throw new Error();
            const data = await r.json();
            setHasar(data);
            setOnaylananTutar(data.claimAmount?.toString() ?? "");
        } catch {
            setHata("Hasar detayları yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => {
        cek();
    }, [id]);

    const aksiyonAc = (a: "Onaylandı" | "Reddedildi" | "Ödendi") => {
        setAksiyon(a);
        setNot("");
        setGonderHata("");
        if (a === "Onaylandı" && hasar?.claimAmount != null) {
            setOnaylananTutar(hasar.claimAmount.toString());
        }
    };

    const aksiyonGonder = async () => {
        if (!aksiyon || !hasar) return;
        setGonderHata("");

        const body: { yeniDurum: string; onaylananTutar?: number; not?: string } = {
            yeniDurum: aksiyon,
        };

        if (aksiyon === "Onaylandı") {
            const t = parseFloat(onaylananTutar);
            if (isNaN(t) || t <= 0) {
                setGonderHata("Geçerli bir onay tutarı girin.");
                return;
            }
            body.onaylananTutar = t;
            if (not.trim()) body.not = not.trim();
        } else if (aksiyon === "Reddedildi") {
            if (not.trim().length < 10) {
                setGonderHata("Red sebebi en az 10 karakter olmalıdır.");
                return;
            }
            body.not = not.trim();
        } else if (aksiyon === "Ödendi") {
            if (not.trim()) body.not = not.trim();
        }

        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Claims/${hasar.id}/degerlendir`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setGonderHata(txt || "İşlem başarısız.");
                return;
            }
            setAksiyon(null);
            await cek();
        } catch {
            setGonderHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (hata || !hasar) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href="/admin/hasarlar"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Hasar Yönetimi
                    </Link>
                    <div className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(239,68,68,0.05)",
                            border: "1px solid rgba(239,68,68,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <p className="text-white text-base font-semibold">{hata || "Bir şeyler ters gitti."}</p>
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
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5"
                >
                    <Link
                        href="/admin/hasarlar"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Hasar Yönetimi
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl overflow-hidden relative mb-5"
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
                                    HSR-{String(hasar.id).padStart(6, "0")}
                                </span>
                            </div>
                        </div>
                    </div>

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
                                            ? "Müşteri Beyanı"
                                            : "Tutar"
                                }
                                deger={
                                    hasar.onaylananTutar != null
                                        ? paraFormat(hasar.onaylananTutar)
                                        : hasar.claimAmount != null
                                            ? paraFormat(hasar.claimAmount)
                                            : "Belirsiz"
                                }
                                Icon={IconCash}
                                vurgu
                            />
                        </div>
                    </div>
                </motion.div>

                {hasar.policy?.customer && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-2xl px-5 lg:px-6 py-5 mb-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.02))",
                            border: "1px solid rgba(245,158,11,0.18)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <IconUser className="w-4 h-4" style={{ color: "rgb(252,211,77)" }} />
                            <h2 className="text-white/85 text-sm font-semibold">Müşteri Bilgisi</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <p className="text-white/45 text-[10.5px] uppercase tracking-wider font-medium mb-1">Ad Soyad</p>
                                <p className="text-white text-[13.5px] font-semibold">
                                    {hasar.policy.customer.adi} {hasar.policy.customer.soyadi}
                                </p>
                            </div>
                            <div>
                                <p className="text-white/45 text-[10.5px] uppercase tracking-wider font-medium mb-1">E-posta</p>
                                <a
                                    href={`mailto:${hasar.policy.customer.email}`}
                                    className="text-white/85 text-[13px] hover:text-white inline-flex items-center gap-1.5"
                                >
                                    <IconMail className="w-3.5 h-3.5" />
                                    {hasar.policy.customer.email}
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.07 }}
                    className="mb-5 rounded-2xl px-5 lg:px-6 py-5"
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

                {(hasar.adminNotu || hasar.retSebebi) && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.09 }}
                        className="mb-5 rounded-2xl px-5 lg:px-6 py-5"
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

                {hasar.policy && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-5 rounded-2xl px-5 lg:px-6 py-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <IconShieldCheck className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                            <h2 className="text-white/85 text-sm font-semibold">Poliçe Bilgisi</h2>
                        </div>
                        <div className="rounded-xl px-4 py-3"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
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
                        </div>
                    </motion.div>
                )}

                {hasar.images && hasar.images.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className="mb-5 rounded-2xl px-5 lg:px-6 py-5"
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

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className="rounded-2xl px-5 lg:px-6 py-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(245,158,11,0.2)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <IconShieldCheck className="w-4 h-4" style={{ color: "rgb(252,211,77)" }} />
                        <h2 className="text-white text-sm font-semibold">Eksper Değerlendirmesi</h2>
                    </div>

                    {incelemede && !aksiyon && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => aksiyonAc("Onaylandı")}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    background: "rgba(16,185,129,0.1)",
                                    border: "1px solid rgba(16,185,129,0.3)",
                                    color: "rgb(110,231,183)",
                                }}
                            >
                                <IconCheck className="w-4 h-4" />
                                Onayla
                            </button>
                            <button
                                type="button"
                                onClick={() => aksiyonAc("Reddedildi")}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    color: "rgb(252,165,165)",
                                }}
                            >
                                <IconX className="w-4 h-4" />
                                Reddet
                            </button>
                        </div>
                    )}

                    {onaylandi && !aksiyon && (
                        <button
                            type="button"
                            onClick={() => aksiyonAc("Ödendi")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                            style={{
                                background: "rgba(16,185,129,0.1)",
                                border: "1px solid rgba(16,185,129,0.3)",
                                color: "rgb(110,231,183)",
                            }}
                        >
                            <IconCash className="w-4 h-4" />
                            Ödemeyi Tamamla
                        </button>
                    )}

                    {(odendi || reddedildi) && !aksiyon && (
                        <p className="text-white/45 text-[12.5px]">
                            Bu dosya kapanmıştır, başka aksiyon alınamaz.
                        </p>
                    )}

                    <AnimatePresence>
                        {aksiyon && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-col gap-3 pt-1">
                                    <p className="text-white/85 text-[13px] font-medium">
                                        {aksiyon === "Onaylandı" && "Hasar talebini onaylıyorsun."}
                                        {aksiyon === "Reddedildi" && "Hasar talebini reddediyorsun."}
                                        {aksiyon === "Ödendi" && "Ödemeyi tamamlanmış olarak işaretliyorsun."}
                                    </p>

                                    {aksiyon === "Onaylandı" && (
                                        <div>
                                            <label className="text-white/65 text-[11.5px] font-medium mb-1.5 block uppercase tracking-wider">
                                                Onaylanan Tutar (₺)
                                            </label>
                                            <input
                                                type="number"
                                                value={onaylananTutar}
                                                onChange={(e) => setOnaylananTutar(e.target.value)}
                                                placeholder="Örn: 25000"
                                                step="0.01"
                                                disabled={gonderiliyor}
                                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums"
                                                style={{
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    color: "#ffffff",
                                                }}
                                            />
                                            {hasar.claimAmount != null && (
                                                <p className="text-white/35 text-[11px] mt-1">
                                                    Müşteri beyanı: {paraFormat(hasar.claimAmount)} (üst sınır)
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-white/65 text-[11.5px] font-medium mb-1.5 block uppercase tracking-wider">
                                            {aksiyon === "Reddedildi" ? "Red Sebebi" : "Eksper Notu"}
                                            {aksiyon === "Reddedildi" && <span className="text-red-300"> *</span>}
                                            {aksiyon !== "Reddedildi" && <span className="text-white/35 ml-1">(opsiyonel)</span>}
                                        </label>
                                        <textarea
                                            value={not}
                                            onChange={(e) => setNot(e.target.value)}
                                            placeholder={
                                                aksiyon === "Reddedildi"
                                                    ? "Müşteriye bildirilecek red gerekçesi..."
                                                    : "Eksper değerlendirme notu..."
                                            }
                                            rows={4}
                                            disabled={gonderiliyor}
                                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                                color: "#ffffff",
                                            }}
                                        />
                                    </div>

                                    {gonderHata && (
                                        <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
                                            style={{
                                                background: "rgba(239,68,68,0.08)",
                                                border: "1px solid rgba(239,68,68,0.25)",
                                                color: "rgb(252,165,165)",
                                            }}
                                        >
                                            <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                            {gonderHata}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAksiyon(null)}
                                            disabled={gonderiliyor}
                                            className="text-[13px] text-white/55 hover:text-white/90 transition-colors"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            type="button"
                                            onClick={aksiyonGonder}
                                            disabled={gonderiliyor}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                                            style={
                                                aksiyon === "Reddedildi"
                                                    ? {
                                                        background: "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))",
                                                        color: "#ffffff",
                                                        border: "1px solid rgba(239,68,68,0.5)",
                                                    }
                                                    : {
                                                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                                        color: "#0f172a",
                                                        border: "1px solid rgba(226,232,240,0.5)",
                                                    }
                                            }
                                        >
                                            {gonderiliyor && (
                                                <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                    style={{
                                                        borderColor: aksiyon === "Reddedildi" ? "#fff" : "#0f172a",
                                                        borderTopColor: "transparent",
                                                    }} />
                                            )}
                                            {aksiyon === "Onaylandı" && "Onayla"}
                                            {aksiyon === "Reddedildi" && "Reddet"}
                                            {aksiyon === "Ödendi" && "Ödemeyi Tamamla"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

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

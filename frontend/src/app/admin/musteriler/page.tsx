"use client";

// ─── /admin/musteriler ───────────────────────────────────────────────────────
// Tüm müşterileri listeleyen sayfa. Sol kolonda liste + arama, sağda
// seçilen müşterinin detayı (poliçeler, hasarlar, ödemeler) gösteriliyor.
//
// Backend:
//   - GET /api/Customers/tum-musterileri-getir → liste
//   - GET /api/Admin/musteri-detay/{id}        → tek müşteri zenginleştirilmiş

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "@/components/insurtech/Avatar";
import {
    IconSearch,
    IconUser,
    IconMail,
    IconPhone,
    IconHash,
    IconCalendarEvent,
    IconShieldCheck,
    IconAlertTriangle,
    IconCash,
    IconFileText,
    IconCheck,
    IconX,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Musteri {
    id: number;
    adi: string;
    soyadi: string;
    email: string;
    telefonNo: string;
    kimlikNo: string;
    dogumTarihi: string;
    rol: string;
    isActive: boolean;
    avatarUrl?: string | null;
}

interface PoliceMini {
    id: number;
    policyNumber: string;
    urunAdi: string;
    status: string;
    price: number;
    startDate: string;
    endDate: string;
}

interface HasarMini {
    id: number;
    hasarTuru: string;
    claimStatus: string;
    claimAmount?: number | null;
    onaylananTutar?: number | null;
    claimDate: string;
    policeNo: string;
}

interface OdemeMini {
    id: number;
    tutar: number;
    durum: string;
    islemTarihi: string;
    islemReferansi: string;
    policeNo: string;
}

interface MusteriDetay {
    musteri: Musteri;
    policeler: PoliceMini[];
    hasarlar: HasarMini[];
    odemeler: OdemeMini[];
}

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MusterilerPage() {
    const [musteriler, setMusteriler] = useState<Musteri[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [arama, setArama] = useState("");
    const [seciliId, setSeciliId] = useState<number | null>(null);
    const [detay, setDetay] = useState<MusteriDetay | null>(null);
    const [detayYukleniyor, setDetayYukleniyor] = useState(false);

    // Liste çek
    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Customers/tum-musterileri-getir`, {
                    credentials: "include",
                });
                if (!r.ok) throw new Error();
                const data = await r.json();
                setMusteriler(Array.isArray(data) ? data : []);
                if (data.length > 0) setSeciliId(data[0].id);
            } catch {
                // sessiz fail
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, []);

    // Detay çek
    useEffect(() => {
        if (seciliId == null) return;
        const cek = async () => {
            setDetayYukleniyor(true);
            try {
                const r = await fetch(`${API}/Admin/musteri-detay/${seciliId}`, {
                    credentials: "include",
                });
                if (!r.ok) throw new Error();
                const data = await r.json();
                setDetay(data);
            } catch {
                setDetay(null);
            } finally {
                setDetayYukleniyor(false);
            }
        };
        cek();
    }, [seciliId]);

    // Arama filtresi (case-insensitive)
    const filtreli = useMemo(() => {
        if (!arama.trim()) return musteriler;
        const q = arama.toLowerCase();
        return musteriler.filter((m) =>
            `${m.adi} ${m.soyadi}`.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.kimlikNo.includes(q) ||
            m.telefonNo.includes(q)
        );
    }, [musteriler, arama]);

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Üst başlık */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <p className="text-[11px] uppercase tracking-wider font-bold mb-1"
                        style={{ color: "#fbbf24" }}
                    >
                        Yönetici Paneli
                    </p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Müşteriler<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        {musteriler.length} kayıtlı müşteri.
                        {arama && ` "${arama}" için ${filtreli.length} sonuç.`}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
                    {/* Sol: liste */}
                    <div
                        className="rounded-2xl overflow-hidden flex flex-col"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                            maxHeight: "calc(100vh - 180px)",
                        }}
                    >
                        {/* Arama */}
                        <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                                <input
                                    type="text"
                                    value={arama}
                                    onChange={(e) => setArama(e.target.value)}
                                    placeholder="Ad, e-posta, TC, telefon..."
                                    className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#ffffff",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Müşteri listesi */}
                        <div className="overflow-y-auto flex-1">
                            {filtreli.length === 0 ? (
                                <div className="p-8 text-center text-white/45 text-[12.5px]">
                                    Sonuç bulunamadı.
                                </div>
                            ) : (
                                filtreli.map((m) => {
                                    const aktif = seciliId === m.id;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setSeciliId(m.id)}
                                            className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-white/[0.03]"
                                            style={{
                                                background: aktif
                                                    ? "rgba(245,158,11,0.06)"
                                                    : "transparent",
                                                borderLeft: aktif
                                                    ? "2px solid rgb(252,211,77)"
                                                    : "2px solid transparent",
                                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                            }}
                                        >
                                            <Avatar
                                                adi={m.adi}
                                                soyadi={m.soyadi}
                                                avatarUrl={m.avatarUrl}
                                                boyut={36}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white text-[13px] font-medium truncate">
                                                        {m.adi} {m.soyadi}
                                                    </p>
                                                    {m.rol === "Admin" && (
                                                        <span
                                                            className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                                                            style={{
                                                                background: "rgba(245,158,11,0.12)",
                                                                color: "rgb(252,211,77)",
                                                                border: "1px solid rgba(245,158,11,0.25)",
                                                            }}
                                                        >
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-white/45 text-[11px] truncate mt-0.5">
                                                    {m.email}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Sağ: detay paneli */}
                    <AnimatePresence mode="wait">
                        {detayYukleniyor ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="rounded-2xl flex items-center justify-center min-h-[400px]"
                                style={{
                                    background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                                />
                            </motion.div>
                        ) : detay ? (
                            <motion.div
                                key={detay.musteri.id}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-4"
                            >
                                <DetayPaneli detay={detay} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="bos"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="rounded-2xl p-12 text-center"
                                style={{
                                    background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                    border: "1px dashed rgba(255,255,255,0.08)",
                                }}
                            >
                                <p className="text-white/55 text-sm">Detay görmek için bir müşteri seçin.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function DetayPaneli({ detay }: { detay: MusteriDetay }) {
    const m = detay.musteri;

    const aktifPolice = detay.policeler.filter((p) => p.status === "Aktif Poliçe").length;
    const acikHasar = detay.hasarlar.filter((h) => h.claimStatus === "İncelemede").length;
    const toplamOdenen = detay.odemeler
        .filter((o) => o.durum === "Başarılı")
        .reduce((s, o) => s + o.tutar, 0);

    return (
        <>
            {/* Üst kart — kişisel bilgiler + KPI */}
            <div
                className="rounded-2xl p-6"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-start gap-4 mb-5">
                    <Avatar adi={m.adi} soyadi={m.soyadi} avatarUrl={m.avatarUrl} boyut={64} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-white text-xl font-bold tracking-tight">
                                {m.adi} {m.soyadi}
                            </h2>
                            {m.rol === "Admin" && (
                                <span
                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                    style={{
                                        background: "rgba(245,158,11,0.12)",
                                        color: "rgb(252,211,77)",
                                        border: "1px solid rgba(245,158,11,0.25)",
                                    }}
                                >
                                    Yönetici
                                </span>
                            )}
                            {!m.isActive && (
                                <span
                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                    style={{
                                        background: "rgba(239,68,68,0.12)",
                                        color: "rgb(252,165,165)",
                                        border: "1px solid rgba(239,68,68,0.25)",
                                    }}
                                >
                                    Pasif
                                </span>
                            )}
                        </div>
                        <p className="text-white/45 text-[12px] mt-0.5 font-mono">
                            #{String(m.id).padStart(6, "0")}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                    <BilgiSatiri Icon={IconMail} etiket="E-posta" deger={m.email} />
                    <BilgiSatiri Icon={IconPhone} etiket="Telefon" deger={m.telefonNo} />
                    <BilgiSatiri
                        Icon={IconHash}
                        etiket="TC Kimlik"
                        deger={m.kimlikNo
                            ? `${m.kimlikNo.slice(0, 3)}******${m.kimlikNo.slice(-2)}`
                            : "—"}
                    />
                    <BilgiSatiri
                        Icon={IconCalendarEvent}
                        etiket="Doğum Tarihi"
                        deger={m.dogumTarihi
                            ? new Date(m.dogumTarihi).toLocaleDateString("tr-TR", {
                                day: "2-digit", month: "long", year: "numeric"
                            })
                            : "—"}
                    />
                </div>

                {/* KPI satırı */}
                <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Kpi etiket="Aktif Poliçe" deger={`${aktifPolice}`} renk="emerald" />
                    <Kpi etiket="Açık Hasar" deger={`${acikHasar}`} renk="amber" />
                    <Kpi etiket="Toplam Ödeme" deger={paraFormat(toplamOdenen)} renk="slate" />
                </div>
            </div>

            {/* Poliçeler */}
            <Bolum baslik="Poliçeler" Icon={IconShieldCheck} sayi={detay.policeler.length}>
                {detay.policeler.length === 0 ? (
                    <BosBolum metin="Bu müşterinin henüz poliçesi yok." />
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {detay.policeler.map((p) => (
                            <SatirKart key={p.id}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-white text-[13px] font-medium truncate">
                                            {p.urunAdi}
                                        </span>
                                        <DurumRozeti durum={p.status} />
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                                        <span className="font-mono tabular-nums">{p.policyNumber}</span>
                                        <span>·</span>
                                        <span>{tarihFormat(new Date(p.startDate))} → {tarihFormat(new Date(p.endDate))}</span>
                                    </div>
                                </div>
                                <span className="text-white text-[13px] font-semibold tabular-nums flex-shrink-0">
                                    {paraFormat(p.price)}
                                </span>
                            </SatirKart>
                        ))}
                    </div>
                )}
            </Bolum>

            {/* Hasarlar */}
            <Bolum baslik="Hasar Talepleri" Icon={IconAlertTriangle} sayi={detay.hasarlar.length}>
                {detay.hasarlar.length === 0 ? (
                    <BosBolum metin="Hasar talebi yok." />
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {detay.hasarlar.map((h) => (
                            <SatirKart key={h.id}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-white text-[13px] font-medium truncate">
                                            {h.hasarTuru}
                                        </span>
                                        <DurumRozeti durum={h.claimStatus} />
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                                        <span className="font-mono tabular-nums">HSR-{String(h.id).padStart(6, "0")}</span>
                                        <span>·</span>
                                        <span>{h.policeNo}</span>
                                        <span>·</span>
                                        <span>{tarihFormat(new Date(h.claimDate))}</span>
                                    </div>
                                </div>
                                <span className="text-white text-[13px] font-semibold tabular-nums flex-shrink-0">
                                    {h.onaylananTutar != null
                                        ? paraFormat(h.onaylananTutar)
                                        : h.claimAmount != null
                                            ? paraFormat(h.claimAmount)
                                            : "—"}
                                </span>
                            </SatirKart>
                        ))}
                    </div>
                )}
            </Bolum>

            {/* Ödemeler */}
            <Bolum baslik="Ödemeler" Icon={IconCash} sayi={detay.odemeler.length}>
                {detay.odemeler.length === 0 ? (
                    <BosBolum metin="Ödeme kaydı yok." />
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {detay.odemeler.slice(0, 10).map((o) => {
                            const basarili = o.durum === "Başarılı";
                            return (
                                <SatirKart key={o.id}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {basarili ? (
                                                <IconCheck className="w-3.5 h-3.5 text-emerald-300" strokeWidth={3} />
                                            ) : (
                                                <IconX className="w-3.5 h-3.5 text-red-300" strokeWidth={3} />
                                            )}
                                            <span className="text-white text-[12px] font-medium">{o.durum}</span>
                                            <span className="text-white/35 text-[10.5px] font-mono">{o.islemReferansi}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-white/45">
                                            <span>{o.policeNo}</span>
                                            <span>·</span>
                                            <span>{tarihFormat(new Date(o.islemTarihi))}</span>
                                        </div>
                                    </div>
                                    <span className="text-white text-[13px] font-semibold tabular-nums flex-shrink-0">
                                        {paraFormat(o.tutar)}
                                    </span>
                                </SatirKart>
                            );
                        })}
                        {detay.odemeler.length > 10 && (
                            <p className="text-white/35 text-[11px] text-center mt-2">
                                + {detay.odemeler.length - 10} daha eski kayıt
                            </p>
                        )}
                    </div>
                )}
            </Bolum>
        </>
    );
}

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

function BilgiSatiri({ Icon, etiket, deger }: { Icon: React.ElementType; etiket: string; deger: string }) {
    return (
        <div
            className="rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
            <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3 text-white/35" />
                <p className="text-white/40 text-[10px] uppercase tracking-wider">{etiket}</p>
            </div>
            <p className="text-white/85 text-[12.5px] truncate">{deger}</p>
        </div>
    );
}

function Kpi({ etiket, deger, renk }: { etiket: string; deger: string; renk: "emerald" | "amber" | "slate" }) {
    const palet = {
        emerald: "rgb(110,231,183)",
        amber:   "rgb(252,211,77)",
        slate:   "#cbd5e1",
    }[renk];
    return (
        <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">{etiket}</p>
            <p className="text-base font-bold tabular-nums" style={{ color: palet }}>
                {deger}
            </p>
        </div>
    );
}

function Bolum({
    baslik, Icon, sayi, children,
}: {
    baslik: string; Icon: React.ElementType; sayi: number; children: React.ReactNode;
}) {
    return (
        <div
            className="rounded-2xl p-5"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                <h3 className="text-white/85 text-sm font-semibold">{baslik}</h3>
                <span className="text-white/35 text-[11px] font-normal">({sayi})</span>
            </div>
            {children}
        </div>
    );
}

function BosBolum({ metin }: { metin: string }) {
    return (
        <div
            className="rounded-xl px-4 py-6 text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
        >
            <p className="text-white/45 text-[12px]">{metin}</p>
        </div>
    );
}

function SatirKart({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="px-3 py-2.5 rounded-lg flex items-center justify-between gap-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
            {children}
        </div>
    );
}

function DurumRozeti({ durum }: { durum: string }) {
    const renkPalet: Record<string, { bg: string; border: string; text: string }> = {
        "Aktif Poliçe":    { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)" },
        "Teklif Bekliyor": { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)" },
        "İncelemede":      { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)" },
        "Onaylandı":       { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "rgb(147,197,253)" },
        "Ödendi":          { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)" },
        "Reddedildi":      { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "rgb(252,165,165)" },
    };
    const r = renkPalet[durum] ?? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.6)" };
    return (
        <span
            className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
            style={{ background: r.bg, border: `1px solid ${r.border}`, color: r.text }}
        >
            {durum}
        </span>
    );
}

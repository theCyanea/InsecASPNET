"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconSearch,
    IconAlertTriangle,
    IconCheck,
    IconX,
    IconCash,
    IconClock,
    IconRefresh,
    IconAlertCircle,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Hasar {
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
    policy?: {
        id: number;
        policyNumber: string;
        product?: { productName: string };
        customer?: { adi: string; soyadi: string; email: string };
    };
    images?: { id: number; imageUrl: string }[];
}

type Sekme = "tumu" | "incelemede" | "onaylandi" | "odendi" | "reddedildi";

const SEKMELER: { key: Sekme; etiket: string; durum: string | null }[] = [
    { key: "tumu",       etiket: "Tümü",         durum: null         },
    { key: "incelemede", etiket: "İncelemede",   durum: "İncelemede" },
    { key: "onaylandi",  etiket: "Onaylandı",    durum: "Onaylandı"  },
    { key: "odendi",     etiket: "Ödendi",       durum: "Ödendi"     },
    { key: "reddedildi", etiket: "Reddedildi",   durum: "Reddedildi" },
];

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminHasarlarPage() {
    const [hasarlar, setHasarlar] = useState<Hasar[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [arama, setArama] = useState("");
    const [sekme, setSekme] = useState<Sekme>("incelemede");
    const [hata, setHata] = useState("");

    // Modal state
    const [modal, setModal] = useState<{
        hasar: Hasar;
        aksiyon: "Onaylandı" | "Reddedildi" | "Ödendi";
    } | null>(null);

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Claims/hasarlari-getir`, {
                credentials: "include",
            });
            if (!r.ok) throw new Error();
            const data = await r.json();
            setHasarlar(Array.isArray(data) ? data : []);
        } catch {
            setHata("Liste yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => { cek(); }, []);

    const filtreli = useMemo(() => {
        const aktifSekme = SEKMELER.find((s) => s.key === sekme);
        let liste = hasarlar;
        if (aktifSekme?.durum) {
            liste = liste.filter((h) => h.claimStatus === aktifSekme.durum);
        }
        if (arama.trim()) {
            const q = arama.toLowerCase();
            liste = liste.filter((h) =>
                h.hasarTuru.toLowerCase().includes(q) ||
                h.claimDescription.toLowerCase().includes(q) ||
                (h.policy?.policyNumber.toLowerCase().includes(q) ?? false) ||
                ((h.policy?.customer ? `${h.policy.customer.adi} ${h.policy.customer.soyadi}` : "").toLowerCase().includes(q))
            );
        }
        return liste;
    }, [hasarlar, sekme, arama]);

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
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-end justify-between flex-wrap gap-4"
                >
                    <div>
                        <p className="text-[11px] uppercase tracking-wider font-bold mb-1"
                            style={{ color: "#fbbf24" }}>
                            Yönetici Paneli
                        </p>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                            Hasar Yönetimi<span style={{ color: "#cbd5e1" }}>.</span>
                        </h1>
                        <p className="text-white/45 text-sm mt-1">
                            Hasar dosyalarını inceleyin, onaylayın veya reddedin.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={cek}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-white/55 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        <IconRefresh className="w-3.5 h-3.5" />
                        Yenile
                    </button>
                </motion.div>

                {hata && (
                    <div className="mb-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "rgb(252,165,165)",
                        }}
                    >
                        <IconAlertCircle className="w-4 h-4" />
                        {hata}
                    </div>
                )}

                {/* Sekmeler */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
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
                                        ? "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.04))"
                                        : "rgba(255,255,255,0.02)",
                                    border: aktif
                                        ? "1px solid rgba(245,158,11,0.3)"
                                        : "1px solid rgba(255,255,255,0.06)",
                                    color: aktif ? "#ffffff" : "rgba(255,255,255,0.55)",
                                }}
                            >
                                {s.etiket}
                                <span
                                    className="text-[10px] tabular-nums px-1.5 rounded"
                                    style={{
                                        background: aktif ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                                        color: aktif ? "rgb(252,211,77)" : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {sayi}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Arama */}
                <div className="relative mb-4">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                    <input
                        type="text"
                        value={arama}
                        onChange={(e) => setArama(e.target.value)}
                        placeholder="Hasar türü, açıklama, poliçe no veya müşteri..."
                        className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#ffffff",
                        }}
                    />
                </div>

                {/* Liste */}
                <div className="flex flex-col gap-2.5">
                    {filtreli.length === 0 ? (
                        <div
                            className="rounded-2xl p-12 text-center"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed rgba(255,255,255,0.08)",
                            }}
                        >
                            <p className="text-white/45 text-[13px]">Filtrelere uyan hasar bulunamadı.</p>
                        </div>
                    ) : (
                        filtreli.map((h) => (
                            <HasarKart key={h.id} hasar={h} onAksiyon={(aksiyon) => setModal({ hasar: h, aksiyon })} />
                        ))
                    )}
                </div>
            </div>

            {/* Değerlendirme Modal */}
            <AnimatePresence>
                {modal && (
                    <DegerlendirmeModal
                        hasar={modal.hasar}
                        aksiyon={modal.aksiyon}
                        onKapat={() => setModal(null)}
                        onBasarili={() => {
                            setModal(null);
                            cek();   // listeyi yenile
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Hasar kartı — liste item ────────────────────────────────────────────────
function HasarKart({
    hasar, onAksiyon,
}: {
    hasar: Hasar;
    onAksiyon: (aksiyon: "Onaylandı" | "Reddedildi" | "Ödendi") => void;
}) {
    const incelemede = hasar.claimStatus === "İncelemede";
    const onaylandi = hasar.claimStatus === "Onaylandı";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white text-[15px] font-semibold">{hasar.hasarTuru}</h3>
                        <DurumRozeti durum={hasar.claimStatus} />
                        <span className="text-white/35 text-[11px] font-mono">
                            HSR-{String(hasar.id).padStart(6, "0")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11.5px] text-white/55 flex-wrap">
                        {hasar.policy?.customer && (
                            <span className="font-medium">
                                {hasar.policy.customer.adi} {hasar.policy.customer.soyadi}
                            </span>
                        )}
                        <span className="text-white/30">·</span>
                        <span>{hasar.policy?.product?.productName ?? "—"}</span>
                        <span className="text-white/30">·</span>
                        <span className="font-mono tabular-nums">{hasar.policy?.policyNumber}</span>
                        <span className="text-white/30">·</span>
                        <span>Olay: {tarihFormat(new Date(hasar.hasarTarihi))}</span>
                        {hasar.hasarYeri && (
                            <>
                                <span className="text-white/30">·</span>
                                <span>{hasar.hasarYeri}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-white/45 text-[10px] uppercase tracking-wider mb-0.5">
                        {hasar.onaylananTutar != null ? "Onaylanan" : "Tahmini"}
                    </p>
                    <p className="text-white text-base font-bold tabular-nums">
                        {hasar.onaylananTutar != null
                            ? paraFormat(hasar.onaylananTutar)
                            : hasar.claimAmount != null
                                ? paraFormat(hasar.claimAmount)
                                : "Beklemede"}
                    </p>
                </div>
            </div>

            <p className="text-white/65 text-[12.5px] leading-relaxed line-clamp-2 mb-3">
                {hasar.claimDescription}
            </p>

            {/* Admin notu / red sebebi (varsa) */}
            {(hasar.adminNotu || hasar.retSebebi) && (
                <div
                    className="rounded-lg px-3 py-2 mb-3 text-[11.5px]"
                    style={{
                        background: hasar.retSebebi
                            ? "rgba(239,68,68,0.05)"
                            : "rgba(59,130,246,0.05)",
                        border: hasar.retSebebi
                            ? "1px solid rgba(239,68,68,0.18)"
                            : "1px solid rgba(59,130,246,0.18)",
                        color: hasar.retSebebi ? "rgb(252,165,165)" : "rgb(147,197,253)",
                    }}
                >
                    <strong>{hasar.retSebebi ? "Red sebebi:" : "Eksper notu:"}</strong>{" "}
                    {hasar.retSebebi ?? hasar.adminNotu}
                </div>
            )}

            {/* Fotoğraflar (varsa) */}
            {hasar.images && hasar.images.length > 0 && (
                <p className="text-white/35 text-[10.5px] mb-3">
                    {hasar.images.length} fotoğraf eklenmiş
                </p>
            )}

            {/* State machine aksiyon butonları */}
            <div className="flex items-center gap-2 flex-wrap">
                {incelemede && (
                    <>
                        <AksiyonButton
                            Icon={IconCheck}
                            label="Onayla"
                            renk="emerald"
                            onClick={() => onAksiyon("Onaylandı")}
                        />
                        <AksiyonButton
                            Icon={IconX}
                            label="Reddet"
                            renk="red"
                            onClick={() => onAksiyon("Reddedildi")}
                        />
                    </>
                )}
                {onaylandi && (
                    <AksiyonButton
                        Icon={IconCash}
                        label="Ödemeyi Tamamla"
                        renk="emerald"
                        onClick={() => onAksiyon("Ödendi")}
                    />
                )}
                {!incelemede && !onaylandi && (
                    <p className="text-white/35 text-[11.5px]">
                        Bu dosya kapanmış, başka aksiyon yok.
                    </p>
                )}
            </div>
        </motion.div>
    );
}

function AksiyonButton({
    Icon, label, renk, onClick,
}: {
    Icon: React.ElementType;
    label: string;
    renk: "emerald" | "red";
    onClick: () => void;
}) {
    const palet = renk === "emerald"
        ? { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)" }
        : { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "rgb(252,165,165)" };
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.03]"
            style={{
                background: palet.bg,
                border: `1px solid ${palet.border}`,
                color: palet.text,
            }}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}

function DurumRozeti({ durum }: { durum: string }) {
    const renkPalet: Record<string, { bg: string; border: string; text: string; Icon: React.ElementType }> = {
        "İncelemede": { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)", Icon: IconClock },
        "Onaylandı":  { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "rgb(147,197,253)", Icon: IconCheck },
        "Ödendi":     { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)", Icon: IconCash },
        "Reddedildi": { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "rgb(252,165,165)", Icon: IconX },
    };
    const r = renkPalet[durum] ?? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.6)", Icon: IconAlertTriangle };
    const Icon = r.Icon;
    return (
        <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
            style={{ background: r.bg, border: `1px solid ${r.border}`, color: r.text }}
        >
            <Icon className="w-3 h-3" />
            {durum}
        </span>
    );
}

// ─── Değerlendirme Modal ─────────────────────────────────────────────────────
// State machine'in geçişleri için form. Onaylandı: tutar zorunlu; Reddedildi:
// not zorunlu; Ödendi: not opsiyonel.
function DegerlendirmeModal({
    hasar, aksiyon, onKapat, onBasarili,
}: {
    hasar: Hasar;
    aksiyon: "Onaylandı" | "Reddedildi" | "Ödendi";
    onKapat: () => void;
    onBasarili: () => void;
}) {
    const [onaylananTutar, setOnaylananTutar] = useState(
        hasar.claimAmount?.toString() ?? ""
    );
    const [not, setNot] = useState("");
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState("");

    const onayla = async () => {
        setHata("");
        setGonderiliyor(true);
        try {
            const body: { yeniDurum: string; onaylananTutar?: number; not?: string } = {
                yeniDurum: aksiyon,
            };
            if (aksiyon === "Onaylandı") {
                const t = parseFloat(onaylananTutar);
                if (isNaN(t) || t <= 0) {
                    setHata("Geçerli bir onay tutarı girin.");
                    setGonderiliyor(false);
                    return;
                }
                body.onaylananTutar = t;
                if (not.trim()) body.not = not.trim();
            } else if (aksiyon === "Reddedildi") {
                if (not.trim().length < 10) {
                    setHata("Red sebebi en az 10 karakter olmalıdır.");
                    setGonderiliyor(false);
                    return;
                }
                body.not = not.trim();
            } else {
                if (not.trim()) body.not = not.trim();
            }

            const r = await fetch(`${API}/Claims/${hasar.id}/degerlendir`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "İşlem başarısız.");
                return;
            }
            onBasarili();
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    const baslik = aksiyon === "Onaylandı" ? "Hasar Talebini Onayla"
                 : aksiyon === "Reddedildi" ? "Hasar Talebini Reddet"
                 : "Ödemeyi Tamamla";

    const renk = aksiyon === "Reddedildi" ? "red" : "emerald";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !gonderiliyor) onKapat();
            }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,16,0.98))",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                {/* Header */}
                <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 className="text-white text-lg font-semibold">{baslik}</h2>
                    <p className="text-white/45 text-[12px] mt-0.5">
                        HSR-{String(hasar.id).padStart(6, "0")} · {hasar.hasarTuru}
                    </p>
                </div>

                {/* Form */}
                <div className="p-6 flex flex-col gap-4">
                    {aksiyon === "Onaylandı" && (
                        <div>
                            <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
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
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
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
                                    : "Eksper değerlendirme notu (opsiyonel)..."
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

                    {hata && (
                        <div className="rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
                            style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.25)",
                                color: "rgb(252,165,165)",
                            }}
                        >
                            <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {hata}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="px-6 py-4 flex items-center justify-end gap-3"
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)",
                    }}
                >
                    <button
                        type="button"
                        onClick={onKapat}
                        disabled={gonderiliyor}
                        className="text-[13px] text-white/55 hover:text-white/90 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={onayla}
                        disabled={gonderiliyor}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={
                            renk === "red"
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
                        {gonderiliyor ? (
                            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style={{
                                    borderColor: renk === "red" ? "#fff" : "#0f172a",
                                    borderTopColor: "transparent",
                                }}
                            />
                        ) : null}
                        {aksiyon === "Onaylandı" && "Onayla"}
                        {aksiyon === "Reddedildi" && "Reddet"}
                        {aksiyon === "Ödendi" && "Ödemeyi Tamamla"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

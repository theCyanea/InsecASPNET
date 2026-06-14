"use client";

// ─── /admin/policeler ────────────────────────────────────────────────────────
// Sistem genelindeki tüm aktif poliçe ve teklifleri listeler.
// Durum filtresi sekmeli (Tümü / Aktif Poliçe / Teklif Bekliyor).
// Arama: poliçe numarası veya ürün adı.
// "Onayla" butonu — sadece Teklif Bekliyor durumdakiler için (admin bypass payment).

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
    IconSearch,
    IconShieldCheck,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconRefresh,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Police {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    price: number;
    status: string;
    isActive: boolean;
    productId: number;
    customerId: number;
    product?: { productName: string };
    customer?: { adi: string; soyadi: string };
}

type Sekme = "tumu" | "aktif" | "teklif";

const SEKMELER: { key: Sekme; etiket: string; durum: string | null; Icon: React.ElementType }[] = [
    { key: "tumu",   etiket: "Tümü",            durum: null,              Icon: IconShieldCheck },
    { key: "aktif",  etiket: "Aktif Poliçeler", durum: "Aktif Poliçe",    Icon: IconShieldCheck },
    { key: "teklif", etiket: "Bekleyen Teklif", durum: "Teklif Bekliyor", Icon: IconClock },
];

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPolicelerPage() {
    const searchParams = useSearchParams();
    const initialDurum = searchParams.get("durum");

    const [policeler, setPoliceler] = useState<Police[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [arama, setArama] = useState("");
    const [sekme, setSekme] = useState<Sekme>(
        initialDurum === "Teklif Bekliyor" ? "teklif" :
        initialDurum === "Aktif Poliçe" ? "aktif" : "tumu"
    );
    const [onaylananId, setOnaylananId] = useState<number | null>(null);
    const [hata, setHata] = useState("");

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Policies/tum-policeleri-getir`, {
                credentials: "include",
            });
            if (!r.ok) throw new Error();
            const data = await r.json();
            setPoliceler(Array.isArray(data) ? data : []);
        } catch {
            setHata("Liste yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => { cek(); }, []);

    const filtreli = useMemo(() => {
        const aktifSekme = SEKMELER.find((s) => s.key === sekme);
        let liste = policeler;
        if (aktifSekme?.durum) {
            liste = liste.filter((p) => p.status === aktifSekme.durum);
        }
        if (arama.trim()) {
            const q = arama.toLowerCase();
            liste = liste.filter((p) =>
                p.policyNumber.toLowerCase().includes(q) ||
                (p.product?.productName.toLowerCase().includes(q) ?? false) ||
                ((p.customer ? `${p.customer.adi} ${p.customer.soyadi}` : "").toLowerCase().includes(q))
            );
        }
        return liste;
    }, [policeler, sekme, arama]);

    const teklifiOnayla = async (id: number) => {
        setOnaylananId(id);
        setHata("");
        try {
            const r = await fetch(`${API}/Policies/${id}/policeyi-onayla`, {
                method: "PUT",
                credentials: "include",
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Onaylanamadı.");
                return;
            }
            // Local state güncelle
            setPoliceler((prev) =>
                prev.map((p) =>
                    p.id === id ? { ...p, status: "Aktif Poliçe" } : p
                )
            );
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setOnaylananId(null);
        }
    };

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
                            Poliçeler<span style={{ color: "#cbd5e1" }}>.</span>
                        </h1>
                        <p className="text-white/45 text-sm mt-1">
                            {policeler.length} kayıt — durumuna göre filtreleyin.
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
                            ? policeler.length
                            : policeler.filter((p) => p.status === s.durum).length;
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
                                <s.Icon className="w-3.5 h-3.5" />
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
                        placeholder="Poliçe no, ürün adı veya müşteri adı..."
                        className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#ffffff",
                        }}
                    />
                </div>

                {/* Tablo */}
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {filtreli.length === 0 ? (
                        <div className="p-12 text-center text-white/45 text-[13px]">
                            Filtrelere uyan poliçe bulunamadı.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                        <th className="px-4 py-3 text-left text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Poliçe No
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Ürün
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Müşteri
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Tarih Aralığı
                                        </th>
                                        <th className="px-4 py-3 text-right text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Tutar
                                        </th>
                                        <th className="px-4 py-3 text-right text-[10.5px] uppercase tracking-wider font-medium text-white/45">
                                            Durum / Aksiyon
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtreli.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="transition-colors hover:bg-white/[0.02]"
                                            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                        >
                                            <td className="px-4 py-3 text-[12px] font-mono tabular-nums text-white/85">
                                                {p.policyNumber}
                                            </td>
                                            <td className="px-4 py-3 text-[12.5px] text-white/85">
                                                {p.product?.productName ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-[12.5px] text-white/65">
                                                {p.customer
                                                    ? `${p.customer.adi} ${p.customer.soyadi}`
                                                    : `#${p.customerId}`}
                                            </td>
                                            <td className="px-4 py-3 text-[11.5px] text-white/55 tabular-nums">
                                                {tarihFormat(new Date(p.startDate))} → {tarihFormat(new Date(p.endDate))}
                                            </td>
                                            <td className="px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-white">
                                                {paraFormat(p.price)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {p.status === "Teklif Bekliyor" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => teklifiOnayla(p.id)}
                                                        disabled={onaylananId === p.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all hover:scale-[1.03] disabled:opacity-50"
                                                        style={{
                                                            background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))",
                                                            color: "rgb(252,211,77)",
                                                            border: "1px solid rgba(245,158,11,0.3)",
                                                        }}
                                                    >
                                                        {onaylananId === p.id ? (
                                                            <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                                                style={{ borderColor: "rgb(252,211,77)", borderTopColor: "transparent" }}
                                                            />
                                                        ) : (
                                                            <IconCheck className="w-3 h-3" />
                                                        )}
                                                        Onayla
                                                    </button>
                                                ) : (
                                                    <DurumRozeti durum={p.status} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DurumRozeti({ durum }: { durum: string }) {
    const renkPalet: Record<string, { bg: string; border: string; text: string }> = {
        "Aktif Poliçe":    { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "rgb(110,231,183)" },
        "Teklif Bekliyor": { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)" },
    };
    const r = renkPalet[durum] ?? { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "rgba(255,255,255,0.6)" };
    return (
        <span
            className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md"
            style={{ background: r.bg, border: `1px solid ${r.border}`, color: r.text }}
        >
            {durum}
        </span>
    );
}

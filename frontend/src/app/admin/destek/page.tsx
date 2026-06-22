"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    IconSearch,
    IconRefresh,
    IconMessage,
    IconClock,
    IconCheck,
    IconLock,
    IconAlertCircle,
    IconUser,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Talep {
    id: number;
    konu: string;
    ilkMesaj: string;
    durum: string;
    createdAt: string;
    sonYanitTarihi?: string | null;
    mesajSayisi: number;
    musteri?: { id: number; adi: string; soyadi: string; email: string } | null;
}

type Sekme = "tumu" | "acik" | "yanitlandi" | "kapali";

const SEKMELER: { key: Sekme; etiket: string; durum: string | null }[] = [
    { key: "tumu", etiket: "Tümü", durum: null },
    { key: "acik", etiket: "Açık", durum: "Acik" },
    { key: "yanitlandi", etiket: "Yanıtlandı", durum: "Yanitlandi" },
    { key: "kapali", etiket: "Kapalı", durum: "Kapali" },
];

function tarihFormat(d: Date) {
    return d.toLocaleString("tr-TR", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

export default function AdminDestekPage() {
    const [talepler, setTalepler] = useState<Talep[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");
    const [arama, setArama] = useState("");
    const [sekme, setSekme] = useState<Sekme>("acik");

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Support/admin/talepler`, { credentials: "include" });
            if (!r.ok) throw new Error();
            const data = await r.json();
            setTalepler(Array.isArray(data) ? data : []);
        } catch {
            setHata("Liste yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => { cek(); }, []);

    const filtreli = useMemo(() => {
        const aktif = SEKMELER.find((s) => s.key === sekme);
        let liste = talepler;
        if (aktif?.durum) liste = liste.filter((t) => t.durum === aktif.durum);
        if (arama.trim()) {
            const q = arama.toLowerCase();
            liste = liste.filter((t) =>
                t.konu.toLowerCase().includes(q) ||
                t.ilkMesaj.toLowerCase().includes(q) ||
                (t.musteri ? `${t.musteri.adi} ${t.musteri.soyadi}`.toLowerCase().includes(q) : false) ||
                (t.musteri?.email.toLowerCase().includes(q) ?? false)
            );
        }
        return liste;
    }, [talepler, sekme, arama]);

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }} />
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
                            Destek Talepleri<span style={{ color: "#cbd5e1" }}>.</span>
                        </h1>
                        <p className="text-white/45 text-sm mt-1">
                            Müşterilerden gelen talepleri görüntüleyin ve yanıtlayın.
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

                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                    {SEKMELER.map((s) => {
                        const aktif = s.key === sekme;
                        const sayi = s.durum == null
                            ? talepler.length
                            : talepler.filter((t) => t.durum === s.durum).length;
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

                <div className="relative mb-4">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                    <input
                        type="text"
                        value={arama}
                        onChange={(e) => setArama(e.target.value)}
                        placeholder="Konu, mesaj, müşteri adı veya email..."
                        className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#ffffff",
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2.5">
                    {filtreli.length === 0 ? (
                        <div className="rounded-2xl p-12 text-center"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed rgba(255,255,255,0.08)",
                            }}
                        >
                            <p className="text-white/45 text-[13px]">Filtrelere uyan talep bulunamadı.</p>
                        </div>
                    ) : (
                        filtreli.map((t) => <TalepKart key={t.id} talep={t} />)
                    )}
                </div>
            </div>
        </div>
    );
}

function TalepKart({ talep }: { talep: Talep }) {
    return (
        <Link href={`/admin/destek/${talep.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                className="rounded-2xl p-5 cursor-pointer transition-colors hover:bg-white/[0.02]"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white text-[15px] font-semibold">{talep.konu}</h3>
                            <DurumRozeti durum={talep.durum} />
                            <span className="text-white/35 text-[11px] font-mono">
                                DTK-{String(talep.id).padStart(6, "0")}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11.5px] text-white/55 flex-wrap">
                            {talep.musteri && (
                                <>
                                    <span className="inline-flex items-center gap-1 font-medium">
                                        <IconUser className="w-3 h-3" />
                                        {talep.musteri.adi} {talep.musteri.soyadi}
                                    </span>
                                    <span className="text-white/30">·</span>
                                    <span className="text-white/40">{talep.musteri.email}</span>
                                    <span className="text-white/30">·</span>
                                </>
                            )}
                            <span>Açılış: {tarihFormat(new Date(talep.createdAt))}</span>
                            <span className="text-white/30">·</span>
                            <span className="inline-flex items-center gap-1">
                                <IconMessage className="w-3 h-3" />
                                {talep.mesajSayisi}
                            </span>
                        </div>
                    </div>
                </div>
                <p className="text-white/65 text-[12.5px] leading-relaxed line-clamp-2">
                    {talep.ilkMesaj}
                </p>
            </motion.div>
        </Link>
    );
}

function DurumRozeti({ durum }: { durum: string }) {
    const palet: Record<string, { bg: string; border: string; text: string; Icon: React.ElementType; etiket: string }> = {
        "Acik": { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)", Icon: IconClock, etiket: "Açık" },
        "Yanitlandi": { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "rgb(147,197,253)", Icon: IconCheck, etiket: "Yanıtlandı" },
        "Kapali": { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", text: "rgb(203,213,225)", Icon: IconLock, etiket: "Kapalı" },
    };
    const r = palet[durum] ?? palet["Acik"];
    const Icon = r.Icon;
    return (
        <span
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
            style={{ background: r.bg, border: `1px solid ${r.border}`, color: r.text }}
        >
            <Icon className="w-3 h-3" />
            {r.etiket}
        </span>
    );
}

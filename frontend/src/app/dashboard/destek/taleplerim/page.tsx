"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    IconArrowLeft,
    IconInbox,
    IconMessage,
    IconClock,
    IconCheck,
    IconLock,
    IconAlertCircle,
    IconPlus,
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

export default function TaleplerimPage() {
    const [talepler, setTalepler] = useState<Talep[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");
    const [sekme, setSekme] = useState<Sekme>("tumu");

    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Support/taleplerim`, { credentials: "include" });
                if (r.status === 401) { window.location.href = "/"; return; }
                if (!r.ok) throw new Error();
                const data = await r.json();
                setTalepler(Array.isArray(data) ? data : []);
            } catch {
                setHata("Talepler yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, []);

    const filtreli = useMemo(() => {
        const aktif = SEKMELER.find((s) => s.key === sekme);
        if (!aktif?.durum) return talepler;
        return talepler.filter((t) => t.durum === aktif.durum);
    }, [talepler, sekme]);

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
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-end justify-between flex-wrap gap-4"
                >
                    <div>
                        <Link
                            href="/dashboard/destek"
                            className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-3"
                        >
                            <IconArrowLeft className="w-4 h-4" />
                            Destek
                        </Link>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                            Taleplerim<span style={{ color: "#cbd5e1" }}>.</span>
                        </h1>
                        <p className="text-white/45 text-sm mt-1">
                            Açtığınız destek taleplerini ve ekibimizin yanıtlarını buradan takip edin.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/destek"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                        style={{
                            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                            color: "#0f172a",
                            border: "1px solid rgba(226,232,240,0.5)",
                        }}
                    >
                        <IconPlus className="w-4 h-4" />
                        Yeni Talep
                    </Link>
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
                                        ? "linear-gradient(135deg, rgba(226,232,240,0.1), rgba(148,163,184,0.04))"
                                        : "rgba(255,255,255,0.02)",
                                    border: aktif
                                        ? "1px solid rgba(226,232,240,0.25)"
                                        : "1px solid rgba(255,255,255,0.06)",
                                    color: aktif ? "#ffffff" : "rgba(255,255,255,0.55)",
                                }}
                            >
                                {s.etiket}
                                <span
                                    className="text-[10px] tabular-nums px-1.5 rounded"
                                    style={{
                                        background: aktif ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                                        color: aktif ? "rgb(226,232,240)" : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {sayi}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-2.5">
                    {filtreli.length === 0 ? (
                        <div className="rounded-2xl p-12 text-center"
                            style={{
                                background: "rgba(255,255,255,0.02)",
                                border: "1px dashed rgba(255,255,255,0.08)",
                            }}
                        >
                            <IconInbox className="w-8 h-8 mx-auto mb-3 text-white/30" />
                            <p className="text-white/55 text-[13px] mb-3">
                                {sekme === "tumu"
                                    ? "Henüz hiç destek talebiniz yok."
                                    : "Bu durumda talep bulunmuyor."}
                            </p>
                            {sekme === "tumu" && (
                                <Link
                                    href="/dashboard/destek"
                                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
                                    style={{ color: "#cbd5e1" }}
                                >
                                    <IconPlus className="w-3.5 h-3.5" />
                                    İlk talebinizi oluşturun
                                </Link>
                            )}
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
        <Link href={`/dashboard/destek/taleplerim/${talep.id}`}>
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
                            <span>Açılış: {tarihFormat(new Date(talep.createdAt))}</span>
                            {talep.sonYanitTarihi && (
                                <>
                                    <span className="text-white/30">·</span>
                                    <span>Son yanıt: {tarihFormat(new Date(talep.sonYanitTarihi))}</span>
                                </>
                            )}
                            <span className="text-white/30">·</span>
                            <span className="inline-flex items-center gap-1">
                                <IconMessage className="w-3 h-3" />
                                {talep.mesajSayisi} mesaj
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

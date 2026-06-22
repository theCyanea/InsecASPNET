"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    IconArrowLeft,
    IconMessage,
    IconClock,
    IconCheck,
    IconLock,
    IconAlertCircle,
    IconUser,
    IconShieldCheck,
    IconSend,
    IconHash,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Mesaj {
    id: number;
    gonderen: string;
    mesaj: string;
    createdAt: string;
}

interface TalepDetay {
    id: number;
    konu: string;
    ilkMesaj: string;
    durum: string;
    createdAt: string;
    sonYanitTarihi?: string | null;
    musteri?: { id: number; adi: string; soyadi: string; email: string } | null;
    messages: Mesaj[];
}

function tarihSaatFormat(d: Date) {
    return d.toLocaleString("tr-TR", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

export default function TalepDetayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [talep, setTalep] = useState<TalepDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    const [yeniMesaj, setYeniMesaj] = useState("");
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [gonderHata, setGonderHata] = useState("");

    const sonMesajRef = useRef<HTMLDivElement | null>(null);

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Support/talep/${id}`, { credentials: "include" });
            if (r.status === 401) { window.location.href = "/"; return; }
            if (r.status === 404) { setHata("Talep bulunamadı."); return; }
            if (!r.ok) throw new Error();
            const data = await r.json();
            setTalep(data);
        } catch {
            setHata("Talep yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => {
        cek();
    }, [id]);

    useEffect(() => {
        if (talep && sonMesajRef.current) {
            sonMesajRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [talep]);

    const gonder = async () => {
        const trimmed = yeniMesaj.trim();
        if (trimmed.length < 2) {
            setGonderHata("Mesaj çok kısa.");
            return;
        }
        setGonderiliyor(true);
        setGonderHata("");
        try {
            const r = await fetch(`${API}/Support/talep/${id}/mesaj-ekle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ mesaj: trimmed }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setGonderHata(txt || "Gönderilemedi.");
                return;
            }
            setYeniMesaj("");
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

    if (hata || !talep) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href="/dashboard/destek/taleplerim"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Taleplerim
                    </Link>
                    <div className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(239,68,68,0.05)",
                            border: "1px solid rgba(239,68,68,0.2)",
                        }}
                    >
                        <IconAlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <p className="text-white text-base font-semibold">{hata || "Bir şeyler ters gitti."}</p>
                    </div>
                </div>
            </div>
        );
    }

    const kapali = talep.durum === "Kapali";

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5"
                >
                    <Link
                        href="/dashboard/destek/taleplerim"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Taleplerim
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl px-6 lg:px-8 py-6 mb-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">
                            {talep.konu}
                        </h1>
                        <DurumRozeti durum={talep.durum} />
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-white/45 flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                            <IconHash className="w-3.5 h-3.5" />
                            DTK-{String(talep.id).padStart(6, "0")}
                        </span>
                        <span className="text-white/30">·</span>
                        <span>Açılış: {tarihSaatFormat(new Date(talep.createdAt))}</span>
                        {talep.sonYanitTarihi && (
                            <>
                                <span className="text-white/30">·</span>
                                <span>Son yanıt: {tarihSaatFormat(new Date(talep.sonYanitTarihi))}</span>
                            </>
                        )}
                    </div>
                </motion.div>

                <div className="flex flex-col gap-3 mb-5">
                    {talep.messages.map((m) => (
                        <MesajBalonu key={m.id} mesaj={m} />
                    ))}
                    <div ref={sonMesajRef} />
                </div>

                {!kapali ? (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <label className="block text-white/65 text-[11.5px] font-medium mb-2 uppercase tracking-wider">
                            Yeni Mesaj
                        </label>
                        <textarea
                            value={yeniMesaj}
                            onChange={(e) => setYeniMesaj(e.target.value)}
                            placeholder="Ek bilgi vermek veya tekrar yazmak için..."
                            rows={4}
                            maxLength={2000}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y disabled:opacity-50"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                        {gonderHata && (
                            <div className="mt-2 rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
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
                        <div className="flex items-center justify-between mt-3 gap-3">
                            <p className="text-white/30 text-[11px] tabular-nums">{yeniMesaj.length} / 2000</p>
                            <button
                                type="button"
                                onClick={gonder}
                                disabled={gonderiliyor || yeniMesaj.trim().length < 2}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                    color: "#0f172a",
                                    border: "1px solid rgba(226,232,240,0.5)",
                                }}
                            >
                                {gonderiliyor ? (
                                    <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                        style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                                ) : <IconSend className="w-4 h-4" />}
                                Gönder
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="rounded-2xl p-5 text-center"
                        style={{
                            background: "rgba(148,163,184,0.05)",
                            border: "1px solid rgba(148,163,184,0.15)",
                        }}
                    >
                        <IconLock className="w-6 h-6 mx-auto mb-2 text-white/40" />
                        <p className="text-white/55 text-[13px]">
                            Bu talep kapatılmıştır. Yeni bir konu için yeni talep oluşturabilirsiniz.
                        </p>
                        <Link
                            href="/dashboard/destek"
                            className="inline-block mt-3 text-[12.5px] font-semibold"
                            style={{ color: "#cbd5e1" }}
                        >
                            Yeni Talep Oluştur →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function MesajBalonu({ mesaj }: { mesaj: Mesaj }) {
    const admin = mesaj.gonderen === "Admin";
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${admin ? "flex-row" : "flex-row-reverse"}`}
        >
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: admin
                        ? "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(37,99,235,0.08))"
                        : "rgba(255,255,255,0.04)",
                    border: admin
                        ? "1px solid rgba(59,130,246,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                }}
            >
                {admin
                    ? <IconShieldCheck className="w-4 h-4" style={{ color: "rgb(147,197,253)" }} />
                    : <IconUser className="w-4 h-4 text-white/55" />}
            </div>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3`}
                style={{
                    background: admin
                        ? "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.02))"
                        : "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                    border: admin
                        ? "1px solid rgba(59,130,246,0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span
                        className="text-[10px] uppercase tracking-wider font-bold"
                        style={{ color: admin ? "rgb(147,197,253)" : "rgba(255,255,255,0.55)" }}
                    >
                        {admin ? "Destek Ekibi" : "Siz"}
                    </span>
                    <span className="text-white/30 text-[10.5px]">
                        {tarihSaatFormat(new Date(mesaj.createdAt))}
                    </span>
                </div>
                <p className="text-white/85 text-[13px] leading-relaxed whitespace-pre-wrap">
                    {mesaj.mesaj}
                </p>
            </div>
        </motion.div>
    );
}

function DurumRozeti({ durum }: { durum: string }) {
    const palet: Record<string, { bg: string; border: string; text: string; Icon: React.ElementType; etiket: string }> = {
        "Acik": { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "rgb(252,211,77)", Icon: IconClock, etiket: "Açık" },
        "Yanitlandi": { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "rgb(147,197,253)", Icon: IconMessage, etiket: "Yanıtlandı" },
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


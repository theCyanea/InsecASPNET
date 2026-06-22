"use client";

import { useEffect, useRef, useState, use } from "react";
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
    IconMail,
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

export default function AdminTalepDetayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const [talep, setTalep] = useState<TalepDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    const [yanit, setYanit] = useState("");
    const [kapat, setKapat] = useState(false);
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [gonderHata, setGonderHata] = useState("");
    const [basari, setBasari] = useState("");

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
        const trimmed = yanit.trim();
        if (trimmed.length < 5) {
            setGonderHata("Yanıt en az 5 karakter olmalıdır.");
            return;
        }
        setGonderiliyor(true);
        setGonderHata("");
        setBasari("");
        try {
            const r = await fetch(`${API}/Support/admin/talep/${id}/yanitla`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ mesaj: trimmed, talebiKapat: kapat }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setGonderHata(txt || "Gönderilemedi.");
                return;
            }
            setYanit("");
            setKapat(false);
            setBasari("Yanıt müşteriye e-posta ve bildirim olarak iletildi.");
            await cek();
        } catch {
            setGonderHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    const durumDegistir = async (yeniDurum: string) => {
        try {
            const r = await fetch(`${API}/Support/admin/talep/${id}/durum`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ durum: yeniDurum }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setGonderHata(txt || "Durum güncellenemedi.");
                return;
            }
            await cek();
        } catch {
            setGonderHata("Bağlantı hatası.");
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
                        href="/admin/destek"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Destek Talepleri
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
                        href="/admin/destek"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Destek Talepleri
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

                    {talep.musteri && (
                        <div className="mt-4 pt-4 border-t flex items-center justify-between flex-wrap gap-3"
                            style={{ borderColor: "rgba(255,255,255,0.06)" }}
                        >
                            <div>
                                <p className="text-white/45 text-[10.5px] uppercase tracking-wider font-medium mb-1">
                                    Talep Sahibi
                                </p>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-white text-[13.5px] font-medium inline-flex items-center gap-1.5">
                                        <IconUser className="w-3.5 h-3.5 text-white/45" />
                                        {talep.musteri.adi} {talep.musteri.soyadi}
                                    </span>
                                    <a
                                        href={`mailto:${talep.musteri.email}`}
                                        className="text-white/55 text-[12px] hover:text-white/85 inline-flex items-center gap-1.5"
                                    >
                                        <IconMail className="w-3.5 h-3.5" />
                                        {talep.musteri.email}
                                    </a>
                                </div>
                            </div>
                            {!kapali && (
                                <button
                                    type="button"
                                    onClick={() => durumDegistir("Kapali")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.02]"
                                    style={{
                                        background: "rgba(148,163,184,0.08)",
                                        border: "1px solid rgba(148,163,184,0.25)",
                                        color: "rgb(203,213,225)",
                                    }}
                                >
                                    <IconLock className="w-3.5 h-3.5" />
                                    Talebi Kapat
                                </button>
                            )}
                            {kapali && (
                                <button
                                    type="button"
                                    onClick={() => durumDegistir("Acik")}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.02]"
                                    style={{
                                        background: "rgba(245,158,11,0.08)",
                                        border: "1px solid rgba(245,158,11,0.25)",
                                        color: "rgb(252,211,77)",
                                    }}
                                >
                                    <IconClock className="w-3.5 h-3.5" />
                                    Tekrar Aç
                                </button>
                            )}
                        </div>
                    )}
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
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <IconShieldCheck className="w-4 h-4" style={{ color: "rgb(252,211,77)" }} />
                            <h2 className="text-white text-sm font-semibold">Yanıtla</h2>
                            <span className="text-white/45 text-[11px]">
                                Yanıtın müşteriye e-posta ve bildirim olarak iletilecek.
                            </span>
                        </div>
                        <textarea
                            value={yanit}
                            onChange={(e) => setYanit(e.target.value)}
                            placeholder="Müşteriye iletmek istediğiniz yanıtı yazın..."
                            rows={6}
                            maxLength={4000}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y disabled:opacity-50"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />

                        {gonderHata && (
                            <div className="mt-3 rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
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

                        {basari && (
                            <div className="mt-3 rounded-xl px-3 py-2 text-[12px] flex items-start gap-2"
                                style={{
                                    background: "rgba(16,185,129,0.08)",
                                    border: "1px solid rgba(16,185,129,0.25)",
                                    color: "rgb(110,231,183)",
                                }}
                            >
                                <IconCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                {basari}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                            <label className="inline-flex items-center gap-2 text-[12.5px] text-white/65 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={kapat}
                                    onChange={(e) => setKapat(e.target.checked)}
                                    className="w-4 h-4 accent-amber-400"
                                />
                                Yanıttan sonra talebi kapat
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-white/30 text-[11px] tabular-nums">{yanit.length} / 4000</span>
                                <button
                                    type="button"
                                    onClick={gonder}
                                    disabled={gonderiliyor || yanit.trim().length < 5}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                                        color: "#0f172a",
                                        border: "1px solid rgba(251,191,36,0.5)",
                                    }}
                                >
                                    {gonderiliyor ? (
                                        <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                            style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                                    ) : <IconSend className="w-4 h-4" />}
                                    Yanıtı Gönder
                                </button>
                            </div>
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
                            Bu talep kapatılmıştır. Tekrar yanıt vermek için yukarıdaki &quot;Tekrar Aç&quot; butonunu kullanın.
                        </p>
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
            className={`flex gap-3 ${admin ? "flex-row-reverse" : "flex-row"}`}
        >
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                    background: admin
                        ? "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.08))"
                        : "rgba(255,255,255,0.04)",
                    border: admin
                        ? "1px solid rgba(245,158,11,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                }}
            >
                {admin
                    ? <IconShieldCheck className="w-4 h-4" style={{ color: "rgb(252,211,77)" }} />
                    : <IconUser className="w-4 h-4 text-white/55" />}
            </div>
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3`}
                style={{
                    background: admin
                        ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.02))"
                        : "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                    border: admin
                        ? "1px solid rgba(245,158,11,0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span
                        className="text-[10px] uppercase tracking-wider font-bold"
                        style={{ color: admin ? "rgb(252,211,77)" : "rgba(255,255,255,0.55)" }}
                    >
                        {admin ? "Destek Ekibi (Siz)" : "Müşteri"}
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

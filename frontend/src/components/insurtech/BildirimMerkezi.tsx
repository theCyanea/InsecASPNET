"use client";

// ─── BildirimMerkezi — Bell icon + dropdown panel ────────────────────────────
// Sidebar'ın üst tarafında konumlanır. Kullanıcının okunmamış bildirim sayısını
// badge ile gösterir; tıklandığında dropdown panel açılır.
//
// Akış:
//   - Mount + her 30 saniyede polling → /api/Notifications/bildirimlerim
//   - Bell tıkla → dropdown aç
//   - Dropdown dışına tıkla / ESC → kapat
//   - Bildirim satırına tıkla → /Notifications/{id}/okundu çağır + LinkUrl'e git
//   - "Hepsini okundu işaretle" → /Notifications/hepsini-okundu çağır
//   - X butonu satırda → /Notifications/{id} DELETE
//
// Polling: 30sn, browser tab background'a alındığında durdurmuyoruz (basit).
// Production'da WebSocket veya Server-Sent Events tercih edilir.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
    IconBell,
    IconBellOff,
    IconCheck,
    IconX,
    IconExternalLink,
    IconPackage,
    IconShieldCheck,
    IconAlertTriangle,
    IconCash,
    IconInfoCircle,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";
const POLL_INTERVAL_MS = 30_000;

interface Bildirim {
    id: number;
    tip: string;
    baslik: string;
    mesaj: string;
    okundu: boolean;
    linkUrl?: string | null;
    iconKey?: string | null;
    createdAt: string;
}

interface BildirimYanit {
    bildirimler: Bildirim[];
    okunmamisSayi: number;
}

// Backend iconKey → frontend icon mapping
const IKON_HARITASI: Record<string, React.ElementType> = {
    "package": IconPackage,
    "shield-check": IconShieldCheck,
    "alert-triangle": IconAlertTriangle,
    "check": IconCheck,
    "x": IconX,
    "cash": IconCash,
    "info": IconInfoCircle,
};

function ikonSec(iconKey?: string | null): React.ElementType {
    if (!iconKey) return IconInfoCircle;
    return IKON_HARITASI[iconKey] ?? IconInfoCircle;
}

// Backend UTC döner ama 'Z' suffix'i olmayabilir.
// 'Z' olmadan new Date() string'i yerel saat (UTC+3) olarak parse eder → 3 saat hata.
function parseUtcTarih(dateStr: string): Date {
    if (!dateStr.endsWith("Z") && !dateStr.includes("+") && !dateStr.includes("-", 10)) {
        return new Date(dateStr + "Z");
    }
    return new Date(dateStr);
}

function gecenZaman(tarih: Date): string {
    const fark = Date.now() - tarih.getTime();
    const dakika = Math.floor(fark / 60_000);
    const saat = Math.floor(fark / 3_600_000);
    const gun = Math.floor(fark / 86_400_000);

    if (dakika < 1) return "şimdi";
    if (dakika < 60) return `${dakika} dk önce`;
    if (saat < 24) return `${saat} saat önce`;
    if (gun < 7) return `${gun} gün önce`;
    return tarih.toLocaleDateString("tr-TR", { day: "2-digit", month: "long" });
}

export function BildirimMerkezi({ open: sidebarOpen }: { open: boolean }) {
    const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
    const [okunmamisSayi, setOkunmamisSayi] = useState(0);
    const [acik, setAcik] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Trigger'ın viewport'taki konumu — dropdown'u portal ile body'e render
    // ettiğimiz için sidebar overflow'undan etkilenmiyor.
    const [triggerPos, setTriggerPos] = useState<{ top: number; left: number; height: number } | null>(null);
    // SSR'da window/document yok — Portal mount sonrası açılsın
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const aciklik = () => {
        if (!acik && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setTriggerPos({ top: r.top, left: r.right, height: r.height });
        }
        setAcik(!acik);
    };

    // ─── Bildirimleri çek ────────────────────────────────────────────────────
    const cek = async () => {
        try {
            const r = await fetch(`${API}/Notifications/bildirimlerim`, {
                credentials: "include",
            });
            if (!r.ok) return;
            const data: BildirimYanit = await r.json();
            setBildirimler(data.bildirimler ?? []);
            setOkunmamisSayi(data.okunmamisSayi ?? 0);
        } catch {
            // Sessiz fail — polling sürekli, geçici hatalarda bildirme zorunda değiliz
        }
    };

    // Mount + polling
    useEffect(() => {
        cek();
        const interval = setInterval(cek, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    // Dropdown dış tıklama / ESC ile kapama
    useEffect(() => {
        if (!acik) return;
        const tikla = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setAcik(false);
            }
        };
        const tus = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAcik(false);
        };
        document.addEventListener("mousedown", tikla);
        document.addEventListener("keydown", tus);
        return () => {
            document.removeEventListener("mousedown", tikla);
            document.removeEventListener("keydown", tus);
        };
    }, [acik]);

    // Bildirime tıkla → okundu işaretle + link'e git
    const tiklandi = async (b: Bildirim) => {
        // Optimistic update — UI hemen tepki versin
        if (!b.okundu) {
            setBildirimler((prev) =>
                prev.map((x) => (x.id === b.id ? { ...x, okundu: true } : x))
            );
            setOkunmamisSayi((s) => Math.max(0, s - 1));
            // Background'da gerçek istek
            fetch(`${API}/Notifications/${b.id}/okundu`, {
                method: "PUT",
                credentials: "include",
            }).catch(() => { /* sessiz */ });
        }
        setAcik(false);
        if (b.linkUrl) {
            // Next.js client-side nav yerine basit pushState — Link component
            // hierarchy'sinden bağımsız olduğumuz için window.location yeterli
            window.location.href = b.linkUrl;
        }
    };

    const hepsiniOkundu = async () => {
        // Optimistic update
        setBildirimler((prev) => prev.map((x) => ({ ...x, okundu: true })));
        setOkunmamisSayi(0);
        try {
            await fetch(`${API}/Notifications/hepsini-okundu`, {
                method: "PUT",
                credentials: "include",
            });
        } catch { /* sessiz */ }
    };

    const sil = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();   // satır click'ini tetikleme
        // Optimistic remove
        const silinen = bildirimler.find((b) => b.id === id);
        setBildirimler((prev) => prev.filter((b) => b.id !== id));
        if (silinen && !silinen.okundu) setOkunmamisSayi((s) => Math.max(0, s - 1));
        try {
            await fetch(`${API}/Notifications/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
        } catch { /* sessiz */ }
    };

    const varMi = bildirimler.length > 0;

    return (
        <div className="relative">
            {/* ── Trigger: Bell icon + badge ─────────────────────────────────── */}
            <button
                ref={triggerRef}
                type="button"
                onClick={aciklik}
                className="relative flex items-center gap-3 w-full py-2.5 rounded-xl px-2 group/bell transition-colors hover:bg-white/[0.04]"
            >
                <div className="relative flex-shrink-0">
                    <IconBell
                        className="w-5 h-5 transition-colors duration-150"
                        style={{ color: acik ? "white" : "rgba(255,255,255,0.45)" }}
                    />
                    {/* Badge — okunmamış sayısı */}
                    {okunmamisSayi > 0 && (
                        <span
                            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold tabular-nums px-1"
                            style={{
                                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                color: "#ffffff",
                                border: "1.5px solid #020610",
                                boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
                            }}
                        >
                            {okunmamisSayi > 99 ? "99+" : okunmamisSayi}
                        </span>
                    )}
                </div>
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                            className="text-sm font-medium whitespace-nowrap text-white/45 group-hover/bell:text-white/85 flex-1 text-left"
                        >
                            Bildirimler
                            {okunmamisSayi > 0 && (
                                <span className="ml-1.5 text-[11px] text-red-300 tabular-nums">
                                    ({okunmamisSayi})
                                </span>
                            )}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* ── Dropdown panel ──────────────────────────────────────────────── */}
            {/* Dropdown — React Portal ile body'e render ediyoruz.
                Sebep: sidebar overflow:hidden olduğu için dropdown sidebar
                içinde kırpılırdı. Body seviyesinde + position:fixed ile
                trigger pozisyonuna göre konumlandırıyoruz. */}
            {mounted && createPortal(
                <AnimatePresence>
                    {acik && triggerPos && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.18 }}
                            className="rounded-2xl overflow-hidden"
                            style={{
                                position: "fixed",
                                left: triggerPos.left + 8,
                                top: triggerPos.top,
                                width: 380,
                                maxHeight: `calc(100vh - ${triggerPos.top + 16}px)`,
                                zIndex: 9999,
                                background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,16,0.98))",
                                border: "1px solid rgba(255,255,255,0.08)",
                                boxShadow: "0 25px 60px -10px rgba(0,0,0,0.7)",
                                backdropFilter: "blur(20px)",
                            }}
                        >
                            {/* Header */}
                            <div
                                className="px-4 py-3 flex items-center justify-between"
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                            >
                                <div>
                                    <p className="text-white text-sm font-semibold">Bildirimler</p>
                                    <p className="text-white/40 text-[11px]">
                                        {okunmamisSayi > 0
                                            ? `${okunmamisSayi} okunmamış`
                                            : "Hepsi okundu"}
                                    </p>
                                </div>
                                {okunmamisSayi > 0 && (
                                    <button
                                        type="button"
                                        onClick={hepsiniOkundu}
                                        className="text-[11px] text-white/55 hover:text-white/90 transition-colors"
                                    >
                                        Hepsini okundu işaretle
                                    </button>
                                )}
                            </div>

                            {/* Liste */}
                            <div className="max-h-[480px] overflow-y-auto">
                                {!varMi && (
                                    <div className="px-5 py-10 text-center">
                                        <IconBellOff className="w-8 h-8 mx-auto mb-2 text-white/20" />
                                        <p className="text-white/45 text-[12.5px]">
                                            Henüz bildiriminiz yok.
                                        </p>
                                        <p className="text-white/25 text-[10.5px] mt-1">
                                            Yeni teklif veya hasar işlemleriniz olduğunda burada görünür.
                                        </p>
                                    </div>
                                )}

                                {/* Liste satırı: <div role="button"> kullanıyoruz çünkü
                                    içeriğindeki sil butonu nested <button> hatası verir.
                                    role + tabIndex + onKeyDown ile a11y uyumlu kalıyor. */}
                                {bildirimler.map((b) => {
                                    const Icon = ikonSec(b.iconKey);
                                    return (
                                        <div
                                            key={b.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => tiklandi(b)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    tiklandi(b);
                                                }
                                            }}
                                            className="group/row w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-white/[0.03] cursor-pointer focus:outline-none focus:bg-white/[0.04]"
                                            style={{
                                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                                                background: !b.okundu
                                                    ? "rgba(226,232,240,0.025)"
                                                    : "transparent",
                                            }}
                                        >
                                            <div className="relative flex-shrink-0 mt-0.5">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                    style={{
                                                        background: !b.okundu
                                                            ? "rgba(226,232,240,0.08)"
                                                            : "rgba(255,255,255,0.04)",
                                                        border: !b.okundu
                                                            ? "1px solid rgba(226,232,240,0.18)"
                                                            : "1px solid rgba(255,255,255,0.06)",
                                                    }}
                                                >
                                                    <Icon
                                                        className="w-4 h-4"
                                                        style={{
                                                            color: !b.okundu ? "#cbd5e1" : "rgba(255,255,255,0.4)",
                                                        }}
                                                    />
                                                </div>
                                                {!b.okundu && (
                                                    <span
                                                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                                                        style={{
                                                            background: "#3b82f6",
                                                            boxShadow: "0 0 4px rgba(59,130,246,0.6)",
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-[13px] truncate"
                                                    style={{
                                                        color: !b.okundu ? "#ffffff" : "rgba(255,255,255,0.7)",
                                                        fontWeight: !b.okundu ? 600 : 400,
                                                    }}
                                                >
                                                    {b.baslik}
                                                </p>
                                                <p className="text-white/45 text-[11.5px] mt-0.5 line-clamp-2 leading-snug">
                                                    {b.mesaj}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-white/30 text-[10.5px]">
                                                        {gecenZaman(parseUtcTarih(b.createdAt))}
                                                    </span>
                                                    {b.linkUrl && (
                                                        <span className="text-white/25 text-[10px] inline-flex items-center gap-0.5">
                                                            <IconExternalLink className="w-2.5 h-2.5" />
                                                            Görüntüle
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => sil(e, b.id)}
                                                className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-white/[0.06]"
                                                title="Bildirimi sil"
                                            >
                                                <IconX className="w-3 h-3 text-white/45" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {varMi && (
                                <div
                                    className="px-4 py-2 text-center"
                                    style={{
                                        borderTop: "1px solid rgba(255,255,255,0.06)",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <p className="text-white/35 text-[10.5px]">
                                        Son {bildirimler.length} bildirim gösteriliyor
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

"use client";

// ─── FotografLightbox — Tam ekran fotoğraf görüntüleyici ─────────────────────
// Hasar detay sayfasındaki fotoğrafa tıklanınca yeni sekme yerine sayfanın
// kendisinde tam ekran modal açılır. Backdrop kararır + blur olur, fotoğraf
// büyük gösterilir.
//
// Özellikler:
//   - Backdrop tıkla / X butonu / ESC ile kapanma
//   - Çoklu fotoğraf varsa prev/next butonları (← →)
//   - Klavye navigation (← → tuşları)
//   - Counter (3/7 gibi)
//   - Loading spinner (ağ üzerinden gelen büyük dosya için)
//   - object-contain — fotoğrafın oranı korunur, kırpma yok
//   - body scroll-lock (modal açıkken arkadaki sayfa kaydırılamaz)
//
// Reusable: hasar dışında ileride poliçe belgeleri, profil fotoğrafı vs.
// için de kullanılabilir.

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconLoader2,
    IconExternalLink,
} from "@tabler/icons-react";

interface Props {
    // Fotoğraf URL listesi (tam URL — host prefix'li olmalı)
    fotograflar: string[];
    // Modal açık mı?
    acik: boolean;
    // Hangi fotoğraftan başlayalım
    baslangicIndex: number;
    // Kapatma callback'i
    onKapat: () => void;
}

export function FotografLightbox({ fotograflar, acik, baslangicIndex, onKapat }: Props) {
    const [aktifIndex, setAktifIndex] = useState(baslangicIndex);
    const [yukleniyor, setYukleniyor] = useState(true);

    // Modal açıldığında baslangicIndex değişebilir — sync et
    useEffect(() => {
        if (acik) {
            setAktifIndex(baslangicIndex);
            setYukleniyor(true);
        }
    }, [acik, baslangicIndex]);

    // Önceki / sonraki — wraparound (sona gelince başa, başa gelince sona)
    const oncekine = useCallback(() => {
        setYukleniyor(true);
        setAktifIndex((i) => (i - 1 + fotograflar.length) % fotograflar.length);
    }, [fotograflar.length]);

    const sonrakine = useCallback(() => {
        setYukleniyor(true);
        setAktifIndex((i) => (i + 1) % fotograflar.length);
    }, [fotograflar.length]);

    // ─── Klavye navigation ──────────────────────────────────────────────────
    // ESC kapatır, ← → fotoğrafları geçer.
    // Modal açıkken event listener ekleniyor; kapanınca temizleniyor (cleanup).
    useEffect(() => {
        if (!acik) return;

        const tusBasildi = (e: KeyboardEvent) => {
            if (e.key === "Escape") onKapat();
            else if (e.key === "ArrowLeft" && fotograflar.length > 1) oncekine();
            else if (e.key === "ArrowRight" && fotograflar.length > 1) sonrakine();
        };

        window.addEventListener("keydown", tusBasildi);
        return () => window.removeEventListener("keydown", tusBasildi);
    }, [acik, oncekine, sonrakine, onKapat, fotograflar.length]);

    // ─── Body scroll lock ───────────────────────────────────────────────────
    // Modal açıkken arkadaki sayfanın kaydırılması iyi UX değil — kullanıcı
    // yanlışlıkla kaydırırsa fotoğraf değişmez ama arka plan kayar = kafa karışır.
    useEffect(() => {
        if (!acik) return;
        const eskiOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = eskiOverflow;
        };
    }, [acik]);

    // Erken çıkış — kapalıysa hiçbir şey render etme
    if (!acik || fotograflar.length === 0) {
        return (
            <AnimatePresence>{null}</AnimatePresence>
        );
    }

    const aktifUrl = fotograflar[aktifIndex];
    const cokluFotograf = fotograflar.length > 1;

    return (
        <AnimatePresence>
            {acik && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: "rgba(0,0,0,0.92)",
                        backdropFilter: "blur(16px)",
                    }}
                    onClick={(e) => {
                        // Backdrop'a tıklanınca kapansın; içerikteki tıklamalar burayı tetiklemesin
                        if (e.target === e.currentTarget) onKapat();
                    }}
                >
                    {/* ── Üst sağ — Kapat + Yeni sekme ─────────────────────────── */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        <a
                            href={aktifUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                            }}
                            title="Yeni sekmede aç"
                        >
                            <IconExternalLink className="w-4 h-4 text-white/85" />
                        </a>
                        <button
                            type="button"
                            onClick={onKapat}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                            }}
                            title="Kapat (ESC)"
                        >
                            <IconX className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* ── Üst sol — Sayaç (X / N) ──────────────────────────────── */}
                    {cokluFotograf && (
                        <div
                            className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full text-[12px] font-medium tabular-nums"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                                color: "rgba(255,255,255,0.85)",
                            }}
                        >
                            {aktifIndex + 1} / {fotograflar.length}
                        </div>
                    )}

                    {/* ── Önceki butonu ─────────────────────────────────────────── */}
                    {cokluFotograf && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                oncekine();
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                            }}
                            title="Önceki (←)"
                        >
                            <IconChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* ── Sonraki butonu ────────────────────────────────────────── */}
                    {cokluFotograf && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                sonrakine();
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                backdropFilter: "blur(8px)",
                            }}
                            title="Sonraki (→)"
                        >
                            <IconChevronRight className="w-6 h-6 text-white" />
                        </button>
                    )}

                    {/* ── Ana fotoğraf ──────────────────────────────────────────── */}
                    <motion.div
                        key={aktifIndex}   // index değişince re-mount → fade-in animasyonu
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="relative max-w-[92vw] max-h-[88vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Yükleniyor spinner */}
                        {yukleniyor && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <IconLoader2 className="w-8 h-8 text-white/60 animate-spin" />
                            </div>
                        )}

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={aktifUrl}
                            alt={`Fotoğraf ${aktifIndex + 1}`}
                            onLoad={() => setYukleniyor(false)}
                            onError={() => setYukleniyor(false)}
                            className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl"
                            style={{
                                opacity: yukleniyor ? 0 : 1,
                                transition: "opacity 0.2s",
                                boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
                            }}
                        />
                    </motion.div>

                    {/* ── Alt — klavye ipucu ────────────────────────────────────── */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-white/40 flex items-center gap-3">
                        {cokluFotograf && (
                            <>
                                <span className="inline-flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>←</kbd>
                                    <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>→</kbd>
                                    gezin
                                </span>
                                <span className="text-white/20">·</span>
                            </>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>ESC</kbd>
                            kapat
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

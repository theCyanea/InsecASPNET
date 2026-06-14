"use client";

// ─── FiyatBreakdown — Fiyatın "neden bu kadar" görünümü ─────────────────────
// Backend pricing engine'in ürettiği BreakdownItem listesini görsel olarak gösterir.
// İki kullanım modu:
//   - "sticky"   : sayfanın altına yapışan sade bar (sadece toplam + ufak özet)
//   - "detayli"  : tam kart, her satır listelenir (özet sayfası, detay sayfası)

import { motion } from "motion/react";
import { IconReceipt, IconChevronRight } from "@tabler/icons-react";
import { PricingResult, BreakdownItem } from "./types";

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─── Detaylı görünüm ─────────────────────────────────────────────────────────
// Özet ekranında ve detay sayfasında kullanılır. Her satır kategori rengiyle
// gruplanır: base/coverage/risk/subtotal/tax.
export function FiyatBreakdownDetayli({
    sonuc,
    yukleniyor,
}: {
    sonuc: PricingResult | null;
    yukleniyor?: boolean;
}) {
    if (yukleniyor && !sonuc) {
        return (
            <div
                className="rounded-2xl p-6 flex items-center justify-center"
                style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    if (!sonuc) return null;

    const kategoriler: Array<{ ad: string; baslik: string; satirlar: BreakdownItem[] }> = [
        { ad: "base", baslik: "Taban Prim", satirlar: sonuc.breakdown.filter((b) => b.category === "base") },
        { ad: "coverage", baslik: "Teminatlar", satirlar: sonuc.breakdown.filter((b) => b.category === "coverage") },
        { ad: "risk", baslik: "Risk Faktörleri", satirlar: sonuc.breakdown.filter((b) => b.category === "risk") },
    ];

    const subtotal = sonuc.breakdown.find((b) => b.category === "subtotal");
    const tax = sonuc.breakdown.find((b) => b.category === "tax");

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl overflow-hidden"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Başlık */}
            <div
                className="px-6 py-4 flex items-center gap-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
                <IconReceipt className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                <p className="text-white text-[13px] font-semibold uppercase tracking-wider">
                    Fiyat Detayı
                </p>
                <span className="ml-auto text-white/35 text-[11px]">
                    Ne için ne ödüyorsunuz
                </span>
            </div>

            {/* Kategori grupları */}
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {kategoriler.map(
                    (kat) =>
                        kat.satirlar.length > 0 && (
                            <div key={kat.ad} className="px-6 py-4">
                                <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium mb-2.5">
                                    {kat.baslik}
                                </p>
                                <div className="flex flex-col gap-1.5">
                                    {kat.satirlar.map((satir, i) => (
                                        <BreakdownSatir key={i} satir={satir} />
                                    ))}
                                </div>
                            </div>
                        )
                )}

                {/* Subtotal */}
                {subtotal && (
                    <div
                        className="px-6 py-3.5 flex items-center justify-between"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                    >
                        <span className="text-white/65 text-[13px] font-medium">{subtotal.label}</span>
                        <span className="text-white tabular-nums font-semibold text-[14px]">
                            {paraFormat(sonuc.riskAdjustedSubtotal)}
                        </span>
                    </div>
                )}

                {/* Tax */}
                {tax && (
                    <div className="px-6 py-2.5 flex items-center justify-between">
                        <span className="text-white/55 text-[12px]">{tax.label}</span>
                        <span className="text-white/85 tabular-nums text-[12px]">+ {paraFormat(sonuc.tax)}</span>
                    </div>
                )}
            </div>

            {/* Toplam */}
            <div
                className="px-6 py-5 flex items-center justify-between"
                style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(135deg, rgba(226,232,240,0.04), rgba(148,163,184,0.02))",
                }}
            >
                <div>
                    <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">
                        Toplam Prim (BSMV Dahil)
                    </p>
                    <p className="text-white text-2xl font-bold tabular-nums mt-0.5">
                        {paraFormat(sonuc.total)}
                    </p>
                </div>
                {sonuc.riskMultiplier !== 1 && (
                    <div
                        className="rounded-xl px-3 py-2 text-right"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <p className="text-white/45 text-[10px] uppercase tracking-wider">Risk Çarpanı</p>
                        <p
                            className="text-[15px] font-bold tabular-nums mt-0.5"
                            style={{
                                color: sonuc.riskMultiplier > 1 ? "#fca5a5" : "#86efac",
                            }}
                        >
                            ×{sonuc.riskMultiplier.toFixed(2)}
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function BreakdownSatir({ satir }: { satir: BreakdownItem }) {
    return (
        <div className="flex items-start justify-between gap-3 text-[13px]">
            <div className="min-w-0 flex-1">
                <p className="text-white/75 leading-snug">{satir.label}</p>
                {satir.hint && (
                    <p className="text-white/30 text-[11px] mt-0.5 leading-snug">{satir.hint}</p>
                )}
            </div>
            <div className="flex-shrink-0 text-right">
                {satir.factor !== undefined && satir.factor !== null ? (
                    <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{
                            color: satir.factor > 1 ? "#fca5a5" : satir.factor < 1 ? "#86efac" : "rgba(255,255,255,0.6)",
                        }}
                    >
                        ×{satir.factor.toFixed(2)}
                    </span>
                ) : satir.delta !== undefined && satir.delta !== null ? (
                    <span className="text-white/85 tabular-nums font-medium">
                        + {paraFormat(satir.delta)}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

// ─── Sticky bar ──────────────────────────────────────────────────────────────
// Teminat seç ve risk bilgileri adımlarında, sayfa altında yapışıp gözüken bar.
// Sadece toplam + alt info satırı; tıklanınca breakdown'ı modal/expanded açabilir
// (basit versiyonda sadece "Devam et" butonu var).
export function FiyatBreakdownSticky({
    sonuc,
    yukleniyor,
    onDevam,
    devamYazisi = "Devam et",
    devamButonGizle = false,
}: {
    sonuc: PricingResult | null;
    yukleniyor: boolean;
    onDevam?: () => void;
    devamYazisi?: string;
    devamButonGizle?: boolean;
}) {
    return (
        <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-8 lg:w-[480px] z-30 rounded-2xl flex items-center justify-between gap-4 px-5 py-4"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,16,0.95))",
                border: "1px solid rgba(226,232,240,0.18)",
                boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
            }}
        >
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-white/45 text-[10px] uppercase tracking-wider font-medium">
                    Toplam Prim {sonuc && sonuc.riskMultiplier !== 1 && `(Risk ×${sonuc.riskMultiplier.toFixed(2)})`}
                </span>
                <div className="flex items-center gap-2">
                    {yukleniyor ? (
                        <span className="text-white/40 text-xl font-semibold tabular-nums">
                            Hesaplanıyor…
                        </span>
                    ) : sonuc ? (
                        <motion.span
                            key={sonuc.total}
                            initial={{ opacity: 0.5, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-white text-xl font-bold tabular-nums"
                        >
                            {paraFormat(sonuc.total)}
                        </motion.span>
                    ) : (
                        <span className="text-white/40 text-xl font-semibold">—</span>
                    )}
                </div>
                {sonuc && (
                    <span className="text-white/35 text-[11px] mt-0.5 tabular-nums">
                        Baz {paraFormat(sonuc.basePrice)} + Tem {paraFormat(sonuc.coverageTotal)} + BSMV {paraFormat(sonuc.tax)}
                    </span>
                )}
            </div>
            {!devamButonGizle && onDevam && (
                <button
                    onClick={onDevam}
                    disabled={yukleniyor}
                    className="group/cta inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.45), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    {devamYazisi}
                    <IconChevronRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                </button>
            )}
        </motion.div>
    );
}

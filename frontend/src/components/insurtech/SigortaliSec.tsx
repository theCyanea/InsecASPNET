"use client";

// ─── SigortaliSec — Sigortalı kişi seçimi ────────────────────────────────────
// "Bu sigortayı kimin için alıyorsunuz?" adımının UI'ı.
//
// Üç mod:
//   1) "kendim"  → kendisi için (default; sigortalı = sigorta ettiren)
//   2) "mevcut"  → yakın listesinden birini seç (dropdown)
//   3) "yeni"    → form: ad-soyad / TC / doğum tarihi / yakınlık
//
// Yakın listesi boşsa (yeni kullanıcı) sadece "kendim" / "yeni" modları görünür.
// Yeni eklenen yakın hem submit'te oluşturulur (TeklifOlusturDto.YeniSigortali)
// hem de UI'da "mevcut" listeye eklenir (kullanıcı diğer poliçesinde de
// kullanabilsin).

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconUser,
    IconUserPlus,
    IconUsers,
    IconCheck,
    IconAlertCircle,
} from "@tabler/icons-react";
import {
    InsuredPerson,
    Yakinlik,
    YeniSigortaliInput,
    YAKINLIK_ETIKET,
} from "./types";

export type SigortaliSecim =
    | { mod: "kendim" }
    | { mod: "mevcut"; insuredPersonId: number }
    | { mod: "yeni"; data: YeniSigortaliInput; kvkkOnay: boolean };

interface Props {
    yakinlar: InsuredPerson[];                 // useYakinlarim'dan gelen liste
    yukleniyor: boolean;
    secim: SigortaliSecim;
    setSecim: (s: SigortaliSecim) => void;
    // "Kendisi" yakınlık değerli kayıt — varsa bu otomatik kullanıcının adı
    kullaniciAdSoyad?: string;
}

export function SigortaliSec({
    yakinlar, yukleniyor, secim, setSecim, kullaniciAdSoyad,
}: Props) {
    // "Kendim" modunda mevcut Customer'ın adı görünsün, sahte de olsa kişiselleşir
    const benimEtiket = kullaniciAdSoyad ?? "Kendim";

    return (
        <div className="flex flex-col gap-3">
            {/* ── Üç ana mod kartı ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <ModKart
                    aktif={secim.mod === "kendim"}
                    onClick={() => setSecim({ mod: "kendim" })}
                    Icon={IconUser}
                    baslik="Kendim için"
                    altyazi={benimEtiket}
                />
                <ModKart
                    aktif={secim.mod === "mevcut"}
                    onClick={() => {
                        if (yakinlar.length === 0) return;
                        const ilk = yakinlar.find((y) => y.yakinlik !== "Kendisi") ?? yakinlar[0];
                        setSecim({ mod: "mevcut", insuredPersonId: ilk.id });
                    }}
                    disabled={yukleniyor || yakinlar.filter((y) => y.yakinlik !== "Kendisi").length === 0}
                    Icon={IconUsers}
                    baslik="Yakınım için"
                    altyazi={
                        yukleniyor
                            ? "Yükleniyor…"
                            : `${yakinlar.filter((y) => y.yakinlik !== "Kendisi").length} kayıtlı yakın`
                    }
                />
                <ModKart
                    aktif={secim.mod === "yeni"}
                    onClick={() =>
                        setSecim({
                            mod: "yeni",
                            data: {
                                adSoyad: "",
                                tcKimlikNo: "",
                                dogumTarihi: "",
                                yakinlik: "Es",
                                telefon: "",
                            },
                            kvkkOnay: false,
                        })
                    }
                    Icon={IconUserPlus}
                    baslik="Yeni yakın ekle"
                    altyazi="Yakın listene kaydedilir"
                />
            </div>

            {/* ── Mevcut yakın seçici ──────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {secim.mod === "mevcut" && (
                    <motion.div
                        key="mevcut"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        <p className="text-white/55 text-[12px] mb-2">Yakın listenizden seçin:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {yakinlar
                                .filter((y) => y.yakinlik !== "Kendisi")
                                .map((y) => (
                                    <YakinKart
                                        key={y.id}
                                        yakin={y}
                                        secili={secim.insuredPersonId === y.id}
                                        onSec={() => setSecim({ mod: "mevcut", insuredPersonId: y.id })}
                                    />
                                ))}
                        </div>
                    </motion.div>
                )}

                {secim.mod === "yeni" && (
                    <motion.div
                        key="yeni"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        <YeniYakinFormu secim={secim} setSecim={setSecim} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Üst seviye 3 mod kartı (kendim / mevcut / yeni) ────────────────────────
function ModKart({
    aktif, onClick, disabled, Icon, baslik, altyazi,
}: {
    aktif: boolean;
    onClick: () => void;
    disabled?: boolean;
    Icon: React.ElementType;
    baslik: string;
    altyazi: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="relative rounded-xl px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
                background: aktif
                    ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                    : "rgba(255,255,255,0.03)",
                border: aktif
                    ? "1px solid rgba(226,232,240,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                boxShadow: aktif ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
            }}
        >
            <div className="flex items-center gap-2.5 mb-1.5">
                <Icon className="w-4 h-4" style={{ color: aktif ? "#cbd5e1" : "rgba(255,255,255,0.55)" }} />
                <p className="text-[13.5px] font-semibold" style={{ color: aktif ? "#ffffff" : "rgba(255,255,255,0.85)" }}>
                    {baslik}
                </p>
                {aktif && (
                    <motion.span
                        layoutId="sigortali-tik"
                        className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #f8fafc, #cbd5e1)" }}
                    >
                        <IconCheck className="w-3 h-3" style={{ color: "#0f172a" }} strokeWidth={3} />
                    </motion.span>
                )}
            </div>
            <p className="text-[11px]" style={{ color: aktif ? "#cbd5e1" : "rgba(255,255,255,0.35)" }}>
                {altyazi}
            </p>
        </button>
    );
}

// ─── Tek yakın satır kartı (mevcut yakın listesi) ───────────────────────────
function YakinKart({
    yakin, secili, onSec,
}: {
    yakin: InsuredPerson;
    secili: boolean;
    onSec: () => void;
}) {
    const yas = hesaplaYas(yakin.dogumTarihi);
    return (
        <button
            type="button"
            onClick={onSec}
            className="rounded-lg px-3.5 py-3 text-left transition-all hover:-translate-y-0.5"
            style={{
                background: secili
                    ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                    : "rgba(255,255,255,0.02)",
                border: secili
                    ? "1px solid rgba(226,232,240,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-white text-[13px] font-medium truncate">{yakin.adSoyad}</span>
                {secili && <IconCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#cbd5e1" }} strokeWidth={3} />}
            </div>
            <div className="flex items-center gap-2 text-[11px]">
                <span
                    className="uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                    style={{
                        background: "rgba(226,232,240,0.06)",
                        color: "#cbd5e1",
                        border: "1px solid rgba(226,232,240,0.15)",
                    }}
                >
                    {YAKINLIK_ETIKET[yakin.yakinlik]}
                </span>
                <span className="text-white/40 tabular-nums">{yas} yaş</span>
            </div>
        </button>
    );
}

// ─── Yeni yakın oluşturma formu ─────────────────────────────────────────────
function YeniYakinFormu({
    secim, setSecim,
}: {
    secim: Extract<SigortaliSecim, { mod: "yeni" }>;
    setSecim: (s: SigortaliSecim) => void;
}) {
    const updateData = (patch: Partial<YeniSigortaliInput>) =>
        setSecim({ ...secim, data: { ...secim.data, ...patch } });

    const inputStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#ffffff",
    };

    const yakinlikSecenekleri: Yakinlik[] = ["Es", "Anne", "Baba", "Cocuk", "Kardes", "Diger"];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
                <Label>Ad Soyad</Label>
                <input
                    type="text"
                    value={secim.data.adSoyad}
                    onChange={(e) => updateData({ adSoyad: e.target.value })}
                    placeholder="Örn: Ayşe Yılmaz"
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                    style={inputStyle}
                />
            </div>

            <div>
                <Label>TC Kimlik No</Label>
                <input
                    type="text"
                    value={secim.data.tcKimlikNo}
                    onChange={(e) => updateData({ tcKimlikNo: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                    placeholder="11 haneli"
                    maxLength={11}
                    required
                    inputMode="numeric"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums"
                    style={inputStyle}
                />
            </div>

            <div>
                <Label>Doğum Tarihi</Label>
                <input
                    type="date"
                    value={secim.data.dogumTarihi}
                    onChange={(e) => updateData({ dogumTarihi: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                    style={inputStyle}
                />
            </div>

            <div>
                <Label>Yakınlık</Label>
                <select
                    value={secim.data.yakinlik}
                    onChange={(e) => updateData({ yakinlik: e.target.value as Yakinlik })}
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                    style={inputStyle}
                >
                    {yakinlikSecenekleri.map((y) => (
                        <option key={y} value={y} style={{ background: "#0f172a" }}>
                            {YAKINLIK_ETIKET[y]}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <Label opsiyonel>Telefon</Label>
                <input
                    type="tel"
                    value={secim.data.telefon ?? ""}
                    onChange={(e) => updateData({ telefon: e.target.value })}
                    placeholder="05XX XXX XX XX"
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                    style={inputStyle}
                />
            </div>

            {/* KVKK onay — yasal zorunluluk */}
            <div className="sm:col-span-2 mt-1">
                <label
                    className="flex items-start gap-2.5 cursor-pointer rounded-xl p-3.5 transition-colors hover:bg-white/[0.02]"
                    style={{
                        background: secim.kvkkOnay ? "rgba(226,232,240,0.04)" : "rgba(255,255,255,0.02)",
                        border: secim.kvkkOnay
                            ? "1px solid rgba(226,232,240,0.18)"
                            : "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={secim.kvkkOnay}
                        onChange={(e) => setSecim({ ...secim, kvkkOnay: e.target.checked })}
                        className="mt-0.5 accent-slate-300"
                    />
                    <div className="flex-1">
                        <p className="text-white/85 text-[12.5px] leading-relaxed">
                            <strong className="font-semibold">KVKK / Bilgilendirilmiş onay:</strong> Yakınımın
                            kişisel verilerini sisteme girmeye yetkili olduğumu, kendisinden açık rıza
                            aldığımı beyan ediyorum.
                        </p>
                        {!secim.kvkkOnay && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-300/80">
                                <IconAlertCircle className="w-3 h-3" />
                                Devam etmek için bu beyanı onaylamalısın.
                            </div>
                        )}
                    </div>
                </label>
            </div>
        </div>
    );
}

function Label({ children, opsiyonel }: { children: React.ReactNode; opsiyonel?: boolean }) {
    return (
        <label className="flex items-center gap-1.5 text-white/65 text-[12px] font-medium mb-1.5">
            {children}
            {opsiyonel && (
                <span
                    className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.4)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    Opsiyonel
                </span>
            )}
        </label>
    );
}

function hesaplaYas(dogumTarihi: string): number {
    const d = new Date(dogumTarihi);
    const bugun = new Date();
    let yas = bugun.getFullYear() - d.getFullYear();
    const m = bugun.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && bugun.getDate() < d.getDate())) yas--;
    return Math.max(0, yas);
}

// ─── Validasyon helper'ı — secim'in submit'e hazır olup olmadığı ────────────
// teklif-al ana sayfası "Devam et" butonunu enabled/disabled için kullanır.
export function sigortaliSecimGecerli(secim: SigortaliSecim): boolean {
    if (secim.mod === "kendim") return true;
    if (secim.mod === "mevcut") return secim.insuredPersonId > 0;
    if (secim.mod === "yeni") {
        const d = secim.data;
        return (
            !!d.adSoyad.trim() &&
            d.tcKimlikNo.length === 11 &&
            !!d.dogumTarihi &&
            !!d.yakinlik &&
            secim.kvkkOnay
        );
    }
    return false;
}

// ─── Submit payload helper'ı — TeklifOlusturDto formatına çevirir ───────────
export function sigortaliSecimToPayload(secim: SigortaliSecim): {
    insuredPersonId: number | null;
    yeniSigortali: YeniSigortaliInput | null;
} {
    if (secim.mod === "kendim") return { insuredPersonId: null, yeniSigortali: null };
    if (secim.mod === "mevcut") return { insuredPersonId: secim.insuredPersonId, yeniSigortali: null };
    if (secim.mod === "yeni") return { insuredPersonId: null, yeniSigortali: secim.data };
    return { insuredPersonId: null, yeniSigortali: null };
}

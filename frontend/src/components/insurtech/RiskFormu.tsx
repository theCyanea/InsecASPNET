"use client";

// ─── RiskFormu — Schema-driven risk veri girişi ─────────────────────────────
// Backend RiskSchemas'tan gelen RiskParameter[] listesini alıp dinamik form üretir.
// Insurtech akışının kritik bileşeni: aynı UI, farklı ürün → farklı sorular.
//
// Kullanım:
//   <RiskFormu sema={schemaArray} degerler={obj} setDegerler={fn} />
//
// Özellikler:
//   - Gridd 2 sütun (mobile 1 sütun, fullWidth alanlar tam satır)
//   - select / number / text tiplerine göre otomatik input render
//   - Min/max validasyonu input'a bağlanır (browser düzeyi)
//   - Required olmayan alanlar etiketinde "(opsiyonel)" rozeti

import { motion } from "motion/react";
import { IconInfoCircle } from "@tabler/icons-react";
import { RiskParameter } from "./types";

interface Props {
    sema: RiskParameter[];
    degerler: Record<string, string>;
    setDegerler: (d: Record<string, string>) => void;
    // Form içine başlık veya bilgilendirici banner istemiyorsak false
    baslikGizle?: boolean;
}

export function RiskFormu({ sema, degerler, setDegerler, baslikGizle = false }: Props) {
    const setDeger = (key: string, val: string) => {
        setDegerler({ ...degerler, [key]: val });
    };

    if (sema.length === 0) {
        return (
            <div
                className="rounded-xl px-4 py-5 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <p className="text-white/55 text-sm">
                    Bu ürün için risk değerlendirmesi gerekmiyor — fiyat sabit tarife üzerinden hesaplanıyor.
                </p>
            </div>
        );
    }

    return (
        <div>
            {!baslikGizle && (
                <div className="flex items-start gap-2.5 mb-5 px-1">
                    <IconInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#cbd5e1" }} />
                    <p className="text-white/50 text-[12px] leading-relaxed">
                        Aşağıdaki bilgiler primizi etkiler. Doğru beyan, doğru fiyat anlamına gelir.
                        Beyanlarınızı poliçe başvurunuzla birlikte muhafaza ediyoruz.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {sema.map((alan) => (
                    <motion.div
                        key={alan.key}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: alan.displayOrder * 0.02 }}
                        className={alan.fullWidth ? "sm:col-span-2" : ""}
                    >
                        <Label parametre={alan} />
                        <RenderInput
                            parametre={alan}
                            deger={degerler[alan.key] ?? ""}
                            onChange={(v) => setDeger(alan.key, v)}
                        />
                        {alan.hint && (
                            <p className="text-white/30 text-[11px] mt-1.5 leading-snug">{alan.hint}</p>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function Label({ parametre }: { parametre: RiskParameter }) {
    return (
        <label className="flex items-center gap-1.5 text-white/65 text-[12px] font-medium mb-1.5">
            {parametre.label}
            {!parametre.isRequired && (
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

function RenderInput({
    parametre,
    deger,
    onChange,
}: {
    parametre: RiskParameter;
    deger: string;
    onChange: (v: string) => void;
}) {
    const baseStyle: React.CSSProperties = {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "#ffffff",
    };

    if (parametre.type === "select" && parametre.options) {
        return (
            <select
                value={deger}
                onChange={(e) => onChange(e.target.value)}
                required={parametre.isRequired}
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-white/30"
                style={baseStyle}
            >
                <option value="" style={{ background: "#0f172a" }}>Seçiniz...</option>
                {parametre.options.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: "#0f172a" }}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <input
            type={parametre.type === "number" ? "number" : "text"}
            value={deger}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parametre.placeholder}
            min={parametre.min}
            max={parametre.max}
            required={parametre.isRequired}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-white/30 placeholder:text-white/25"
            style={baseStyle}
        />
    );
}

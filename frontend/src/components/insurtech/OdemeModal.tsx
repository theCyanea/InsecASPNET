"use client";

// ─── OdemeModal — Mock ödeme akışı UI ───────────────────────────────────────
// Detay sayfasındaki "Ödemeyi tamamla" butonuna tıklayınca açılır.
// Kart bilgilerini alıp backend'in mock payment service'ine gönderir.
//
// Akış:
//   1) Form doldur (kart no, ad, son kullanma, CVV)
//   2) Frontend validation: format, length, MM/YY parse, Luhn (?)
//   3) Submit → spinner → backend simülasyonu (1.5sn delay)
//   4) Başarı → "✓ Ödeme alındı" → modal kapanır → sayfa yenilenir
//   5) Başarısızlık → hata banner → form aktif kalır, kullanıcı tekrar dener
//
// UX detayları:
//   - Kart numarası 4'lü gruplarda görünüm ("4242 4242 4242 4242")
//   - Auto-format: kullanıcı yazdıkça boşluklar otomatik ekleniyor
//   - Sadece sayı kabul ediyor (harf girince yok sayılıyor)
//   - Son kullanma "MM/YY" maskeli giriş
//   - CVV 3-4 hane
//   - Test kartı yardımcı bilgi (kullanıcı denemek isterse)
//
// Güvenlik notu: gerçek production'da kart bilgisi backend'e GİTMEZ —
// payment processor'ın tokenization SDK'sıyla token alınır, sadece o
// token backend'e gider. Bu mock akademik amaçlı; uyarı bantında
// kullanıcıya "test ödemesi" olduğu bildirilir.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconX,
    IconLock,
    IconCreditCard,
    IconCheck,
    IconAlertCircle,
    IconShieldLock,
    IconInfoCircle,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface OdemeModalProps {
    acik: boolean;
    onKapat: () => void;
    onBasarili: () => void;
    policyId: number;
    tutar: number;
    policyNumber: string;
    urunAdi: string;
}

export function OdemeModal({
    acik,
    onKapat,
    onBasarili,
    policyId,
    tutar,
    policyNumber,
    urunAdi,
}: OdemeModalProps) {
    const [kartNo, setKartNo] = useState("");
    const [kartSahibi, setKartSahibi] = useState("");
    const [sonKullanma, setSonKullanma] = useState("");
    const [cvv, setCvv] = useState("");
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState<string | null>(null);
    const [basariEkrani, setBasariEkrani] = useState<{
        islemRef: string;
        son4: string;
    } | null>(null);

    // ─── Auto-format helpers ────────────────────────────────────────────────
    // Kullanıcı yazdıkça otomatik boşluk ekleyen handler.
    // "4242424242424242" → "4242 4242 4242 4242"
    const kartNoDegis = (deger: string) => {
        // Sadece rakamları al, boşlukları kaldır
        const rakamlar = deger.replace(/\D/g, "").slice(0, 16);
        // 4'erli gruplara ayır
        const formatted = rakamlar.match(/.{1,4}/g)?.join(" ") ?? rakamlar;
        setKartNo(formatted);
    };

    // "1228" → "12/28" otomatik slash ekleme
    const sonKullanmaDegis = (deger: string) => {
        const rakamlar = deger.replace(/\D/g, "").slice(0, 4);
        if (rakamlar.length >= 3) {
            setSonKullanma(`${rakamlar.slice(0, 2)}/${rakamlar.slice(2)}`);
        } else {
            setSonKullanma(rakamlar);
        }
    };

    const cvvDegis = (deger: string) => {
        const rakamlar = deger.replace(/\D/g, "").slice(0, 4);
        setCvv(rakamlar);
    };

    // Frontend tarafı temel validation — backend her halükarda doğrular
    const formGecerli = () => {
        const kartNoRakamlar = kartNo.replace(/\s/g, "");
        return (
            kartNoRakamlar.length === 16 &&
            kartSahibi.trim().length >= 3 &&
            /^\d{2}\/\d{2}$/.test(sonKullanma) &&
            cvv.length >= 3 &&
            cvv.length <= 4
        );
    };

    const odemeGonder = async () => {
        setHata(null);
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Policies/${policyId}/odeme-tamamla`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    kartNumarasi: kartNo.replace(/\s/g, ""),
                    kartSahibi: kartSahibi.trim(),
                    sonKullanma: sonKullanma,
                    cvv: cvv,
                }),
            });

            const data = await r.json();

            if (!r.ok) {
                // Backend BadRequest döndürdü — hata mesajı gösterelim
                setHata(data.mesaj ?? "Ödeme reddedildi. Lütfen tekrar deneyin.");
                return;
            }

            // Başarılı — başarı ekranını göster, 2 saniye sonra modal kapanır
            setBasariEkrani({
                islemRef: data.islemReferansi,
                son4: data.kartSon4,
            });
            setTimeout(() => {
                onBasarili();
            }, 2000);
        } catch {
            setHata("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setGonderiliyor(false);
        }
    };

    return (
        <AnimatePresence>
            {acik && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                    onClick={(e) => {
                        // Backdrop tıklamasıyla kapanır (gönderiliyor değilse)
                        if (e.target === e.currentTarget && !gonderiliyor && !basariEkrani) {
                            onKapat();
                        }
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full max-w-md rounded-2xl overflow-hidden relative"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,16,0.98))",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7)",
                        }}
                    >
                        {/* Başarı ekranı */}
                        {basariEkrani ? (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-8 text-center"
                            >
                                <div
                                    className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full"
                                    style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.18), transparent 70%)" }}
                                />
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 18 }}
                                    className="relative z-10 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))",
                                        border: "1px solid rgba(16,185,129,0.35)",
                                    }}
                                >
                                    <IconCheck className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                                </motion.div>
                                <h2 className="text-white text-xl font-bold mb-2">Ödemeniz Alındı</h2>
                                <p className="text-white/55 text-sm mb-4">
                                    {urunAdi} poliçeniz artık aktif.
                                </p>
                                <div
                                    className="rounded-xl px-4 py-3 inline-flex flex-col gap-1 text-[12px]"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-6">
                                        <span className="text-white/45">İşlem No</span>
                                        <span className="text-white/85 font-mono tabular-nums">
                                            {basariEkrani.islemRef}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-6">
                                        <span className="text-white/45">Kart</span>
                                        <span className="text-white/85 font-mono tabular-nums">
                                            **** **** **** {basariEkrani.son4}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <>
                                {/* Üst başlık */}
                                <div
                                    className="px-6 py-5 flex items-center justify-between"
                                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            <IconCreditCard className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                        </div>
                                        <div>
                                            <h2 className="text-white text-base font-semibold">Ödemeyi Tamamla</h2>
                                            <p className="text-white/45 text-[11px]">{policyNumber} · {urunAdi}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onKapat}
                                        disabled={gonderiliyor}
                                        className="text-white/40 hover:text-white/80 transition-colors disabled:opacity-40"
                                    >
                                        <IconX className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Tutar şeridi */}
                                <div
                                    className="px-6 py-4 flex items-center justify-between"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(226,232,240,0.04), rgba(148,163,184,0.02))",
                                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <div>
                                        <p className="text-white/45 text-[10px] uppercase tracking-wider font-medium">
                                            Ödenecek Tutar
                                        </p>
                                        <p className="text-white text-2xl font-bold tabular-nums mt-0.5">
                                            {`₺${tutar.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                        <IconShieldLock className="w-3.5 h-3.5" />
                                        <span>SSL şifreli</span>
                                    </div>
                                </div>

                                {/* TEST UYARISI — bu bir simülasyondur */}
                                <div
                                    className="mx-6 mt-4 px-3 py-2.5 rounded-lg flex items-start gap-2"
                                    style={{
                                        background: "rgba(245,158,11,0.06)",
                                        border: "1px solid rgba(245,158,11,0.18)",
                                    }}
                                >
                                    <IconInfoCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-300" />
                                    <p className="text-amber-200/85 text-[11px] leading-snug">
                                        <strong>Demo modu:</strong> Bu bir test ödemesidir. Hiçbir gerçek
                                        ücretlendirme yapılmaz. Test için <code className="font-mono">4242 4242 4242 4242</code> deneyin.
                                    </p>
                                </div>

                                {/* Form */}
                                <div className="p-6 flex flex-col gap-3.5">
                                    {/* Kart numarası */}
                                    <FormAlani label="Kart Numarası">
                                        <input
                                            type="text"
                                            value={kartNo}
                                            onChange={(e) => kartNoDegis(e.target.value)}
                                            placeholder="0000 0000 0000 0000"
                                            inputMode="numeric"
                                            disabled={gonderiliyor}
                                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums font-mono disabled:opacity-50"
                                            style={inputStyle}
                                        />
                                    </FormAlani>

                                    {/* Kart sahibi */}
                                    <FormAlani label="Kart Üzerindeki İsim">
                                        <input
                                            type="text"
                                            value={kartSahibi}
                                            onChange={(e) => setKartSahibi(e.target.value.toUpperCase())}
                                            placeholder="ÖRN: AHMET YILMAZ"
                                            disabled={gonderiliyor}
                                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                                            style={inputStyle}
                                        />
                                    </FormAlani>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormAlani label="Son Kullanma">
                                            <input
                                                type="text"
                                                value={sonKullanma}
                                                onChange={(e) => sonKullanmaDegis(e.target.value)}
                                                placeholder="MM/YY"
                                                inputMode="numeric"
                                                maxLength={5}
                                                disabled={gonderiliyor}
                                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums font-mono disabled:opacity-50"
                                                style={inputStyle}
                                            />
                                        </FormAlani>
                                        <FormAlani label="CVV">
                                            <input
                                                type="text"
                                                value={cvv}
                                                onChange={(e) => cvvDegis(e.target.value)}
                                                placeholder="123"
                                                inputMode="numeric"
                                                maxLength={4}
                                                disabled={gonderiliyor}
                                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums font-mono disabled:opacity-50"
                                                style={inputStyle}
                                            />
                                        </FormAlani>
                                    </div>

                                    {/* Hata banner */}
                                    {hata && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl px-3.5 py-2.5 flex items-start gap-2"
                                            style={{
                                                background: "rgba(239,68,68,0.08)",
                                                border: "1px solid rgba(239,68,68,0.25)",
                                            }}
                                        >
                                            <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-300" />
                                            <p className="text-red-200/90 text-[12px] leading-snug">{hata}</p>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Alt butonlar */}
                                <div
                                    className="px-6 py-4 flex items-center justify-between gap-3"
                                    style={{
                                        borderTop: "1px solid rgba(255,255,255,0.06)",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <button
                                        onClick={onKapat}
                                        disabled={gonderiliyor}
                                        className="text-[13px] text-white/55 hover:text-white/90 transition-colors disabled:opacity-40"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={odemeGonder}
                                        disabled={!formGecerli() || gonderiliyor}
                                        className="group/cta inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                        style={{
                                            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                            color: "#0f172a",
                                            boxShadow: "0 10px 30px -10px rgba(226,232,240,0.45), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                            border: "1px solid rgba(226,232,240,0.5)",
                                        }}
                                    >
                                        {gonderiliyor ? (
                                            <>
                                                <span
                                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                    style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                                                />
                                                İşleniyor…
                                            </>
                                        ) : (
                                            <>
                                                <IconLock className="w-3.5 h-3.5" />
                                                Güvenli Ödeme Yap
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
};

function FormAlani({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-white/65 text-[11px] uppercase tracking-wider font-medium block mb-1.5">
                {label}
            </label>
            {children}
        </div>
    );
}

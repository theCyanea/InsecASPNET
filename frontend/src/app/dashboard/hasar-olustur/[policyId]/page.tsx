"use client";

// ─── /dashboard/hasar-olustur/[policyId] ─────────────────────────────────────
// Hasar bildirim formu. Sadece "Aktif Poliçe" durumundaki kayıtlar için.
//
// Form alanları:
//   - HasarTuru (select — whitelist)
//   - HasarTarihi (date)
//   - HasarYeri (text, opsiyonel)
//   - Açıklama (textarea, min 10 char)
//   - TalepEdilenTutar (number)
//   - Fotoğraf URL'leri (mock — dosya upload yerine)
//
// Backend: POST /api/Claims/hasar-kaydi-olustur
// Başarılı → /dashboard/hasarlarim/[yeniHasarId] yönlendir

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FotografYukleyici } from "@/components/insurtech/FotografYukleyici";
import {
    IconArrowLeft,
    IconArrowRight,
    IconAlertTriangle,
    IconCalendarEvent,
    IconMapPin,
    IconCash,
    IconFileText,
    IconCamera,
    IconShieldCheck,
    IconInfoCircle,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface PoliceMini {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    status: string;
    isActive: boolean;
    customerId: number;
    product?: {
        productName: string;
        productCode?: string | null;
    };
}

const HASAR_TURLERI: { value: string; aciklama: string }[] = [
    { value: "Trafik Kazası", aciklama: "Çarpışma, devrilme, çarpma" },
    { value: "Yangın",        aciklama: "Yangın ve patlama hasarları" },
    { value: "Hırsızlık",     aciklama: "Çalınma veya çalınmaya teşebbüs" },
    { value: "Doğal Afet",    aciklama: "Sel, dolu, fırtına, deprem" },
    { value: "Sağlık",        aciklama: "Tıbbi tedavi gerektiren durumlar" },
    { value: "Cam Kırılması", aciklama: "Araç ve konut camı" },
    { value: "Diğer",         aciklama: "Yukarıdakilere uymayan durumlar" },
];

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function HasarOlusturPage({ params }: { params: Promise<{ policyId: string }> }) {
    const { policyId } = use(params);
    const router = useRouter();

    const [police, setPolice] = useState<PoliceMini | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [yuklemeHatasi, setYuklemeHatasi] = useState("");

    // Form state
    const [hasarTuru, setHasarTuru] = useState<string>("Trafik Kazası");
    const [hasarTarihi, setHasarTarihi] = useState<string>("");
    const [hasarYeri, setHasarYeri] = useState("");
    const [aciklama, setAciklama] = useState("");
    const [tutar, setTutar] = useState("");   // opsiyonel — boş bırakılabilir
    const [fotograflar, setFotograflar] = useState<string[]>([]);

    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [gonderHatasi, setGonderHatasi] = useState("");

    // ─── Geri butonu — referrer-aware ───────────────────────────────────────
    // Kullanıcı bu sayfaya hangi yoldan geldiyse oraya dönsün.
    // document.referrer'ı mount sırasında bir kez okuyup state'e yazıyoruz —
    // böylece kullanıcı sayfada gezinse de etiket sabit kalır (ilk gelinen
    // ekran neyse onu gösteriyoruz).
    //
    // Olası gelinen yerler:
    //   - /dashboard/hasar-olustur          → poliçe seçim ekranı (en yaygın)
    //   - /dashboard/policeler/{id}         → poliçe detay sayfasındaki "Hasar bildir" linki
    //   - /dashboard/hasarlarim             → liste sayfasında "Yeni Hasar Bildir" → picker → form
    //                                          (referrer picker olur)
    //   - direct URL                        → fallback "Geri"
    const [geriEtiket, setGeriEtiket] = useState("Geri");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const ref = document.referrer || "";
        // Aynı host kontrolü — cross-origin referrer ile yanlış yönlendirme olmasın
        try {
            const refUrl = new URL(ref);
            if (refUrl.host !== window.location.host) {
                setGeriEtiket("Geri");
                return;
            }
            const path = refUrl.pathname;
            if (path === `/dashboard/policeler/${policyId}`) {
                setGeriEtiket("Poliçeye dön");
            } else if (path === "/dashboard/hasar-olustur") {
                setGeriEtiket("Hasar Bildir");
            } else if (path === "/dashboard/hasarlarim") {
                setGeriEtiket("Hasarlarım");
            } else {
                setGeriEtiket("Geri");
            }
        } catch {
            setGeriEtiket("Geri");
        }
    }, [policyId]);

    // Browser history varsa back, yoksa picker sayfasına fallback.
    // Edge case: kullanıcı direct URL ile bu sayfayı açtıysa history.length=1 olur,
    // back yapsa önce gelen sayfaya dönecek (uygulama dışı) → fallback gerekir.
    const geriDon = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/dashboard/hasar-olustur");
        }
    };

    // Poliçeyi çek
    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Policies/police-detaylarini-getir/${policyId}`, {
                    credentials: "include",
                });
                if (r.status === 401) {
                    window.location.href = "/";
                    return;
                }
                if (r.status === 404) {
                    setYuklemeHatasi("Poliçe bulunamadı veya size ait değil.");
                    return;
                }
                if (!r.ok) throw new Error();
                const data: PoliceMini = await r.json();

                if (data.status !== "Aktif Poliçe" || !data.isActive) {
                    setYuklemeHatasi("Hasar bildirimi sadece yürürlükteki aktif poliçeler için yapılabilir.");
                    setPolice(data);
                    return;
                }

                setPolice(data);
            } catch {
                setYuklemeHatasi("Poliçe bilgisi yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, [policyId]);

    const formGecerli = () => {
        // Tutar opsiyonel — boşsa geçer, doluysa makul aralıkta olmalı
        if (tutar.trim() !== "") {
            const t = parseFloat(tutar);
            if (isNaN(t) || t <= 0 || t > 10_000_000) return false;
        }
        return (
            !!hasarTuru &&
            !!hasarTarihi &&
            aciklama.trim().length >= 10 &&
            aciklama.trim().length <= 2000
        );
    };

    const gonder = async () => {
        if (!police) return;
        setGonderHatasi("");
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Claims/hasar-kaydi-olustur`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    policyId: police.id,
                    hasarTuru,
                    hasarTarihi: new Date(hasarTarihi).toISOString(),
                    hasarYeri: hasarYeri.trim() || null,
                    aciklama: aciklama.trim(),
                    // Tahmini tutar opsiyonel — boşsa null gönder, eksper belirleyecek
                    tahminiTutar: tutar.trim() === "" ? null : parseFloat(tutar),
                    fotografUrlleri: fotograflar.length > 0 ? fotograflar : null,
                }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setGonderHatasi(txt || "Hasar talebi oluşturulamadı.");
                return;
            }
            const data = await r.json();
            // Başarılı → detay sayfasına yönlendir
            router.push(`/dashboard/hasarlarim/${data.hasarId}`);
        } catch {
            setGonderHatasi("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setGonderiliyor(false);
        }
    };

    // Yükleme / hata ekranları
    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    if (yuklemeHatasi || !police) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href="/dashboard/policeler"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Poliçelerim
                    </Link>
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                        <p className="text-white text-base font-semibold">
                            {yuklemeHatasi || "Bir şeyler ters gitti."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const baslangic = new Date(police.startDate);
    const bitis = new Date(police.endDate);
    const bugun = new Date().toISOString().split("T")[0];
    const minTarih = baslangic.toISOString().split("T")[0];

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Üst başlık */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                >
                    <button
                        type="button"
                        onClick={geriDon}
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-4"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        {geriEtiket}
                    </button>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Hasar Bildirimi<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Eksperimiz dosyanızı en kısa sürede inceleyecektir.
                    </p>
                </motion.div>

                {/* Poliçe özeti şeridi */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.4 }}
                    className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-4"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                    }}
                >
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))",
                            border: "1px solid rgba(16,185,129,0.25)",
                        }}
                    >
                        <IconShieldCheck className="w-5 h-5" style={{ color: "rgb(110,231,183)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">
                            {police.product?.productName ?? "Sigorta Ürünü"}
                        </p>
                        <p className="text-white/40 text-[12px] mt-0.5">
                            <span className="font-mono tabular-nums">{police.policyNumber}</span>
                            {" · "}
                            {tarihFormat(baslangic)} → {tarihFormat(bitis)}
                        </p>
                    </div>
                    <span
                        className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                        style={{
                            background: "rgba(16,185,129,0.12)",
                            border: "1px solid rgba(16,185,129,0.3)",
                            color: "rgb(110,231,183)",
                        }}
                    >
                        Aktif
                    </span>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="rounded-2xl p-6 lg:p-8 flex flex-col gap-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {/* Hasar türü */}
                    <FormGroup label="Hasar Türü" Icon={IconAlertTriangle}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {HASAR_TURLERI.map((t) => {
                                const aktif = t.value === hasarTuru;
                                return (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setHasarTuru(t.value)}
                                        disabled={gonderiliyor}
                                        className="rounded-xl px-3 py-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                        style={{
                                            background: aktif
                                                ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                                                : "rgba(255,255,255,0.02)",
                                            border: aktif
                                                ? "1px solid rgba(226,232,240,0.35)"
                                                : "1px solid rgba(255,255,255,0.06)",
                                        }}
                                    >
                                        <p className="text-[12.5px] font-semibold text-white">{t.value}</p>
                                        <p className="text-[10px] text-white/40 mt-0.5">{t.aciklama}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </FormGroup>

                    {/* Tarih + yer 2 kolon */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormGroup label="Hasar Tarihi" Icon={IconCalendarEvent}>
                            <input
                                type="date"
                                value={hasarTarihi}
                                onChange={(e) => setHasarTarihi(e.target.value)}
                                min={minTarih}
                                max={bugun}
                                disabled={gonderiliyor}
                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                                style={inputStyle}
                            />
                            <p className="text-white/30 text-[11px] mt-1">
                                Poliçe başlangıcından bugüne kadar
                            </p>
                        </FormGroup>

                        <FormGroup label="Hasar Yeri" Icon={IconMapPin} opsiyonel>
                            <input
                                type="text"
                                value={hasarYeri}
                                onChange={(e) => setHasarYeri(e.target.value)}
                                placeholder="Örn: İstanbul - Beşiktaş"
                                disabled={gonderiliyor}
                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                                style={inputStyle}
                            />
                        </FormGroup>
                    </div>

                    {/* Açıklama */}
                    <FormGroup label="Olay Açıklaması" Icon={IconFileText}>
                        <textarea
                            value={aciklama}
                            onChange={(e) => setAciklama(e.target.value)}
                            placeholder="Hasarın nasıl oluştuğunu detaylı bir şekilde anlatın. Eksperimiz değerlendirme yaparken bu metni kullanacaktır."
                            rows={5}
                            maxLength={2000}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y disabled:opacity-50"
                            style={inputStyle}
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-white/30 text-[11px]">
                                Min 10 karakter
                            </p>
                            <p className="text-white/30 text-[11px] tabular-nums">
                                {aciklama.length} / 2000
                            </p>
                        </div>
                    </FormGroup>

                    {/* Tahmini tutar — opsiyonel */}
                    <FormGroup label="Tahmini Hasar Tutarı (₺)" Icon={IconCash} opsiyonel>
                        <input
                            type="number"
                            value={tutar}
                            onChange={(e) => setTutar(e.target.value)}
                            placeholder="Örn: 25000 (boş bırakabilirsiniz)"
                            min="0"
                            step="0.01"
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums disabled:opacity-50"
                            style={inputStyle}
                        />
                        {tutar && !isNaN(parseFloat(tutar)) && parseFloat(tutar) > 0 && (
                            <p className="text-white/55 text-[12px] mt-1">
                                Tahmini: <strong className="text-white">{paraFormat(parseFloat(tutar))}</strong>
                            </p>
                        )}
                        <div
                            className="mt-2 rounded-lg px-3 py-2 flex items-start gap-2"
                            style={{
                                background: "rgba(59,130,246,0.05)",
                                border: "1px solid rgba(59,130,246,0.15)",
                            }}
                        >
                            <IconInfoCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgb(147,197,253)" }} />
                            <p className="text-blue-200/85 text-[11px] leading-snug">
                                <strong>Net tutarı eksperimiz belirleyecek.</strong> Hasarın fatura/maliyet
                                bilgisi varsa bu alana girebilirsiniz; emin değilseniz boş bırakın.
                                Sağlık hasarlarında fatura tutarı, diğerlerinde tahmini değer girilir.
                            </p>
                        </div>
                    </FormGroup>

                    {/* Fotoğraflar — drag-drop uploader */}
                    <FormGroup label="Hasar Fotoğrafları" Icon={IconCamera} opsiyonel>
                        <FotografYukleyici
                            urlListesi={fotograflar}
                            setUrlListesi={setFotograflar}
                            disabled={gonderiliyor}
                        />
                    </FormGroup>

                    {/* Bilgi notu */}
                    <div
                        className="rounded-xl px-4 py-3 flex items-start gap-2.5"
                        style={{
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.18)",
                        }}
                    >
                        <IconInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
                        <p className="text-amber-200/85 text-[12px] leading-relaxed">
                            <strong>Bilgi:</strong> Yanlış veya eksik bilgi vermek poliçenizin geçersiz
                            sayılmasına yol açabilir. Eksperimiz dosyanızı detaylı inceleyecek;
                            gerektiğinde sizden ek belge istenebilir.
                        </p>
                    </div>

                    {/* Hata satırı */}
                    {gonderHatasi && (
                        <div
                            className="rounded-xl px-4 py-3 text-sm"
                            style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.25)",
                                color: "rgb(252,165,165)",
                            }}
                        >
                            {gonderHatasi}
                        </div>
                    )}

                    {/* Submit butonu */}
                    <div className="flex justify-end">
                        <button
                            onClick={gonder}
                            disabled={!formGecerli() || gonderiliyor}
                            className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            style={{
                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                color: "#0f172a",
                                boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                border: "1px solid rgba(226,232,240,0.5)",
                            }}
                        >
                            {gonderiliyor ? (
                                <>
                                    <span
                                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                        style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                                    />
                                    Gönderiliyor
                                </>
                            ) : (
                                <>
                                    Hasarı Bildir
                                    <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
};

function FormGroup({
    label,
    Icon,
    opsiyonel,
    children,
}: {
    label: string;
    Icon: React.ElementType;
    opsiyonel?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: "#cbd5e1" }} />
                <p className="text-white/85 text-[12.5px] font-semibold">{label}</p>
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
            </div>
            {children}
        </div>
    );
}

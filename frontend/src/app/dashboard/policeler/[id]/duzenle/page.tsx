"use client";

// ─── /dashboard/policeler/{id}/duzenle ───────────────────────────────────────
// Teklif düzenleme sayfası. Sadece "Teklif Bekliyor" durumundaki kayıtlar için
// erişilebilir; aksi halde detay sayfasına geri yönlendirilir.
//
// Pre-fill mantığı:
//   - Süre: (endDate - startDate) gün cinsinden hesaplanıyor
//   - Teminatlar: police.policyCoverages.map(pc => pc.coverageId) Set'e dolduruluyor
//
// Backend sözleşmesi:
//   GET /api/Policies/police-detaylarini-getir/{id}
//        → Policy + Product.Coverages + PolicyCoverages
//   PUT /api/Policies/{id}/teklif-guncelle (TeklifGuncelleDto)
//        { startDate, endDate, productId, selectedCoverageIds }
//        Backend prim'i yeniden hesaplıyor.
//
// Not: Ürün değiştirilemiyor (UI olarak da göstermiyoruz). Kullanıcı ürünü
// değiştirmek isterse teklifi iptal edip yenisini açması gerekir.

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { RiskFormu } from "@/components/insurtech/RiskFormu";
import { FiyatBreakdownDetayli } from "@/components/insurtech/FiyatBreakdown";
import { useCanliFiyat, useRiskSemasi } from "@/components/insurtech/useCanliFiyat";
import {
    IconArrowLeft,
    IconArrowRight,
    IconCalendarEvent,
    IconCheck,
    IconLock,
    IconPlus,
    IconAlertTriangle,
    IconCar,
    IconHeartbeat,
    IconHome,
    IconPlane,
    IconShield,
    IconActivityHeartbeat,
    IconUsers,
} from "@tabler/icons-react";

// Yakınlık enum → okunabilir Türkçe etiket (düzenle sayfası için)
function duzenleYakinlikEtiket(y: string): string {
    const map: Record<string, string> = {
        Kendisi: "Kendiniz",
        Es: "Eşiniz",
        Anne: "Anneniz",
        Baba: "Babanız",
        Cocuk: "Çocuğunuz",
        Kardes: "Kardeşiniz",
        Diger: "Yakınınız",
    };
    return map[y] ?? y;
}

const API = "http://localhost:5156/api";

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface Coverage {
    id: number;
    coverageName: string;
    coveragePrice: number;
    isRequired: boolean;
}

interface ProductDetay {
    id: number;
    productName: string;
    price: number;
    canCustomStartDate?: boolean;
    allowedDurationsDays?: string;
    productCode?: string | null;     // Insurtech: hangi pricing strategy
    coverages?: Coverage[];
}

interface PolicyCoverageDetay {
    id: number;
    coverageId: number;
}

// Sigortalı kişi — düzenleme akışında SADECE OKUMA için gösterilir.
// Sigortalı değiştirilemez (farklı kişi = farklı risk profili = ayrı poliçe).
interface InsuredPersonDetay {
    id: number;
    adSoyad: string;
    yakinlik: string;
    dogumTarihi: string;
    tcKimlikNo: string;
}

interface PoliceDetay {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    status: string;
    productId: number;
    product?: ProductDetay;
    policyCoverages?: PolicyCoverageDetay[];
    insuredPerson?: InsuredPersonDetay | null;
    // Insurtech: kaydedilmiş risk verisi snapshot — JSON string.
    // Düzenleme açıldığında parse edilip form'a yeniden doldurulur.
    riskDataJson?: string | null;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function sureMetni(gun: number): { ust: string; alt: string } {
    if (gun === 365) return { ust: "12 ay", alt: "Yıllık" };
    if (gun === 730) return { ust: "24 ay", alt: "İki yıllık" };
    if (gun >= 28 && gun % 30 === 0) {
        const ay = gun / 30;
        return { ust: `${ay} ay`, alt: ay === 6 ? "Altı ay" : ay === 3 ? "Üç ay" : `${ay} aylık` };
    }
    if (gun >= 90 && gun <= 180) return { ust: `${Math.round(gun / 30)} ay`, alt: `${gun} gün` };
    return { ust: `${gun} gün`, alt: gun === 7 ? "Bir hafta" : gun === 14 ? "İki hafta" : `${gun} günlük` };
}

function urunIkonu(ad: string): React.ElementType {
    const a = ad.toLowerCase();
    if (a.includes("kasko") || a.includes("trafik")) return IconCar;
    if (a.includes("sağlık") || a.includes("saglik") || a.includes("tamamlayıcı") || a.includes("tamamlayici"))
        return IconHeartbeat;
    if (a.includes("dask") || a.includes("konut") || a.includes("ev")) return IconHome;
    if (a.includes("seyahat")) return IconPlane;
    return IconShield;
}

// ─── Ana sayfa ───────────────────────────────────────────────────────────────

export default function TeklifDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [police, setPolice] = useState<PoliceDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    const [sureGun, setSureGun] = useState<number>(365);
    const [secilenTeminatIdler, setSecilenTeminatIdler] = useState<Set<number>>(new Set());
    // Insurtech: risk parametreleri — backend'in döndürdüğü JSON snapshot'tan başlatılıyor
    const [riskDegerleri, setRiskDegerleri] = useState<Record<string, string>>({});

    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [kaydetHatasi, setKaydetHatasi] = useState("");

    // ─── Referrer-aware geri navigation ────────────────────────────────────
    // Kullanıcı bu sayfaya hangi yoldan geldiyse oraya dönsün.
    // document.referrer mount sırasında bir kez okunup state'e yazılıyor.
    const [geriEtiket, setGeriEtiket] = useState("Teklif Detayı");
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const ref = document.referrer || "";
            if (!ref) return;
            const refUrl = new URL(ref);
            if (refUrl.host !== window.location.host) return;
            const path = refUrl.pathname;
            if (path === `/dashboard/policeler/${id}`) setGeriEtiket("Teklif Detayı");
            else if (path === "/dashboard/policeler") setGeriEtiket("Poliçelerim");
            else setGeriEtiket("Geri");
        } catch {
            // sessizce default değer kullanılsın
        }
    }, [id]);

    const geriDon = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(`/dashboard/policeler/${id}`);
        }
    };

    // Risk şemasını çek + canlı fiyat
    const { sema: riskSemasi } = useRiskSemasi(police?.product?.productCode);
    const fiyatIstegi = useMemo(() => {
        if (!police?.product) return null;
        return {
            productId: police.product.id,
            selectedCoverageIds: Array.from(secilenTeminatIdler),
            riskParameters: riskDegerleri,
        };
    }, [police?.product, secilenTeminatIdler, riskDegerleri]);
    const { sonuc: fiyatSonucu, yukleniyor: fiyatYukleniyor } = useCanliFiyat(fiyatIstegi);

    // Detay verisini çek + state'leri pre-fill et
    useEffect(() => {
        const veriCek = async () => {
            try {
                const r = await fetch(`${API}/Policies/police-detaylarini-getir/${id}`, {
                    credentials: "include",
                });
                if (r.status === 401) {
                    window.location.href = "/";
                    return;
                }
                if (r.status === 404) {
                    setHata("Bu teklif bulunamadı.");
                    return;
                }
                if (!r.ok) throw new Error();
                const data: PoliceDetay = await r.json();

                // Status guard: sadece Teklif Bekliyor düzenlenebilir
                if (data.status !== "Teklif Bekliyor") {
                    setHata("Sadece henüz onaylanmamış teklifler düzenlenebilir.");
                    setPolice(data);
                    return;
                }

                // Süreyi gün cinsinden hesapla
                const baslangic = new Date(data.startDate);
                const bitis = new Date(data.endDate);
                const gun = Math.max(1, Math.round((bitis.getTime() - baslangic.getTime()) / (1000 * 60 * 60 * 24)));
                setSureGun(gun);

                // Mevcut seçili teminatları Set'e doldur
                const mevcutIdler = (data.policyCoverages ?? []).map((pc) => pc.coverageId);
                setSecilenTeminatIdler(new Set(mevcutIdler));

                // Insurtech: kaydedilmiş risk verilerini parse et ve form'a doldur.
                // Null/parse hatası durumunda boş bırak (kullanıcı yeniden girebilir).
                if (data.riskDataJson) {
                    try {
                        const parsed = JSON.parse(data.riskDataJson) as Record<string, string>;
                        setRiskDegerleri(parsed);
                    } catch {
                        setRiskDegerleri({});
                    }
                }

                setPolice(data);
            } catch {
                setHata("Teklif bilgileri yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        veriCek();
    }, [id]);

    // Kaydet — TeklifGuncelle endpoint'ine PUT
    const kaydet = async () => {
        if (!police) return;
        setKaydediliyor(true);
        setKaydetHatasi("");
        try {
            const baslangic = new Date(police.startDate);
            const bitis = new Date(baslangic);
            bitis.setDate(bitis.getDate() + sureGun);

            const body = {
                startDate: baslangic.toISOString(),
                endDate: bitis.toISOString(),
                productId: police.productId,
                selectedCoverageIds: Array.from(secilenTeminatIdler),
                // Insurtech: risk parametreleri — backend pricing strategy'ye iletilecek.
                // Boş objeyse null gönder (DASK/Trafik gibi şemasız ürünlerde gereksiz).
                riskParameters: Object.keys(riskDegerleri).length > 0 ? riskDegerleri : null,
            };

            const r = await fetch(`${API}/Policies/${id}/teklif-guncelle`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setKaydetHatasi(txt || "Teklif güncellenemedi. Lütfen tekrar deneyin.");
                return;
            }
            // Başarı: detaya geri dön
            router.push(`/dashboard/policeler/${id}`);
        } catch {
            setKaydetHatasi("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setKaydediliyor(false);
        }
    };

    // ─── Render: yüklenme/hata state'leri ─────────────────────────────────────
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

    if (hata || !police?.product) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <Link
                        href={`/dashboard/policeler/${id}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-6"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Detaya dön
                    </Link>
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                        <p className="text-white text-base font-semibold">{hata || "Bir şeyler ters gitti."}</p>
                        <p className="text-white/45 text-[13px] mt-1.5">
                            Teklif zaten onaylanmış veya iptal edilmiş olabilir.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Sayfa içeriği ────────────────────────────────────────────────────────
    const urun = police.product;
    const Icon = urunIkonu(urun.productName);
    const tumTeminatlar = urun.coverages ?? [];
    const zorunlular = tumTeminatlar.filter((c) => c.isRequired);
    const opsiyoneller = tumTeminatlar.filter((c) => !c.isRequired);

    // Backend'in döndürdüğü PricingResult'ı tek doğru kaynak alıyoruz —
    // risk çarpanı ve BSMV %5 zaten oraya dahil.
    const toplamPrim = fiyatSonucu?.total ?? urun.price;

    // Süre seçenekleri ürünün allowedDurationsDays'ından
    const sureSecenekler = (urun.allowedDurationsDays ?? "365")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);

    const baslangic = new Date(police.startDate);
    const bitis = new Date(baslangic);
    bitis.setDate(bitis.getDate() + sureGun);

    const toggleTeminat = (id: number, isRequired: boolean) => {
        if (isRequired) return;
        const yeni = new Set(secilenTeminatIdler);
        if (yeni.has(id)) yeni.delete(id);
        else yeni.add(id);
        setSecilenTeminatIdler(yeni);
    };

    return (
        <div className="min-h-full p-6 lg:p-8 pb-44 lg:pb-32">
            <div className="max-w-3xl mx-auto">
                {/* ── Geri linki + başlık ─────────────────────────────────────── */}
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
                        Teklifi Düzenle<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Süre ve teminatları değiştirebilirsin. Prim otomatik yeniden hesaplanır.
                    </p>
                </motion.div>

                {/* ── Ürün özeti şeridi ───────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-4"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                        <Icon className="w-5 h-5" style={{ color: "#cbd5e1" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">{urun.productName}</p>
                        <p className="text-white/40 text-[12px] mt-0.5 font-mono">{police.policyNumber}</p>
                    </div>
                    <span className="text-white/60 text-[12px] tabular-nums">
                        Baz {paraFormat(urun.price)}
                    </span>
                </motion.div>

                {/* ── Sigortalı kişi şeridi (read-only) ────────────────────────
                    Düzenleme akışında sigortalı değiştirilemez — değiştirmek
                    isterse kullanıcı bu poliçeyi iptal edip yenisini açmalı.
                    Bu şerit sadece "kim için yapılmış" hatırlatıcısı niteliğinde. */}
                {police.insuredPerson && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04, duration: 0.4 }}
                        className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-3"
                        style={{
                            background: "linear-gradient(135deg, rgba(226,232,240,0.04), rgba(148,163,184,0.02))",
                            border: "1px solid rgba(226,232,240,0.15)",
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(226,232,240,0.1)", border: "1px solid rgba(226,232,240,0.2)" }}
                        >
                            <IconUsers className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                                Sigortalı: {police.insuredPerson.adSoyad}
                            </p>
                            <p className="text-white/40 text-[11px] mt-0.5">
                                {duzenleYakinlikEtiket(police.insuredPerson.yakinlik)} — sigortalı kişi düzenlenmez
                            </p>
                        </div>
                        <IconLock className="w-3.5 h-3.5 text-white/30" />
                    </motion.div>
                )}

                {/* ── Süre seçimi ─────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.4 }}
                    className="rounded-2xl p-5 lg:p-6 mb-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <IconCalendarEvent className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                        <p className="text-white/85 text-sm font-semibold">Poliçe süresi</p>
                    </div>
                    <div
                        className={`grid gap-2 ${
                            sureSecenekler.length >= 4
                                ? "grid-cols-2 sm:grid-cols-4"
                                : sureSecenekler.length === 3
                                    ? "grid-cols-3"
                                    : sureSecenekler.length === 2
                                        ? "grid-cols-2"
                                        : "grid-cols-1"
                        }`}
                    >
                        {sureSecenekler.map((gun) => {
                            const secili = gun === sureGun;
                            const { ust, alt } = sureMetni(gun);
                            return (
                                <button
                                    key={gun}
                                    onClick={() => setSureGun(gun)}
                                    disabled={sureSecenekler.length === 1}
                                    className="relative rounded-xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-default"
                                    style={{
                                        background: secili
                                            ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                                            : "rgba(255,255,255,0.03)",
                                        border: secili
                                            ? "1px solid rgba(226,232,240,0.35)"
                                            : "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <p className="text-base font-bold tabular-nums" style={{ color: secili ? "#ffffff" : "rgba(255,255,255,0.75)" }}>
                                        {ust}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: secili ? "#cbd5e1" : "rgba(255,255,255,0.35)" }}>
                                        {alt}
                                    </p>
                                    {secili && (
                                        <span
                                            className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                                            style={{ background: "linear-gradient(135deg, #f8fafc, #cbd5e1)" }}
                                        >
                                            <IconCheck className="w-2.5 h-2.5" style={{ color: "#0f172a" }} strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-white/35 text-[11px] mt-3 tabular-nums">
                        {tarihFormat(baslangic)} → {tarihFormat(bitis)}
                    </p>
                </motion.div>

                {/* ── Teminat seçimi ──────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="rounded-2xl p-5 lg:p-6"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {zorunlular.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <IconLock className="w-3.5 h-3.5" style={{ color: "#cbd5e1" }} />
                                <p className="text-white/65 text-[13px] font-semibold uppercase tracking-wider">
                                    Zorunlu Teminatlar
                                </p>
                                <span className="text-white/30 text-[11px] ml-1">
                                    ({zorunlular.length} kalem — kaldırılamaz)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {zorunlular.map((c) => (
                                    <TeminatKart
                                        key={c.id}
                                        coverage={c}
                                        secili={true}
                                        kilitli={true}
                                        onToggle={() => {}}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {opsiyoneller.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <IconPlus className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.55)" }} />
                                <p className="text-white/65 text-[13px] font-semibold uppercase tracking-wider">
                                    Opsiyonel Teminatlar
                                </p>
                                <span className="text-white/30 text-[11px] ml-1">
                                    ({opsiyoneller.length} kalem — isteğe bağlı)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {opsiyoneller.map((c) => (
                                    <TeminatKart
                                        key={c.id}
                                        coverage={c}
                                        secili={secilenTeminatIdler.has(c.id)}
                                        kilitli={false}
                                        onToggle={() => toggleTeminat(c.id, false)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* ── Insurtech: Risk Bilgileri ───────────────────────────────
                    Kayıtlı RiskDataJson'dan pre-fill edildi; kullanıcı değerleri
                    güncelleyebilir. Her değişiklikte sticky bar canlı yenilenir. */}
                {riskSemasi.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.4 }}
                        className="rounded-2xl p-5 lg:p-6 mt-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <IconActivityHeartbeat className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                            <p className="text-white/85 text-sm font-semibold">Risk Bilgileri</p>
                            <span
                                className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded"
                                style={{
                                    background: "rgba(226,232,240,0.08)",
                                    color: "#cbd5e1",
                                    border: "1px solid rgba(226,232,240,0.18)",
                                }}
                            >
                                Canlı Tarife
                            </span>
                        </div>
                        <RiskFormu sema={riskSemasi} degerler={riskDegerleri} setDegerler={setRiskDegerleri} />
                    </motion.div>
                )}

                {/* ── Insurtech: Pricing breakdown (risk çarpanı varsa) ────── */}
                {fiyatSonucu && fiyatSonucu.breakdown.some((b) => b.category === "risk") && (
                    <div className="mt-5">
                        <FiyatBreakdownDetayli sonuc={fiyatSonucu} yukleniyor={fiyatYukleniyor} />
                    </div>
                )}

                {/* Hata satırı */}
                {kaydetHatasi && (
                    <div
                        className="mt-4 rounded-xl px-4 py-3 text-sm"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "rgb(252,165,165)",
                        }}
                    >
                        {kaydetHatasi}
                    </div>
                )}
            </div>

            {/* ── Sticky alt bar: toplam prim + Kaydet ─────────────────────── */}
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
                <div className="flex flex-col min-w-0">
                    <span className="text-white/45 text-[10px] uppercase tracking-wider font-medium">
                        Yeni Toplam Prim
                        {fiyatSonucu && fiyatSonucu.riskMultiplier !== 1 &&
                            ` (Risk ×${fiyatSonucu.riskMultiplier.toFixed(2)})`}
                    </span>
                    {fiyatYukleniyor && !fiyatSonucu ? (
                        <span className="text-white/40 text-xl font-semibold">Hesaplanıyor…</span>
                    ) : (
                        <motion.span
                            key={toplamPrim}
                            initial={{ opacity: 0.5, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-white text-xl font-bold tabular-nums"
                        >
                            {paraFormat(toplamPrim)}
                        </motion.span>
                    )}
                    {fiyatSonucu && (
                        <span className="text-white/35 text-[11px] mt-0.5 tabular-nums">
                            Baz {paraFormat(fiyatSonucu.basePrice)} + Tem {paraFormat(fiyatSonucu.coverageTotal)} + BSMV {paraFormat(fiyatSonucu.tax)}
                        </span>
                    )}
                </div>
                <button
                    onClick={kaydet}
                    disabled={kaydediliyor}
                    className="group/cta inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] flex-shrink-0 disabled:scale-100 disabled:opacity-60"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.45), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    {kaydediliyor ? (
                        <>
                            <span
                                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                            />
                            Kaydediliyor
                        </>
                    ) : (
                        <>
                            Değişiklikleri Kaydet
                            <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                        </>
                    )}
                </button>
            </motion.div>
        </div>
    );
}

// ─── Teminat satır kartı (teklif-al ile aynı görsel) ─────────────────────────
function TeminatKart({
    coverage, secili, kilitli, onToggle,
}: {
    coverage: Coverage; secili: boolean; kilitli: boolean; onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            disabled={kilitli}
            type="button"
            className="relative flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
                background: secili
                    ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                    : "rgba(255,255,255,0.02)",
                border: secili
                    ? "1px solid rgba(226,232,240,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                boxShadow: secili ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                opacity: kilitli ? 0.92 : 1,
            }}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                        background: secili
                            ? "linear-gradient(135deg, #f8fafc, #cbd5e1)"
                            : "rgba(255,255,255,0.05)",
                        border: secili
                            ? "1px solid rgba(226,232,240,0.5)"
                            : "1px solid rgba(255,255,255,0.12)",
                    }}
                >
                    {kilitli ? (
                        <IconLock className="w-3 h-3" style={{ color: "#0f172a" }} strokeWidth={3} />
                    ) : secili ? (
                        <IconCheck className="w-3 h-3" style={{ color: "#0f172a" }} strokeWidth={3} />
                    ) : null}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-white text-[13.5px] font-medium truncate">
                        {coverage.coverageName}
                    </p>
                    {kilitli && (
                        <p className="text-white/35 text-[11px] mt-0.5">
                            Bu ürün için zorunlu — kaldırılamaz
                        </p>
                    )}
                </div>
            </div>
            <span
                className="text-sm font-semibold tabular-nums flex-shrink-0"
                style={{ color: secili ? "#cbd5e1" : "rgba(255,255,255,0.5)" }}
            >
                + {paraFormat(coverage.coveragePrice)}
            </span>
        </button>
    );
}

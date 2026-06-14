"use client";

// ─── /dashboard/policeler/{id} ───────────────────────────────────────────────
// Tek poliçe / teklif detay sayfası.
//
// Backend: GET /api/Policies/police-detaylarini-getir/{id}
//   → Policy { ...alanlar, Customer, Product { ...alanlar, Coverages } }
//
// İki ana durum:
//   - Status === "Teklif Bekliyor"  → Sarı vurgu + "Ödemeyi tamamla" mock CTA
//   - Status === "Aktif Poliçe"     → Yeşil vurgu + "Hasar bildir" CTA (placeholder)
//
// Layout: tek kolon, geniş özet kartı + altında teminat listesi + müşteri bilgisi şeridi.

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { FiyatBreakdownDetayli } from "@/components/insurtech/FiyatBreakdown";
import { useCanliFiyat, useRiskSemasi } from "@/components/insurtech/useCanliFiyat";
import { OdemeModal } from "@/components/insurtech/OdemeModal";
import {
    IconArrowLeft,
    IconCalendarEvent,
    IconShieldCheck,
    IconClock,
    IconCar,
    IconHeartbeat,
    IconHome,
    IconPlane,
    IconShield,
    IconUser,
    IconUsers,
    IconMail,
    IconPhone,
    IconHash,
    IconAlertTriangle,
    IconArrowRight,
    IconPencil,
    IconTrash,
    IconLock,
    IconX,
    IconFileText,
    IconActivityHeartbeat,
    IconDownload,
    IconReceipt,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

// ─── Tipler — backend Policy + nested Customer/Product/Coverages ────────────

interface Coverage {
    id: number;
    coverageName: string;
    coveragePrice: number;
    isRequired?: boolean;
}

// Backend'den gelen PolicyCoverage join entity — bu poliçede seçilmiş teminatları içerir.
// Product.Coverages tüm seçenekleri içerir; biz seçili olanları göstermek istiyoruz.
interface PolicyCoverageDetay {
    id: number;
    coverageId: number;
    coverage?: Coverage;
}

interface ProductDetay {
    id: number;
    productName: string;
    productDescription?: string;
    price: number;
    productCode?: string | null;     // Insurtech: pricing strategy seçici
    coverages?: Coverage[];
}

// Hasar kaydı — sadece "Aktif Poliçe" durumundaki kayıtlarda gösteriliyor
interface HasarDetay {
    id: number;
    hasarTuru?: string;          // Faz I'de eklenen yeni alanlar — opsiyonel
    hasarTarihi?: string;        // backward compatibility
    claimDescription: string;
    claimDate: string;
    claimAmount: number;
    claimStatus: string;
}

interface CustomerDetay {
    id: number;
    adi: string;
    soyadi: string;
    email: string;
    telefonNo?: string;
    kimlikNo?: string;
}

// Sigortalı kişi (insured) — sigorta ettirenden farklı olabilir.
// Null ise sigortalı = sigorta ettirendir (kullanıcı kendisi için almış).
interface InsuredPersonDetay {
    id: number;
    adSoyad: string;
    tcKimlikNo: string;
    dogumTarihi: string;       // "YYYY-MM-DD"
    yakinlik: string;
    telefon?: string | null;
}

// Backend GET /Policies/{id}/odemeler endpoint'inden dönen ödeme kaydı
interface OdemeKaydi {
    id: number;
    tutar: number;
    islemTarihi: string;
    kartSon4: string;
    kartSahibi: string;
    durum: string;
    hataMesaji?: string | null;
    islemReferansi: string;
}

interface PoliceDetay {
    id: number;
    policyNumber: string;
    startDate: string;
    endDate: string;
    price: number;
    status: string;
    isActive: boolean;
    customer?: CustomerDetay;
    product?: ProductDetay;
    policyCoverages?: PolicyCoverageDetay[];
    insuredPerson?: InsuredPersonDetay | null;
    // Insurtech: poliçe oluşturulduğu anda kaydedilen risk verisi snapshot'ı.
    // Format: {"aracYili":"2020","motorGucuKw":"110","sehir":"İstanbul",...}
    // Null olabilir (eski kayıt veya DASK/Trafik gibi şemasız ürün).
    riskDataJson?: string | null;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

function gunFarki(a: Date, b: Date) {
    return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
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
// Next.js 16 — params artık Promise<{...}>, React.use() ile aç.
export default function PoliceDetayPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [police, setPolice] = useState<PoliceDetay | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    // İptal akışı için state'ler
    const [iptalModalAcik, setIptalModalAcik] = useState(false);
    const [iptalEdiliyor, setIptalEdiliyor] = useState(false);
    const [iptalHatasi, setIptalHatasi] = useState("");

    // Ödeme akışı için state — OdemeModal'ın açık/kapalı durumu
    const [odemeModalAcik, setOdemeModalAcik] = useState(false);

    // Hasar kayıtları (sadece Aktif Poliçe için çekilecek)
    const [hasarlar, setHasarlar] = useState<HasarDetay[]>([]);
    const [hasarYukleniyor, setHasarYukleniyor] = useState(false);

    // Ödeme kayıtları (Aktif Poliçe için makbuz linkleri)
    const [odemeler, setOdemeler] = useState<OdemeKaydi[]>([]);
    const [pdfIndiriliyor, setPdfIndiriliyor] = useState(false);

    // ─── Insurtech: kaydedilmiş risk verisi parsing + breakdown ──────────────
    // riskDataJson string'ini parse edip Record<string,string> elde ediyoruz.
    // Geçersiz JSON varsa (legacy/bozuk kayıt) sessiz fail — UI risk bölümünü gizliyor.
    const riskParametreleri = useMemo<Record<string, string> | null>(() => {
        if (!police?.riskDataJson) return null;
        try {
            return JSON.parse(police.riskDataJson) as Record<string, string>;
        } catch {
            return null;
        }
    }, [police?.riskDataJson]);

    // Bu poliçenin pricing'ini yeniden hesaplamak için backend'e gidiyoruz —
    // breakdown göstermek istiyoruz, onu yerel hesaplayamayız (risk çarpanları
    // KaskoPricingStrategy.cs'de gömülü). Bu read-only bir reproduction.
    const { sema: riskSemasi } = useRiskSemasi(police?.product?.productCode);

    const fiyatIstegi = useMemo(() => {
        if (!police?.product || !riskParametreleri) return null;
        if (!police.policyCoverages || police.policyCoverages.length === 0) return null;
        return {
            productId: police.product.id,
            selectedCoverageIds: police.policyCoverages.map((pc) => pc.coverageId),
            riskParameters: riskParametreleri,
        };
    }, [police, riskParametreleri]);

    const { sonuc: fiyatSonucu, yukleniyor: fiyatYukleniyor } = useCanliFiyat(fiyatIstegi, 0);

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
                    setHata("Bu poliçe bulunamadı veya size ait değil.");
                    return;
                }
                if (!r.ok) throw new Error();
                const data: PoliceDetay = await r.json();
                setPolice(data);
            } catch {
                setHata("Poliçe detayları yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        veriCek();
    }, [id]);

    // Aktif Poliçe ise hasar kayıtlarını ayrı endpoint'ten çek
    useEffect(() => {
        if (!police || police.status !== "Aktif Poliçe") return;
        const hasarCek = async () => {
            setHasarYukleniyor(true);
            try {
                const r = await fetch(`${API}/Claims/policeye-ait-hasarlari-getir/${id}`, {
                    credentials: "include",
                });
                if (!r.ok) return;
                const data = await r.json();
                // Endpoint iki şekilde dönebiliyor:
                //  - Hasar varsa: Claim[] (direkt array)
                //  - Yoksa: { Mesaj, Hasarlar: [] } (object)
                if (Array.isArray(data)) {
                    setHasarlar(data);
                } else if (data && Array.isArray(data.hasarlar)) {
                    setHasarlar(data.hasarlar);
                }
            } catch {
                // Sessiz fail — hasar bölümü zaten opsiyonel
            } finally {
                setHasarYukleniyor(false);
            }
        };
        hasarCek();
    }, [police, id]);

    // Aktif Poliçe ise ödeme listesini çek (makbuz linkleri için)
    useEffect(() => {
        if (!police || police.status !== "Aktif Poliçe") return;
        const odemeCek = async () => {
            try {
                const r = await fetch(`${API}/Policies/${id}/odemeler`, {
                    credentials: "include",
                });
                if (!r.ok) return;
                const data = await r.json();
                if (Array.isArray(data)) setOdemeler(data);
            } catch {
                // Sessiz fail — ödeme bölümü opsiyonel
            }
        };
        odemeCek();
    }, [police, id]);

    // ─── PDF indirme helper'ları ─────────────────────────────────────────────
    // fetch() ile blob alıp <a download> ile tetikliyoruz.
    // Niye direct <a href={url}> kullanmıyoruz: cookie-based auth için fetch
    // credentials:"include" şart; tarayıcı <a> tagı ile href'e gidince cookie
    // genelde otomatik gider ama Next.js dev modunda cross-port (3000→5156)
    // SameSite davranışı flaky — fetch ile manuel kontrol daha güvenilir.
    const indirPdf = async (url: string, dosyaAdi: string) => {
        setPdfIndiriliyor(true);
        try {
            const r = await fetch(url, { credentials: "include" });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                alert(txt || "PDF indirilemedi.");
                return;
            }
            const blob = await r.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = dosyaAdi;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Memory leak önleme — blob URL'leri serbest bırak
            URL.revokeObjectURL(blobUrl);
        } catch {
            alert("Bağlantı hatası.");
        } finally {
            setPdfIndiriliyor(false);
        }
    };

    const indirPolicePdf = () =>
        indirPdf(`${API}/Policies/${id}/pdf`, `police_${police?.policyNumber ?? id}.pdf`);

    const indirMakbuz = (paymentId: number, islemRef: string) =>
        indirPdf(
            `${API}/Policies/${id}/odeme/${paymentId}/makbuz`,
            `makbuz_${islemRef}.pdf`
        );

    // Teklifi iptal et — backend self-cancel endpoint'ini çağır
    const teklifiIptalEt = async () => {
        setIptalEdiliyor(true);
        setIptalHatasi("");
        try {
            const r = await fetch(`${API}/Policies/${id}/teklifimi-iptal-et`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setIptalHatasi(txt || "Teklif iptal edilemedi. Lütfen tekrar deneyin.");
                return;
            }
            // Başarı: liste sayfasına dön
            router.push("/dashboard/policeler");
        } catch {
            setIptalHatasi("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setIptalEdiliyor(false);
        }
    };

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

    if (hata || !police) {
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
                            background: "rgba(239,68,68,0.05)",
                            border: "1px solid rgba(239,68,68,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <p className="text-white text-base font-semibold">{hata || "Bir şeyler ters gitti."}</p>
                        <p className="text-white/45 text-[13px] mt-1.5">
                            Listeye dönüp tekrar deneyebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const teklif = police.status === "Teklif Bekliyor";
    const aktif = police.status === "Aktif Poliçe";
    const Icon = urunIkonu(police.product?.productName ?? "");
    const baslangic = new Date(police.startDate);
    const bitis = new Date(police.endDate);
    const toplamGun = gunFarki(baslangic, bitis);
    const kalan = gunFarki(new Date(), bitis);
    const ilerleme = toplamGun > 0 ? Math.min(100, Math.max(0, ((toplamGun - kalan) / toplamGun) * 100)) : 0;

    // Durum bazlı renk paleti
    const renk = teklif
        ? { glow: "rgba(245,158,11,0.18)", chip: "rgba(245,158,11,0.12)", chipBorder: "rgba(245,158,11,0.3)", chipText: "rgb(252,211,77)", iconBg: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))", iconBorder: "rgba(245,158,11,0.3)", iconColor: "rgb(252,211,77)" }
        : aktif
            ? { glow: "rgba(16,185,129,0.18)", chip: "rgba(16,185,129,0.12)", chipBorder: "rgba(16,185,129,0.3)", chipText: "rgb(110,231,183)", iconBg: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))", iconBorder: "rgba(16,185,129,0.3)", iconColor: "rgb(110,231,183)" }
            : { glow: "rgba(148,163,184,0.15)", chip: "rgba(255,255,255,0.05)", chipBorder: "rgba(255,255,255,0.1)", chipText: "rgba(255,255,255,0.6)", iconBg: "rgba(255,255,255,0.04)", iconBorder: "rgba(255,255,255,0.08)", iconColor: "#cbd5e1" };

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                {/* ── Geri linki ──────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-5"
                >
                    <Link
                        href="/dashboard/policeler"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Poliçelerim
                    </Link>
                </motion.div>

                {/* ── Ana özet kartı ──────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-2xl overflow-hidden relative"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                        backdropFilter: "blur(8px)",
                    }}
                >
                    {/* Durum rengine bağlı arka glow */}
                    <div
                        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
                        style={{ background: `radial-gradient(ellipse, ${renk.glow}, transparent 70%)` }}
                    />

                    {/* Üst: ürün banner'ı */}
                    <div
                        className="relative px-6 lg:px-8 py-6 flex items-start gap-4"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{
                                background: renk.iconBg,
                                border: `1px solid ${renk.iconBorder}`,
                            }}
                        >
                            <Icon className="w-6 h-6" style={{ color: renk.iconColor }} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-white text-xl lg:text-2xl font-bold tracking-tight">
                                    {police.product?.productName ?? "Sigorta Ürünü"}
                                </h1>
                                <span
                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                                    style={{
                                        background: renk.chip,
                                        border: `1px solid ${renk.chipBorder}`,
                                        color: renk.chipText,
                                    }}
                                >
                                    {teklif ? <IconClock className="w-3 h-3" /> : <IconShieldCheck className="w-3 h-3" />}
                                    {police.status}
                                </span>
                            </div>
                            {police.product?.productDescription && (
                                <p className="text-white/45 text-[13px]">{police.product.productDescription}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <IconHash className="w-3.5 h-3.5 text-white/35" />
                                <span className="text-white/55 text-[12px] font-mono tabular-nums tracking-wide">
                                    {police.policyNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Orta: tarih şeridi + ilerleme barı */}
                    <div className="px-6 lg:px-8 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <BilgiKutu baslik="Başlangıç" deger={tarihFormat(baslangic)} Icon={IconCalendarEvent} />
                            <BilgiKutu baslik="Bitiş"      deger={tarihFormat(bitis)}     Icon={IconCalendarEvent} />
                            <BilgiKutu
                                baslik={teklif ? "Toplam süre" : "Kalan süre"}
                                deger={teklif ? `${toplamGun} gün` : `${kalan} gün`}
                                Icon={IconClock}
                                vurgu
                            />
                        </div>

                        {/* Aktif poliçe için ilerleme barı */}
                        {aktif && (
                            <div>
                                <div className="flex items-center justify-between text-[11px] text-white/45 mb-1.5">
                                    <span>Geçerlilik ilerlemesi</span>
                                    <span className="tabular-nums">%{Math.round(ilerleme)}</span>
                                </div>
                                <div
                                    className="h-1.5 rounded-full overflow-hidden"
                                    style={{ background: "rgba(255,255,255,0.05)" }}
                                >
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${ilerleme}%` }}
                                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: "linear-gradient(90deg, #f8fafc, #cbd5e1, #94a3b8)",
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Alt: fiyat + aksiyon butonu */}
                    <div
                        className="px-6 lg:px-8 py-5 flex items-center justify-between gap-4 flex-wrap"
                        style={{
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.02)",
                        }}
                    >
                        <div>
                            <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">
                                {teklif ? "Teklif Tutarı" : "Yıllık Prim"}
                            </p>
                            <p className="text-white text-2xl font-bold tabular-nums mt-0.5">
                                {paraFormat(police.price)}
                            </p>
                        </div>

                        {teklif && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Birincil aksiyon: ödeme — modal açılır, kart bilgileri alınır,
                                    backend mock payment service ile işlenir, başarılıysa Status
                                    "Aktif Poliçe"e dönüşür ve sayfa yenilenir. */}
                                <button
                                    onClick={() => setOdemeModalAcik(true)}
                                    className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                                    style={{
                                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                        color: "#0f172a",
                                        boxShadow:
                                            "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                        border: "1px solid rgba(226,232,240,0.5)",
                                    }}
                                >
                                    Ödemeyi tamamla
                                    <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                                </button>

                                {/* İkincil: teklifi düzenle — süre/teminat değişikliği için ayrı sayfaya gider */}
                                <Link
                                    href={`/dashboard/policeler/${police.id}/duzenle`}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transition-colors"
                                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                >
                                    <IconPencil className="w-4 h-4" />
                                    Düzenle
                                </Link>

                                {/* Tehlikeli aksiyon: iptal — confirmation modalı açılır */}
                                <button
                                    onClick={() => setIptalModalAcik(true)}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                                    style={{
                                        color: "rgb(252,165,165)",
                                        background: "rgba(239,68,68,0.06)",
                                        border: "1px solid rgba(239,68,68,0.2)",
                                    }}
                                >
                                    <IconTrash className="w-4 h-4" />
                                    İptal et
                                </button>
                            </div>
                        )}

                        {aktif && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <Link
                                    href={`/dashboard/hasar-olustur/${police.id}`}
                                    className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#ffffff",
                                    }}
                                >
                                    <IconAlertTriangle className="w-4 h-4" />
                                    Hasar bildir
                                </Link>
                                {/* Poliçe PDF'ini indir — yasal/regülasyon belge çıktısı */}
                                <button
                                    type="button"
                                    onClick={indirPolicePdf}
                                    disabled={pdfIndiriliyor}
                                    className="group/cta inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#ffffff",
                                    }}
                                    title="Poliçenizi PDF olarak indirin"
                                >
                                    {pdfIndiriliyor ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#fff", borderTopColor: "transparent" }} />
                                            Hazırlanıyor
                                        </>
                                    ) : (
                                        <>
                                            <IconDownload className="w-4 h-4" />
                                            PDF İndir
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ── Seçili teminatlar ───────────────────────────────────────
                    PolicyCoverages tablosundan gelen — bu poliçede gerçekten
                    seçilmiş teminatlar (ürünün TÜM teminatları değil). Backend
                    PoliceDetaylariniGetir endpoint'i Include zinciriyle dolduruyor. */}
                {police.policyCoverages && police.policyCoverages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="mt-5"
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <h2 className="text-white/85 text-sm font-semibold">
                                Seçili teminatlar
                                <span className="text-white/35 font-normal ml-2">
                                    ({police.policyCoverages.length} kalem)
                                </span>
                            </h2>
                            <span className="text-white/35 text-[11px] tabular-nums">
                                Ürün bazı: {paraFormat(police.product?.price ?? 0)}
                            </span>
                        </div>
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            {police.policyCoverages.map((pc, i) => {
                                const c = pc.coverage;
                                if (!c) return null;
                                return (
                                    <div
                                        key={pc.id}
                                        className="px-5 lg:px-6 py-3.5 flex items-center justify-between gap-4"
                                        style={{
                                            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                                        }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: c.isRequired
                                                        ? "linear-gradient(135deg, rgba(226,232,240,0.12), rgba(148,163,184,0.06))"
                                                        : "rgba(226,232,240,0.06)",
                                                    border: c.isRequired
                                                        ? "1px solid rgba(226,232,240,0.25)"
                                                        : "1px solid rgba(226,232,240,0.12)",
                                                }}
                                            >
                                                {c.isRequired ? (
                                                    <IconLock className="w-3.5 h-3.5" style={{ color: "#cbd5e1" }} />
                                                ) : (
                                                    <IconShieldCheck className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-white/85 text-[13px] font-medium truncate block">
                                                    {c.coverageName}
                                                </span>
                                                {c.isRequired && (
                                                    <span className="text-white/35 text-[10px] uppercase tracking-wider">
                                                        Zorunlu
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-white/65 text-[12px] tabular-nums flex-shrink-0 font-medium">
                                            + {paraFormat(c.coveragePrice)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-white/30 text-[11px] mt-2 px-1 leading-relaxed">
                            * Toplam prim = ürün baz fiyatı + seçili teminat ücretleri + risk düzeltmesi + BSMV.
                        </p>
                    </motion.div>
                )}

                {/* ── Insurtech: Beyan edilen risk bilgileri (read-only) ──────
                    Poliçe oluşturulduğu anda kaydedilen RiskDataJson'ı parse edip
                    okunabilir etiket-değer çiftleri olarak gösteriyoruz. Reproducibility
                    ve audit için kritik: kullanıcı "ben bunu öyle beyan etmiştim" diyebilir,
                    biz "evet öyle" diye kanıt gösterebiliriz. */}
                {riskParametreleri && Object.keys(riskParametreleri).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14, duration: 0.4 }}
                        className="mt-5"
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <h2 className="text-white/85 text-sm font-semibold flex items-center gap-2">
                                <IconActivityHeartbeat className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                Beyan Edilen Risk Bilgileri
                            </h2>
                            <span className="text-white/30 text-[11px]">
                                Teklif anında kaydedildi
                            </span>
                        </div>
                        <div
                            className="rounded-2xl p-5 lg:p-6"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(riskParametreleri).map(([key, val]) => {
                                    // Şemadan label/option-label çevirimi yapıyoruz; yoksa raw key/val.
                                    const alan = riskSemasi.find((p) => p.key === key);
                                    const etiket = alan?.label ?? key;
                                    let okunabilirVal = val;
                                    if (alan?.options) {
                                        const opt = alan.options.find((o) => o.value === val);
                                        if (opt) okunabilirVal = opt.label;
                                    }
                                    return (
                                        <div
                                            key={key}
                                            className="rounded-xl px-3.5 py-2.5"
                                            style={{
                                                background: "rgba(255,255,255,0.02)",
                                                border: "1px solid rgba(255,255,255,0.05)",
                                            }}
                                        >
                                            <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">
                                                {etiket}
                                            </p>
                                            <p className="text-white/85 text-[13px] font-medium tabular-nums mt-0.5">
                                                {okunabilirVal || "—"}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-white/30 text-[11px] mt-4 leading-relaxed">
                                Bu beyanlar, primizinin hesaplanmasında kullanıldı. Yanlış beyan,
                                hasar anında poliçenin geçersiz sayılmasına yol açabilir.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Insurtech: Pricing breakdown (yeniden hesaplanmış) ──────
                    Poliçenin DB'deki Price'ı sabit; ama kullanıcı "neden bu fiyat"
                    sorusunu sorduğunda backend'e gidip breakdown alıyoruz. Risk
                    çarpanı, BSMV gibi kalemler tek bakışta görünüyor. */}
                {fiyatSonucu && fiyatSonucu.breakdown.some((b) => b.category === "risk") && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16, duration: 0.4 }}
                        className="mt-5"
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <h2 className="text-white/85 text-sm font-semibold">
                                Prim Hesaplama Detayı
                            </h2>
                            <span className="text-white/30 text-[11px]">
                                Aktüeryal döküm
                            </span>
                        </div>
                        <FiyatBreakdownDetayli sonuc={fiyatSonucu} yukleniyor={fiyatYukleniyor} />
                    </motion.div>
                )}

                {/* ── Hasar Kayıtları (sadece Aktif Poliçe) ───────────────────
                    Hasar kaydı sadece poliçeleştirilmiş kayıtlarda olabilir.
                    Teklif aşamasındaki kayıtlar için bu bölüm hiç render edilmez. */}
                {aktif && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.4 }}
                        className="mt-5"
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <h2 className="text-white/85 text-sm font-semibold flex items-center gap-2">
                                <IconFileText className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                Hasar Kayıtları
                                {!hasarYukleniyor && hasarlar.length > 0 && (
                                    <span className="text-white/35 font-normal">
                                        ({hasarlar.length})
                                    </span>
                                )}
                            </h2>
                            <Link
                                href={`/dashboard/hasar-olustur/${police.id}`}
                                className="text-[12px] text-white/55 hover:text-white/90 transition-colors inline-flex items-center gap-1"
                            >
                                + Yeni Hasar Bildir
                            </Link>
                        </div>

                        {hasarYukleniyor ? (
                            <div
                                className="rounded-2xl px-5 py-6 flex items-center justify-center"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                }}
                            >
                                <div
                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                                />
                            </div>
                        ) : hasarlar.length === 0 ? (
                            <div
                                className="rounded-2xl px-5 py-6 text-center"
                                style={{
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px dashed rgba(255,255,255,0.08)",
                                }}
                            >
                                <p className="text-white/55 text-[13px]">
                                    Bu poliçeye ait henüz bir hasar kaydı bulunmuyor.
                                </p>
                                <p className="text-white/30 text-[11px] mt-1">
                                    İhtiyaç halinde yukarıdan yeni hasar bildirebilirsiniz.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                }}
                            >
                                {hasarlar.map((h, i) => (
                                    <Link
                                        key={h.id}
                                        href={`/dashboard/hasarlarim/${h.id}`}
                                        className="group/hasar block px-5 lg:px-6 py-4 flex items-start justify-between gap-4 transition-colors hover:bg-white/[0.02]"
                                        style={{
                                            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span
                                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                                    style={{
                                                        background: "rgba(226,232,240,0.08)",
                                                        color: "#cbd5e1",
                                                        border: "1px solid rgba(226,232,240,0.18)",
                                                    }}
                                                >
                                                    {h.claimStatus}
                                                </span>
                                                <span className="text-white/55 text-[11px] font-medium">
                                                    {h.hasarTuru ?? "Hasar"}
                                                </span>
                                                <span className="text-white/35 text-[11px] tabular-nums">
                                                    {tarihFormat(new Date(h.claimDate))}
                                                </span>
                                            </div>
                                            <p className="text-white/85 text-[13px] mt-1 leading-snug line-clamp-1">
                                                {h.claimDescription}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-white text-sm font-semibold tabular-nums">
                                                {paraFormat(h.claimAmount)}
                                            </span>
                                            <IconArrowRight className="w-4 h-4 text-white/30 transition-all group-hover/hasar:text-white/80 group-hover/hasar:translate-x-0.5" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── Ödeme Geçmişi (sadece Aktif Poliçe) ─────────────────────
                    Bu poliçe için yapılmış ödemelerin listesi. Her başarılı ödeme
                    için "Makbuz" butonu var — PDF indirir. Failed denemeler de
                    listede ama makbuzları "Reddedildi" durumlu olur. */}
                {aktif && odemeler.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22, duration: 0.4 }}
                        className="mt-5"
                    >
                        <div className="flex items-baseline justify-between mb-3 px-1">
                            <h2 className="text-white/85 text-sm font-semibold flex items-center gap-2">
                                <IconReceipt className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                Ödeme Geçmişi
                                <span className="text-white/35 font-normal">({odemeler.length})</span>
                            </h2>
                        </div>
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            {odemeler.map((o, i) => {
                                const basarili = o.durum === "Başarılı";
                                return (
                                    <div
                                        key={o.id}
                                        className="px-5 lg:px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
                                        style={{
                                            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span
                                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                                    style={{
                                                        background: basarili
                                                            ? "rgba(16,185,129,0.12)"
                                                            : "rgba(239,68,68,0.12)",
                                                        border: basarili
                                                            ? "1px solid rgba(16,185,129,0.3)"
                                                            : "1px solid rgba(239,68,68,0.3)",
                                                        color: basarili
                                                            ? "rgb(110,231,183)"
                                                            : "rgb(252,165,165)",
                                                    }}
                                                >
                                                    {o.durum}
                                                </span>
                                                <span className="text-white/35 text-[11px] font-mono tabular-nums">
                                                    {o.islemReferansi}
                                                </span>
                                                <span className="text-white/35 text-[11px]">
                                                    {tarihFormat(new Date(o.islemTarihi))}
                                                </span>
                                            </div>
                                            <p className="text-white/65 text-[12px] mt-0.5">
                                                **** **** **** {o.kartSon4}
                                                {" · "}
                                                {o.kartSahibi}
                                                {o.hataMesaji && ` · ${o.hataMesaji}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-white text-sm font-semibold tabular-nums">
                                                {paraFormat(o.tutar)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => indirMakbuz(o.id, o.islemReferansi)}
                                                disabled={pdfIndiriliyor}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                                                style={{
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: "1px solid rgba(255,255,255,0.08)",
                                                    color: "rgba(255,255,255,0.85)",
                                                }}
                                                title="Makbuz PDF'ini indir"
                                            >
                                                <IconDownload className="w-3 h-3" />
                                                Makbuz
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ── İptal onay modalı (Teklif Bekliyor) ─────────────────────
                    Inline render — backdrop + dialog tek block. AnimatePresence ile
                    açılış/kapanış animasyonu. ESC key handler eklenebilir ileride. */}
                <AnimatePresence>
                    {iptalModalAcik && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !iptalEdiliyor && setIptalModalAcik(false)}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            style={{ background: "rgba(2,6,16,0.65)", backdropFilter: "blur(6px)" }}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 12, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.95, y: 8, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                onClick={(e) => e.stopPropagation()}
                                className="relative w-full max-w-md rounded-2xl overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,16,0.95))",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
                                }}
                            >
                                {/* Kapat X */}
                                <button
                                    onClick={() => !iptalEdiliyor && setIptalModalAcik(false)}
                                    disabled={iptalEdiliyor}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>

                                {/* Uyarı ikonu + başlık */}
                                <div className="px-6 pt-7 pb-4 text-center">
                                    <div
                                        className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                                        style={{
                                            background: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(220,38,38,0.08))",
                                            border: "1px solid rgba(239,68,68,0.3)",
                                        }}
                                    >
                                        <IconAlertTriangle className="w-6 h-6 text-red-400" />
                                    </div>
                                    <h3 className="text-white text-lg font-bold tracking-tight">
                                        Teklifi iptal etmek istediğine emin misin?
                                    </h3>
                                    <p className="text-white/55 text-[13px] mt-2 leading-relaxed">
                                        Bu işlem geri alınamaz. <span className="font-mono text-white/75">{police.policyNumber}</span> numaralı teklifin sistemden iptal edilecek.
                                    </p>
                                </div>

                                {/* Hata satırı (varsa) */}
                                {iptalHatasi && (
                                    <div className="mx-6 mb-3 rounded-xl px-4 py-2.5 text-[12px]"
                                        style={{
                                            background: "rgba(239,68,68,0.08)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            color: "rgb(252,165,165)",
                                        }}
                                    >
                                        {iptalHatasi}
                                    </div>
                                )}

                                {/* Aksiyonlar */}
                                <div
                                    className="px-6 py-4 flex items-center gap-2 justify-end"
                                    style={{
                                        borderTop: "1px solid rgba(255,255,255,0.06)",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <button
                                        onClick={() => setIptalModalAcik(false)}
                                        disabled={iptalEdiliyor}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={teklifiIptalEt}
                                        disabled={iptalEdiliyor}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:scale-100 disabled:opacity-60"
                                        style={{
                                            background: "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))",
                                            color: "#ffffff",
                                            border: "1px solid rgba(239,68,68,0.5)",
                                            boxShadow: "0 10px 24px -8px rgba(239,68,68,0.4)",
                                        }}
                                    >
                                        {iptalEdiliyor ? (
                                            <>
                                                <span
                                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                    style={{ borderColor: "#ffffff", borderTopColor: "transparent" }}
                                                />
                                                İptal ediliyor
                                            </>
                                        ) : (
                                            <>
                                                <IconTrash className="w-4 h-4" />
                                                Evet, iptal et
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Ödeme Modalı ─────────────────────────────────────────────
                    Mock payment akışı. Kart bilgileri alınır, MockPaymentService
                    Luhn + simulated delay ile işler, sonuç başarılıysa Policy
                    Status "Aktif Poliçe"e dönüşür. Modal başarı ekranını gösterip
                    2 saniye sonra sayfayı yeniler — kullanıcı durumun değiştiğini
                    UI'da görür. */}
                <OdemeModal
                    acik={odemeModalAcik}
                    onKapat={() => setOdemeModalAcik(false)}
                    onBasarili={() => {
                        setOdemeModalAcik(false);
                        // Sayfayı yenile — Policy Status DB'de değişti, taze veri çekelim
                        router.refresh();
                        window.location.reload();
                    }}
                    policyId={police.id}
                    tutar={police.price}
                    policyNumber={police.policyNumber}
                    urunAdi={police.product?.productName ?? "Sigorta Ürünü"}
                />

                {/* ── Sigorta Ettiren (primi ödeyen, sözleşme sahibi) ───────── */}
                {police.customer && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.4 }}
                        className="mt-5 rounded-2xl px-5 lg:px-6 py-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <IconUser className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                            <h2 className="text-white/85 text-sm font-semibold">Sigorta Ettiren</h2>
                            <span className="text-white/35 text-[11px] ml-auto">Primi ödeyen taraf</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <KisiSatir
                                Icon={IconUser}
                                etiket="Ad Soyad"
                                deger={`${police.customer.adi} ${police.customer.soyadi}`}
                            />
                            <KisiSatir Icon={IconMail} etiket="E-posta" deger={police.customer.email} />
                            {police.customer.telefonNo && (
                                <KisiSatir Icon={IconPhone} etiket="Telefon" deger={police.customer.telefonNo} />
                            )}
                            {police.customer.kimlikNo && (
                                <KisiSatir
                                    Icon={IconHash}
                                    etiket="TC Kimlik No"
                                    deger={`${police.customer.kimlikNo.slice(0, 3)}******${police.customer.kimlikNo.slice(-2)}`}
                                />
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ── Sigortalı (risk taşıyıcı) — sigorta ettirenden farklıysa ─
                    insuredPerson null ise sigortalı = sigorta ettiren; o zaman
                    bu bölümü göstermiyoruz (yukarıdaki kart yeterli).
                    Doluysa ayrı bir kart açıyoruz; rozet ile yakınlık derecesi de görünür. */}
                {police.insuredPerson && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.4 }}
                        className="mt-5 rounded-2xl px-5 lg:px-6 py-5 relative overflow-hidden"
                        style={{
                            background: "linear-gradient(135deg, rgba(226,232,240,0.06), rgba(148,163,184,0.02))",
                            border: "1px solid rgba(226,232,240,0.18)",
                        }}
                    >
                        <div
                            className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(226,232,240,0.08), transparent 70%)" }}
                        />
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-3">
                                <IconUsers className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                <h2 className="text-white text-sm font-semibold">Sigortalı</h2>
                                <span
                                    className="ml-auto inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded"
                                    style={{
                                        background: "rgba(226,232,240,0.12)",
                                        color: "#cbd5e1",
                                        border: "1px solid rgba(226,232,240,0.25)",
                                    }}
                                >
                                    {yakinlikEtiket(police.insuredPerson.yakinlik)}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <KisiSatir
                                    Icon={IconUser}
                                    etiket="Ad Soyad"
                                    deger={police.insuredPerson.adSoyad}
                                />
                                <KisiSatir
                                    Icon={IconCalendarEvent}
                                    etiket="Doğum Tarihi"
                                    deger={`${tarihFormat(new Date(police.insuredPerson.dogumTarihi))} (${hesaplaYas(police.insuredPerson.dogumTarihi)} yaş)`}
                                />
                                {police.insuredPerson.telefon && (
                                    <KisiSatir
                                        Icon={IconPhone}
                                        etiket="Telefon"
                                        deger={police.insuredPerson.telefon}
                                    />
                                )}
                                <KisiSatir
                                    Icon={IconHash}
                                    etiket="TC Kimlik No"
                                    deger={`${police.insuredPerson.tcKimlikNo.slice(0, 3)}******${police.insuredPerson.tcKimlikNo.slice(-2)}`}
                                />
                            </div>
                            <p className="text-white/40 text-[11px] mt-3 leading-relaxed">
                                Bu poliçe primi sigorta ettiren tarafından ödenir, ancak risk bu kişi üzerindedir.
                                Hasar/talep durumunda yine sigorta ettirenle iletişim kurulur.
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// Backend "Es"/"Anne"/"Cocuk" → ekrana "Eşim"/"Annem"/"Çocuğum" çevirisi
function yakinlikEtiket(y: string): string {
    const map: Record<string, string> = {
        Kendisi: "Kendim",
        Es: "Eşim",
        Anne: "Annem",
        Baba: "Babam",
        Cocuk: "Çocuğum",
        Kardes: "Kardeşim",
        Diger: "Yakınım",
    };
    return map[y] ?? y;
}

function hesaplaYas(dogumTarihi: string): number {
    const d = new Date(dogumTarihi);
    const bugun = new Date();
    let yas = bugun.getFullYear() - d.getFullYear();
    const m = bugun.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && bugun.getDate() < d.getDate())) yas--;
    return Math.max(0, yas);
}

// ─── Küçük yardımcı bileşenler ───────────────────────────────────────────────

function BilgiKutu({
    baslik, deger, Icon, vurgu = false,
}: {
    baslik: string; deger: string; Icon: React.ElementType; vurgu?: boolean;
}) {
    return (
        <div
            className="rounded-xl px-4 py-3.5"
            style={{
                background: vurgu
                    ? "linear-gradient(135deg, rgba(226,232,240,0.06), rgba(148,163,184,0.02))"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${vurgu ? "rgba(226,232,240,0.18)" : "rgba(255,255,255,0.06)"}`,
            }}
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: vurgu ? "#e2e8f0" : "rgba(255,255,255,0.4)" }} />
                <p
                    className="text-[11px] uppercase tracking-wider font-medium"
                    style={{ color: vurgu ? "#cbd5e1" : "rgba(255,255,255,0.4)" }}
                >
                    {baslik}
                </p>
            </div>
            <p className={`text-base font-semibold tabular-nums ${vurgu ? "text-white" : "text-white/80"}`}>
                {deger}
            </p>
        </div>
    );
}

function KisiSatir({ Icon, etiket, deger }: { Icon: React.ElementType; etiket: string; deger: string }) {
    return (
        <div
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.03)" }}
            >
                <Icon className="w-3.5 h-3.5" style={{ color: "rgba(203,213,225,0.7)" }} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-white/35 font-medium">{etiket}</p>
                <p className="text-white/85 text-[13px] font-medium truncate">{deger}</p>
            </div>
        </div>
    );
}

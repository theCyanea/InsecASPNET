"use client";

// ─── /dashboard/teklif-al ────────────────────────────────────────────────────
// Insurtech akışı — 7 adımlı dinamik teklif oluşturma:
//   1) Ürün seç (FlowingMenu ile kasko/trafik/sağlık vs.)
//   2) Sigortalı kişi (kendisi / mevcut yakın / yeni yakın ekle)
//   3) Süre belirle (ürünün izin verdiği gün seçenekleri)
//   4) Teminat seç (zorunlulu otomatik+kilitli, opsiyoneller toggle'lanabilir)
//   5) Risk Bilgileri (ürünün ProductCode'una göre dinamik form — şema boşsa
//                     otomatik atlanır: DASK/Trafik için 6'ya direkt geçer)
//   6) Özet + onay → backend'e POST → başarı ekranı
//   7) Başarı
//
// Backend sözleşmesi:
//   GET  /api/Products/tum-urunleri-ve-teminatlari-getir  → Product[] (ProductCode dahil)
//   GET  /api/Pricing/risk-semasi/{productCode}           → RiskParameter[] (dinamik form)
//   POST /api/Pricing/teklif-hesapla                      → PricingResult (canlı sticky bar için)
//   POST /api/Policies/teklif-olustur  → TeklifOlusturDto
//        { policyNumber, startDate, endDate, productId, customerId,
//          selectedCoverageIds:[1,3,5], riskParameters:{aracYili:"2020",...} }
//
// Tema: navy zemin + dark glass kartlar + platin aksan (dashboard ile aynı sistem).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useMusteri } from "@/hooks/useMusteri";
import { FlowingMenu, MenuItemData } from "@/components/ui/flowing-menu";
import { RiskFormu } from "@/components/insurtech/RiskFormu";
import { FiyatBreakdownDetayli, FiyatBreakdownSticky } from "@/components/insurtech/FiyatBreakdown";
import { useCanliFiyat, useRiskSemasi, useYakinlarim } from "@/components/insurtech/useCanliFiyat";
import {
    SigortaliSec,
    SigortaliSecim,
    sigortaliSecimGecerli,
    sigortaliSecimToPayload,
} from "@/components/insurtech/SigortaliSec";
import {
    PricingResult,
    RiskParameter,
    InsuredPerson,
    YAKINLIK_IYELIK,
} from "@/components/insurtech/types";
import {
    IconArrowLeft,
    IconArrowRight,
    IconShieldCheck,
    IconCar,
    IconHeartbeat,
    IconHome,
    IconPlane,
    IconCheck,
    IconCalendarEvent,
    IconReceipt,
    IconSparkles,
    IconLock,
    IconPlus,
    IconActivityHeartbeat,
    IconUser,
    IconUsers,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface Coverage {
    id: number;
    coverageName: string;
    coveragePrice: number;
    isRequired: boolean;  // Backend tarafından dönen — zorunlu teminat mı?
}

interface Product {
    id: number;
    productName: string;
    productDescription?: string;
    price: number;
    // Yeni dinamik alanlar — backend Product entity'sinden geliyor
    displayOrder?: number;
    canCustomStartDate?: boolean;
    allowedDurationsDays?: string;  // CSV: "365" | "180,365" | "7,14,30,60"
    productCode?: string | null;    // Insurtech: pricing strategy seçici
    coverages?: Coverage[];
}

// Adım 2 = Sigortalı Kişi (yeni), 5 = Risk, 6 = Özet, 7 = Başarı
type Adim = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Süre etiketi: gün cinsinden değer → kullanıcı dostu metin
// 365 → "Yıllık", 180 → "6 ay", 30 → "1 ay", 7 → "7 gün" gibi
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

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

// Ürün adına göre ikon + kısa açıklama + FlowingMenu için görsel URL'i.
// Backend'den gelen isimde "Kasko", "Trafik", "Sağlık" gibi anahtar kelimeleri yakalıyoruz.
// Görseller Unsplash CDN'den; sigorta türüne uygun fotoğraflar.
function urunMetadata(urun: Product): {
    Icon: React.ElementType;
    aciklama: string;
    image: string;
} {
    const ad = urun.productName.toLowerCase();
    if (ad.includes("kasko"))
        return {
            Icon: IconCar,
            aciklama: urun.productDescription ?? "Aracın için kapsamlı koruma",
            image: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=600&q=80",
        };
    if (ad.includes("trafik"))
        return {
            Icon: IconCar,
            aciklama: urun.productDescription ?? "Zorunlu trafik sigortası",
            image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80",
        };
    // "Tamamlayıcı Sağlık" — sağlık sigortası
    if (ad.includes("sağlık") || ad.includes("saglik") || ad.includes("tamamlayıcı") || ad.includes("tamamlayici"))
        return {
            Icon: IconHeartbeat,
            aciklama: urun.productDescription ?? "Özel sağlık güvencesi",
            image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
        };
    // DASK — zorunlu deprem sigortası, sismik temalı görsel
    if (ad.includes("dask"))
        return {
            Icon: IconHome,
            aciklama: urun.productDescription ?? "Zorunlu deprem sigortası",
            image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
        };
    if (ad.includes("konut") || ad.includes("ev"))
        return {
            Icon: IconHome,
            aciklama: urun.productDescription ?? "Konut güvencesi",
            image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
        };
    if (ad.includes("seyahat"))
        return {
            Icon: IconPlane,
            aciklama: urun.productDescription ?? "Seyahat güvencesi",
            image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80",
        };
    return {
        Icon: IconShieldCheck,
        aciklama: urun.productDescription ?? "Sigorta koruması",
        image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
    };
}

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

// P-2025-XXXX formatlı benzersiz teklif numarası üretici
function policeNoUret() {
    const yil = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `P-${yil}-${rand}`;
}

// ─── Ana sayfa ───────────────────────────────────────────────────────────────

export default function TeklifAlPage() {
    const { musteri, yukleniyor: musteriYukleniyor } = useMusteri();
    const [urunler, setUrunler] = useState<Product[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    const [adim, setAdim] = useState<Adim>(1);
    const [secilenUrun, setSecilenUrun] = useState<Product | null>(null);
    // Süre artık gün cinsinden tutuluyor — backend'in AllowedDurationsDays CSV'sine
    // birebir uyuyor (DASK için 365, Seyahat için 7/14/30/60 gibi).
    const [sureGun, setSureGun] = useState<number>(365);
    // Seçili teminat ID'leri. Set kullanıyoruz çünkü hızlı toggle/has lookup lazım.
    // Ürün seçildiğinde zorunlu teminatlar otomatik dolar (urunSecHashIle içinde).
    const [secilenTeminatIdler, setSecilenTeminatIdler] = useState<Set<number>>(new Set());
    // ─── Insurtech: dinamik risk verisi ───────────────────────────────────────
    // Schema-driven form'un topladığı değerler. Key = RiskParameter.Key, Value = string.
    // Ürün değiştiğinde temizleniyor (urunSecHashIle içinde).
    const [riskDegerleri, setRiskDegerleri] = useState<Record<string, string>>({});
    // ─── Sigortalı kişi seçimi ───────────────────────────────────────────────
    // Default "kendim" — kullanıcı kendi adına sigorta yapıyor (en yaygın).
    // "mevcut" / "yeni" akışları SigortaliSec component'inde yönetiliyor.
    const [sigortaliSecim, setSigortaliSecim] = useState<SigortaliSecim>({ mod: "kendim" });
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [basari, setBasari] = useState<{ policyNumber: string; price: number } | null>(null);

    // ─── Insurtech: risk şeması + canlı fiyat ─────────────────────────────────
    // Ürün seçilir seçilmez şemayı çekiyoruz — şema boşsa risk adımını atlayacağız.
    const { sema: riskSemasi } = useRiskSemasi(secilenUrun?.productCode);

    // Yakın listesi — "Kimin için sigorta?" adımında dropdown'ı dolduruyor.
    const { yakinlar, yukleniyor: yakinlarYukleniyor } = useYakinlarim();

    // Canlı pricing istek nesnesi — ürün veya teminat değişince yeniden hesap.
    // Adım 4+ olunca aktive ediyoruz (öncesi sticky bar göstermiyoruz).
    const fiyatIstegi = useMemo(() => {
        if (!secilenUrun || adim < 4) return null;
        return {
            productId: secilenUrun.id,
            selectedCoverageIds: Array.from(secilenTeminatIdler),
            riskParameters: riskDegerleri,
        };
    }, [secilenUrun, secilenTeminatIdler, riskDegerleri, adim]);

    const { sonuc: fiyatSonucu, yukleniyor: fiyatYukleniyor } = useCanliFiyat(fiyatIstegi);

    // Ürünleri mount'ta çek
    useEffect(() => {
        const urunleriCek = async () => {
            try {
                const r = await fetch(`${API}/Products/tum-urunleri-ve-teminatlari-getir`, { credentials: "include" });
                if (!r.ok) throw new Error("Ürünler alınamadı.");
                const data = await r.json();
                // Backend camelCase döner
                setUrunler(Array.isArray(data) ? data : []);
            } catch {
                setHata("Sigorta ürünleri yüklenemedi. Lütfen sayfayı yenileyin.");
            } finally {
                setYukleniyor(false);
            }
        };
        urunleriCek();
    }, []);

    // Orijinal FlowingMenu anchor `<a href>` kullanıyor; biz client-side state
    // değiştirmek istiyoruz. Click event'ini capture edip navigation'ı engelliyor,
    // hash'teki ürün id'sini parse edip seçiliyor.
    const urunSecHashIle = (urunId: number) => {
        const u = urunler.find((x) => x.id === urunId);
        if (!u) return;
        setSecilenUrun(u);
        // Ürünün izin verdiği ilk süre seçeneğini varsayılan yap
        const izinli = (u.allowedDurationsDays ?? "365")
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n) && n > 0);
        setSureGun(izinli[0] ?? 365);
        // Teminat preset: ürünün zorunlu teminatlarını otomatik işaretle.
        // Kullanıcı bunları KALDIRAMAZ (Teminat Seç ekranında kilitli görünecek).
        // Opsiyoneller başlangıçta seçili değil — kullanıcı isterse ekler.
        const zorunluIdler = (u.coverages ?? []).filter((c) => c.isRequired).map((c) => c.id);
        setSecilenTeminatIdler(new Set(zorunluIdler));
        // Risk verilerini sıfırla — yeni ürün, yeni şema, yeni alanlar.
        setRiskDegerleri({});
        // Sigortalı seçimini de sıfırla — yeni ürün için yeniden sorulsun.
        setSigortaliSecim({ mod: "kendim" });
        setAdim(2);
    };

    const teklifiOlustur = async () => {
        if (!secilenUrun || !musteri) return;
        setGonderiliyor(true);
        try {
            const baslangic = new Date();
            const bitis = new Date(baslangic);
            // Süre gün cinsinden — Date.setDate ile ekliyoruz (ay aritmetiği değil)
            bitis.setDate(bitis.getDate() + sureGun);

            const policyNumber = policeNoUret();

            // Backend TeklifOlusturDto bekliyor — Price ve Status'ü backend hesaplıyor.
            // Client price gönderemez (güvenlik: kullanıcı kendi fiyatını dayatmamalı).
            // Risk parametreleri varsa gönderiyoruz; backend pricing strategy ile hesaplayıp
            // hem Price'a yazıyor hem de RiskDataJson olarak audit snapshot'ı tutuyor.
            //
            // Sigortalı kişi: helper iki alanı doldurur:
            //   - "Kendim"     → ikisi de null
            //   - "Yakın seç"  → insuredPersonId dolu
            //   - "Yeni yakın" → yeniSigortali objesi (TC, ad-soyad vs.)
            const sigortaliPayload = sigortaliSecimToPayload(sigortaliSecim);
            const body = {
                policyNumber,
                startDate: baslangic.toISOString(),
                endDate: bitis.toISOString(),
                productId: secilenUrun.id,
                customerId: musteri.id,
                selectedCoverageIds: Array.from(secilenTeminatIdler),
                riskParameters: Object.keys(riskDegerleri).length > 0 ? riskDegerleri : null,
                insuredPersonId: sigortaliPayload.insuredPersonId,
                yeniSigortali: sigortaliPayload.yeniSigortali,
            };

            const r = await fetch(`${API}/Policies/teklif-olustur`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });

            if (!r.ok) throw new Error();
            const data = await r.json();
            setBasari({
                policyNumber,
                price: data.hesaplananFiyat ?? fiyatSonucu?.total ?? secilenUrun.price,
            });
            setAdim(7);
        } catch {
            setHata("Teklif oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.");
        } finally {
            setGonderiliyor(false);
        }
    };

    // ── Sonraki adıma geçiş yardımcısı ─────────────────────────────────────
    // Teminat → Risk akışında, ürünün şeması boşsa risk adımı atlanır.
    const teminattanIleri = () => {
        if (riskSemasi.length === 0) setAdim(6);  // DASK/Trafik — direkt özet
        else setAdim(5);
    };

    // ── Sigortalı kişi metadata'sı — UI etiketlerinde kullanılır ──────────
    // "Yakınınızın yaşı" gibi başlıkları riskFormu/özet/breakdown'a yansıtmak için.
    const sigortaliMeta = useMemo(() => {
        if (sigortaliSecim.mod === "kendim") {
            return {
                yakinlik: "Kendisi" as const,
                adSoyad: musteri ? `${musteri.adi} ${musteri.soyadi}` : "Kendim",
                iyelik: YAKINLIK_IYELIK.Kendisi,
            };
        }
        if (sigortaliSecim.mod === "mevcut") {
            const y = yakinlar.find((x) => x.id === sigortaliSecim.insuredPersonId);
            return {
                yakinlik: y?.yakinlik ?? ("Diger" as const),
                adSoyad: y?.adSoyad ?? "—",
                iyelik: YAKINLIK_IYELIK[y?.yakinlik ?? "Diger"],
            };
        }
        return {
            yakinlik: sigortaliSecim.data.yakinlik,
            adSoyad: sigortaliSecim.data.adSoyad || "Yeni yakın",
            iyelik: YAKINLIK_IYELIK[sigortaliSecim.data.yakinlik],
        };
    }, [sigortaliSecim, yakinlar, musteri]);

    // ── Yüklenme / hata görünümleri ─────────────────────────────────────────
    if (musteriYukleniyor || yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 lg:p-8">

            {/* ── Üst: başlık + adım göstergesi ───────────────────────── */}
            <div className="max-w-5xl mx-auto mb-8">
                <UstBaslik
                    adim={adim}
                    riskSemasiBos={riskSemasi.length === 0}
                    geri={() => {
                        if (adim === 1 || adim === 7) return;
                        // Adım 6 (özet) → eğer risk şeması yoksa direkt 4'e (teminat)
                        if (adim === 6 && riskSemasi.length === 0) {
                            setAdim(4);
                            return;
                        }
                        setAdim((a) => (a - 1) as Adim);
                    }}
                />
            </div>

            {/* ── Hata satırı (varsa) ─────────────────────────────────── */}
            {hata && (
                <div className="max-w-5xl mx-auto mb-4">
                    <div
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "rgb(252,165,165)",
                        }}
                    >
                        {hata}
                    </div>
                </div>
            )}

            {/* ── Adım içerikleri — animate presence ile geçiş ───────── */}
            <div className="max-w-5xl mx-auto">
                <AnimatePresence mode="wait">
                    {adim === 1 && (
                        <UrunSecAdim key="1" urunler={urunler} onSec={urunSecHashIle} />
                    )}
                    {adim === 2 && secilenUrun && (
                        <SigortaliSecAdim
                            key="2"
                            urun={secilenUrun}
                            yakinlar={yakinlar}
                            yakinlarYukleniyor={yakinlarYukleniyor}
                            secim={sigortaliSecim}
                            setSecim={setSigortaliSecim}
                            kullaniciAdSoyad={musteri ? `${musteri.adi} ${musteri.soyadi}` : undefined}
                            onDevam={() => setAdim(3)}
                        />
                    )}
                    {adim === 3 && secilenUrun && (
                        <SureSecAdim
                            key="3"
                            urun={secilenUrun}
                            sureGun={sureGun}
                            setSureGun={setSureGun}
                            onDevam={() => setAdim(4)}
                        />
                    )}
                    {adim === 4 && secilenUrun && (
                        <TeminatSecAdim
                            key="4"
                            urun={secilenUrun}
                            secilenTeminatIdler={secilenTeminatIdler}
                            setSecilenTeminatIdler={setSecilenTeminatIdler}
                            fiyatSonucu={fiyatSonucu}
                            fiyatYukleniyor={fiyatYukleniyor}
                            onDevam={teminattanIleri}
                            ileriYazisi={riskSemasi.length === 0 ? "Özete geç" : "Risk bilgilerine geç"}
                        />
                    )}
                    {adim === 5 && secilenUrun && (
                        <RiskBilgileriAdim
                            key="5"
                            urun={secilenUrun}
                            riskSemasi={riskSemasi}
                            riskDegerleri={riskDegerleri}
                            setRiskDegerleri={setRiskDegerleri}
                            fiyatSonucu={fiyatSonucu}
                            fiyatYukleniyor={fiyatYukleniyor}
                            sigortaliMeta={sigortaliMeta}
                            onDevam={() => setAdim(6)}
                        />
                    )}
                    {adim === 6 && secilenUrun && (
                        <OzetAdim
                            key="6"
                            urun={secilenUrun}
                            sureGun={sureGun}
                            secilenTeminatIdler={secilenTeminatIdler}
                            fiyatSonucu={fiyatSonucu}
                            fiyatYukleniyor={fiyatYukleniyor}
                            sigortaliMeta={sigortaliMeta}
                            gonderiliyor={gonderiliyor}
                            onGonder={teklifiOlustur}
                        />
                    )}
                    {adim === 7 && basari && secilenUrun && (
                        <BasariAdim
                            key="7"
                            policyNumber={basari.policyNumber}
                            price={basari.price}
                            urunAdi={secilenUrun.productName}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Üst başlık + adım göstergesi ────────────────────────────────────────────
function UstBaslik({
    adim,
    riskSemasiBos,
    geri,
}: {
    adim: Adim;
    riskSemasiBos: boolean;
    geri: () => void;
}) {
    const basliklar: Record<Adim, { baslik: string; altyazi: string }> = {
        1: { baslik: "Sigorta Ürününü Seç", altyazi: "Size uygun ürünü seçin, birkaç adımda teklifiniz hazır." },
        2: { baslik: "Kimin İçin Sigorta?", altyazi: "Kendiniz veya bir yakınınız için poliçe oluşturabilirsiniz." },
        3: { baslik: "Poliçe Süresini Belirle", altyazi: "Teklifinizin geçerli olacağı süreyi seçin." },
        4: { baslik: "Teminatları Belirle", altyazi: "Zorunlu teminatlar otomatik dahildir; opsiyonelleri ekleyerek poliçenizi özelleştirin." },
        5: { baslik: "Risk Bilgilerini Girin", altyazi: "Aktüeryal değerlendirme — verdiğiniz bilgiler primizi etkiler." },
        6: { baslik: "Teklifi Onaylayın", altyazi: "Bilgileri kontrol edin ve teklifinizi oluşturun." },
        7: { baslik: "Teklifiniz Hazır", altyazi: "Teklifiniz sisteme kaydedildi." },
    };
    const { baslik, altyazi } = basliklar[adim];

    // Adım göstergesi: risk şeması boşsa 5'i gizle (DASK/Trafik için).
    // Görsel sıra: 1 → 2 → 3 → 4 → 6 (kullanıcının görüntülediği akış doğal kalır).
    const gosterilecekAdimlar: number[] = riskSemasiBos ? [1, 2, 3, 4, 6] : [1, 2, 3, 4, 5, 6];

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Üst satır: geri butonu + adım göstergesi */}
            <div className="flex items-center justify-between mb-5">
                {adim > 1 && adim < 7 ? (
                    <button
                        onClick={geri}
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Geri dön
                    </button>
                ) : (
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        {adim === 7 ? "Dashboard'a dön" : "Dashboard"}
                    </Link>
                )}

                {/* Sağda adım noktaları — risk adımı yoksa 5'i atlıyor */}
                {adim < 7 && (
                    <div className="flex items-center gap-2">
                        {gosterilecekAdimlar.map((i, idx) => {
                            const aktif = i === adim;
                            const gecmis = i < adim;
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <motion.span
                                        animate={{ scale: aktif ? 1 : 0.85 }}
                                        className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold tabular-nums"
                                        style={{
                                            background: gecmis
                                                ? "linear-gradient(135deg, #f8fafc, #cbd5e1)"
                                                : aktif
                                                    ? "rgba(255,255,255,0.1)"
                                                    : "rgba(255,255,255,0.03)",
                                            color: gecmis ? "#0f172a" : aktif ? "#ffffff" : "rgba(255,255,255,0.35)",
                                            border: aktif ? "1px solid rgba(226,232,240,0.4)" : "1px solid rgba(255,255,255,0.07)",
                                        }}
                                    >
                                        {gecmis ? <IconCheck className="w-3 h-3" strokeWidth={3} /> : idx + 1}
                                    </motion.span>
                                    {idx < gosterilecekAdimlar.length - 1 && (
                                        <span
                                            className="w-8 h-px"
                                            style={{
                                                background: i < adim ? "rgba(226,232,240,0.4)" : "rgba(255,255,255,0.08)",
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Ana başlık */}
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                {baslik}
                <span style={{ color: "#cbd5e1" }}>.</span>
            </h1>
            <p className="text-white/45 text-sm mt-1">{altyazi}</p>
        </motion.div>
    );
}

// ─── ADIM 1: Ürün seçimi ────────────────────────────────────────────────────
function UrunSecAdim({ urunler, onSec }: { urunler: Product[]; onSec: (urunId: number) => void }) {
    // Backend ürünlerini orijinal FlowingMenu formatına çevir.
    // `link` field'ında ürün id'sini hash olarak gömüyoruz; click handler bunu yakalayıp
    // gerçek navigation yerine state değişimine dönüştürüyor.
    // `text` sadece ürün adı — marquee'de "KASKO [resim] KASKO [resim]" formatı oluşsun.
    // "Sigortası" ekini düşürüyoruz: "Kasko Sigortası" → "Kasko"
    // (DASK gibi tek kelimelik özel isimler etkilenmez.)
    const items: MenuItemData[] = urunler.map((u) => {
        const { image } = urunMetadata(u);
        const kisaAd = u.productName.replace(/\s*Sigortası\s*$/i, "").trim();
        return {
            link: `#urun-${u.id}`,
            text: kisaAd,
            image,
        };
    });

    if (items.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-8 text-center"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
                <p className="text-white/55 text-sm">Şu anda sunulan sigorta ürünü bulunmuyor.</p>
            </motion.div>
        );
    }

    // Anchor click'ini capture et — orijinal komponente dokunmadan
    const onMenuClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (!a) return;
        const href = a.getAttribute("href") ?? "";
        const match = href.match(/^#urun-(\d+)$/);
        if (!match) return;
        e.preventDefault();
        const id = parseInt(match[1], 10);
        onSec(id);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
        >
            {/* Sabit yükseklik kapsayıcı: orijinal FlowingMenu height:100% kullanıyor.
                Her item flex:1 ile dikey paylaşıyor — toplam yüksekliğin item sayısına
                bölünmesi gibi. Yaklaşık 110-130px/item gözüküyor. */}
            <div
                onClick={onMenuClick}
                className="rounded-2xl overflow-hidden"
                style={{
                    height: `${Math.max(items.length * 120, 360)}px`,
                    background: "#060010",
                    border: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                <FlowingMenu items={items} />
            </div>

            <p className="text-white/35 text-[12px] mt-4 text-center">
                Bir ürüne tıklayarak teklif oluşturma adımlarına geçersin.
            </p>
        </motion.div>
    );
}

// ─── ADIM 2: Sigortalı kişi seçimi ──────────────────────────────────────────
// "Bu sigortayı kimin için alıyorsunuz?" — Türkiye sigorta sektörünün gerçek
// mantığı: sigorta ettiren (primi ödeyen) ile sigortalı (risk taşıyıcısı)
// farklı kişiler olabilir. Eşim için kasko, annem için sağlık, çocuğum için
// seyahat sigortası gibi.
//
// Ürünün tipine göre adımı atlayabilirdik (DASK için "ev" sigortalanır, kişi
// değil) ama tutarlı UX için tüm ürünlerde gösteriyoruz — DASK'ta kullanıcı
// genelde "Kendim" seçip geçer.
function SigortaliSecAdim({
    urun, yakinlar, yakinlarYukleniyor, secim, setSecim, kullaniciAdSoyad, onDevam,
}: {
    urun: Product;
    yakinlar: InsuredPerson[];
    yakinlarYukleniyor: boolean;
    secim: SigortaliSecim;
    setSecim: (s: SigortaliSecim) => void;
    kullaniciAdSoyad?: string;
    onDevam: () => void;
}) {
    const { Icon } = urunMetadata(urun);
    const gecerli = sigortaliSecimGecerli(secim);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-6 lg:p-8"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Üst şerit: ürün hatırlatma */}
            <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <Icon className="w-5 h-5" style={{ color: "#cbd5e1" }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{urun.productName}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">
                        Sigortalı kişiyi belirleyin — sigortayı sizin adınıza yapan dostlarınız da olabilir
                    </p>
                </div>
            </div>

            {/* Reusable seçim component'i */}
            <SigortaliSec
                yakinlar={yakinlar}
                yukleniyor={yakinlarYukleniyor}
                secim={secim}
                setSecim={setSecim}
                kullaniciAdSoyad={kullaniciAdSoyad}
            />

            {/* Devam butonu */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={onDevam}
                    disabled={!gecerli}
                    className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    Süre seçimine geç
                    <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                </button>
            </div>
        </motion.div>
    );
}

// ─── ADIM 3: Süre seçimi ────────────────────────────────────────────────────
function SureSecAdim({
    urun, sureGun, setSureGun, onDevam,
}: {
    urun: Product; sureGun: number; setSureGun: (n: number) => void; onDevam: () => void;
}) {
    const { Icon } = urunMetadata(urun);

    // Ürünün izin verdiği süre seçenekleri — admin paneli üzerinden değişebilir.
    // Örn. DASK için "365", Seyahat için "7,14,30,60", Kasko için "90,180,365".
    const secenekler = (urun.allowedDurationsDays ?? "365")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);

    // Tek seçenek varsa pill grid yerine bilgilendirici banner gösteriyoruz —
    // DASK ve Trafik gibi yasal zorunlu yıllık ürünler için "süre seçimi yok" deneyimi.
    const tekSecenek = secenekler.length === 1;

    const baslangic = new Date();
    const bitis = new Date(baslangic);
    bitis.setDate(bitis.getDate() + sureGun);

    // Yıllık fiyattan orantılı hesap — UI tahmini (backend asıl fiyatı yıllık olarak döner)
    const tahminFiyat = (urun.price * sureGun) / 365;

    // Pill grid kolon sayısı — seçenek sayısına göre dinamik
    const gridCols =
        secenekler.length >= 4 ? "grid-cols-2 sm:grid-cols-4" :
        secenekler.length === 3 ? "grid-cols-3" :
        secenekler.length === 2 ? "grid-cols-2" :
        "grid-cols-1";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-6 lg:p-8"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Seçili ürün özeti — üst şerit */}
            <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <Icon className="w-5 h-5" style={{ color: "#cbd5e1" }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{urun.productName}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">Seçilen ürün</p>
                </div>
                <span className="text-white/70 text-sm font-medium tabular-nums">
                    {paraFormat(urun.price)} / yıl
                </span>
            </div>

            {/* Süre pill'leri — ürünün izin verdiği seçeneklere göre dinamik */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-white/55 text-[13px] font-medium">Poliçe süresi</p>
                    {tekSecenek && (
                        <span className="text-[11px] text-white/35">
                            Bu ürün için süre seçimi yapılamaz
                        </span>
                    )}
                </div>
                <div className={`grid ${gridCols} gap-2.5`}>
                    {secenekler.map((gun) => {
                        const secili = gun === sureGun;
                        const { ust, alt } = sureMetni(gun);
                        return (
                            <button
                                key={gun}
                                onClick={() => setSureGun(gun)}
                                disabled={tekSecenek}
                                className="relative rounded-xl px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0"
                                style={{
                                    background: secili
                                        ? "linear-gradient(135deg, rgba(226,232,240,0.08), rgba(148,163,184,0.04))"
                                        : "rgba(255,255,255,0.03)",
                                    border: secili
                                        ? "1px solid rgba(226,232,240,0.35)"
                                        : "1px solid rgba(255,255,255,0.06)",
                                    boxShadow: secili ? "inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                                }}
                            >
                                <p className="text-lg font-bold tabular-nums" style={{ color: secili ? "#ffffff" : "rgba(255,255,255,0.75)" }}>
                                    {ust}
                                </p>
                                <p className="text-[11px] mt-0.5" style={{ color: secili ? "#cbd5e1" : "rgba(255,255,255,0.35)" }}>
                                    {alt}
                                </p>
                                {secili && (
                                    <motion.span
                                        layoutId="sure-tik"
                                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{
                                            background: "linear-gradient(135deg, #f8fafc, #cbd5e1)",
                                            boxShadow: "0 4px 12px -4px rgba(226,232,240,0.5)",
                                        }}
                                    >
                                        <IconCheck className="w-3 h-3" style={{ color: "#0f172a" }} strokeWidth={3} />
                                    </motion.span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tarih ve tahmini fiyat */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <BilgiKutu baslik="Başlangıç" deger={tarihFormat(baslangic)} Icon={IconCalendarEvent} />
                <BilgiKutu baslik="Bitiş"      deger={tarihFormat(bitis)}     Icon={IconCalendarEvent} />
                <BilgiKutu baslik="Tahmini Prim" deger={paraFormat(tahminFiyat)} Icon={IconReceipt} vurgu />
            </div>

            <p className="text-white/30 text-[11px] mt-4 leading-relaxed">
                * Bu tarihler tahminidir; poliçe ödemeniz tamamlandığı andan itibaren yürürlüğe girer
                ve seçtiğiniz süre boyunca geçerli olur.
            </p>

            {/* CTA — platin invert button (dashboard ile aynı dil) */}
            <div className="mt-7 flex justify-end">
                <button
                    onClick={onDevam}
                    className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    Özete geç
                    <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                </button>
            </div>
        </motion.div>
    );
}

// Küçük bilgi kutucuğu — tarih ve fiyat göstergeleri için
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
                <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: vurgu ? "#cbd5e1" : "rgba(255,255,255,0.4)" }}>
                    {baslik}
                </p>
            </div>
            <p className={`text-base font-semibold tabular-nums ${vurgu ? "text-white" : "text-white/80"}`}>
                {deger}
            </p>
        </div>
    );
}

// ─── ADIM 3: Teminat seçimi ─────────────────────────────────────────────────
// İki bölüm: zorunlu (kilitli, otomatik dahil) ve opsiyonel (toggle).
// Live price hesabı: alt sticky bar her toggle'da yeniden hesaplıyor.
// Backend formülü ile bire bir uyumlu — submit'te sürpriz fiyat çıkmaz.
function TeminatSecAdim({
    urun, secilenTeminatIdler, setSecilenTeminatIdler,
    fiyatSonucu, fiyatYukleniyor, onDevam, ileriYazisi,
}: {
    urun: Product;
    secilenTeminatIdler: Set<number>;
    setSecilenTeminatIdler: (s: Set<number>) => void;
    fiyatSonucu: PricingResult | null;
    fiyatYukleniyor: boolean;
    onDevam: () => void;
    ileriYazisi: string;
}) {
    const tumTeminatlar = urun.coverages ?? [];
    const zorunlular = tumTeminatlar.filter((c) => c.isRequired);
    const opsiyoneller = tumTeminatlar.filter((c) => !c.isRequired);

    // Toggle helper — yalnızca opsiyoneller için çağrılıyor (zorunluları frozen tutuyoruz).
    // Set immutable olmadığı için yeni Set oluşturuyoruz; React state karşılaştırması için.
    const toggleTeminat = (id: number, isRequired: boolean) => {
        if (isRequired) return; // Zorunlular kilitli — toggle yasak
        const yeni = new Set(secilenTeminatIdler);
        if (yeni.has(id)) yeni.delete(id);
        else yeni.add(id);
        setSecilenTeminatIdler(yeni);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-6 lg:p-8 pb-44 lg:pb-32"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* ── Zorunlu teminatlar (kilitli) ─────────────────────────────── */}
            {zorunlular.length > 0 && (
                <div className="mb-7">
                    <div className="flex items-center gap-2 mb-3">
                        <IconLock className="w-3.5 h-3.5" style={{ color: "#cbd5e1" }} />
                        <p className="text-white/65 text-[13px] font-semibold uppercase tracking-wider">
                            Zorunlu Teminatlar
                        </p>
                        <span className="text-white/30 text-[11px] ml-1">
                            ({zorunlular.length} kalem — otomatik dahil)
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

            {/* ── Opsiyonel teminatlar (toggle) ────────────────────────────── */}
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

            {opsiyoneller.length === 0 && zorunlular.length > 0 && (
                <p className="text-white/35 text-[12px] text-center mt-2">
                    Bu ürün için yalnızca zorunlu teminatlar tanımlı. İlerleyebilirsiniz.
                </p>
            )}

            {/* ── Sticky alt bar: insurtech canlı prim + devam butonu ────── */}
            <FiyatBreakdownSticky
                sonuc={fiyatSonucu}
                yukleniyor={fiyatYukleniyor}
                onDevam={onDevam}
                devamYazisi={ileriYazisi}
            />
        </motion.div>
    );
}

// Tek teminat satırı — zorunlu (kilitli) veya opsiyonel (toggle)
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
            {/* Sol: checkbox + isim */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Custom checkbox / lock icon */}
                <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                        background: secili
                            ? "linear-gradient(135deg, #f8fafc, #cbd5e1)"
                            : "rgba(255,255,255,0.05)",
                        border: secili
                            ? "1px solid rgba(226,232,240,0.5)"
                            : "1px solid rgba(255,255,255,0.12)",
                        boxShadow: secili ? "0 4px 12px -4px rgba(226,232,240,0.4)" : "none",
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

            {/* Sağ: fiyat */}
            <span
                className="text-sm font-semibold tabular-nums flex-shrink-0"
                style={{ color: secili ? "#cbd5e1" : "rgba(255,255,255,0.5)" }}
            >
                + {paraFormat(coverage.coveragePrice)}
            </span>
        </button>
    );
}

// ─── ADIM 4: Risk Bilgileri (Insurtech dinamik form) ────────────────────────
// Ürünün ProductCode'una göre backend'in döndürdüğü RiskParameter şeması ile
// dinamik form üretiyoruz. Her input değişikliğinde useCanliFiyat hook'u
// debounced /teklif-hesapla çağrısı yapıp sticky bar'ı güncelliyor.
//
// Şema boş döndüğünde (DASK/Trafik) bu adım atlanır — TeminatSecAdim'in
// onDevam'ı doğrudan özet adımına geçiyor.
type SigortaliMeta = {
    yakinlik: import("@/components/insurtech/types").Yakinlik;
    adSoyad: string;
    iyelik: string;
};

function RiskBilgileriAdim({
    urun, riskSemasi, riskDegerleri, setRiskDegerleri,
    fiyatSonucu, fiyatYukleniyor, sigortaliMeta, onDevam,
}: {
    urun: Product;
    riskSemasi: RiskParameter[];
    riskDegerleri: Record<string, string>;
    setRiskDegerleri: (d: Record<string, string>) => void;
    fiyatSonucu: PricingResult | null;
    fiyatYukleniyor: boolean;
    sigortaliMeta: SigortaliMeta;
    onDevam: () => void;
}) {
    const { Icon } = urunMetadata(urun);
    // "Kendisi" değilse "X için" başlığını vurgula
    const baskasiMi = sigortaliMeta.yakinlik !== "Kendisi";

    // Zorunlu alanların tamamı doldurulmadıysa devam butonu disabled.
    // (Browser tarafı required attribute + bu kontrol birlikte UX'i sıkı tutuyor.)
    const zorunluAlanlar = riskSemasi.filter((p) => p.isRequired);
    const eksikZorunlular = zorunluAlanlar.filter(
        (p) => !riskDegerleri[p.key] || riskDegerleri[p.key].trim() === ""
    );
    const tamamlandi = eksikZorunlular.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl p-6 lg:p-8 pb-44 lg:pb-32"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Başlık şeridi — ürün + insurtech rozeti */}
            <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <Icon className="w-5 h-5" style={{ color: "#cbd5e1" }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{urun.productName}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">
                        {riskSemasi.length} aktüeryal faktör değerlendiriliyor
                    </p>
                </div>
                <span
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded"
                    style={{
                        background: "rgba(226,232,240,0.08)",
                        color: "#cbd5e1",
                        border: "1px solid rgba(226,232,240,0.18)",
                    }}
                >
                    <IconActivityHeartbeat className="w-3 h-3" />
                    Canlı Tarife
                </span>
            </div>

            {/* "Kim için" hatırlatıcı banner — sigortalı = sigorta ettiren değilse */}
            {baskasiMi && (
                <div
                    className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5"
                    style={{
                        background: "rgba(226,232,240,0.04)",
                        border: "1px solid rgba(226,232,240,0.15)",
                    }}
                >
                    <IconUser className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#cbd5e1" }} />
                    <div>
                        <p className="text-white text-[13px]">
                            Bu bilgileri <strong className="font-semibold">{sigortaliMeta.adSoyad}</strong> için giriyorsunuz.
                        </p>
                        <p className="text-white/45 text-[11px] mt-0.5">
                            Yaş, sağlık durumu gibi faktörler {sigortaliMeta.iyelik.toLowerCase()} kendi bilgileri olmalı.
                        </p>
                    </div>
                </div>
            )}

            {/* Dinamik form */}
            <RiskFormu sema={riskSemasi} degerler={riskDegerleri} setDegerler={setRiskDegerleri} />

            {/* Eksik zorunlu alan uyarısı */}
            {!tamamlandi && (
                <p className="text-white/35 text-[11px] mt-5 leading-relaxed">
                    * Devam etmek için {eksikZorunlular.length} zorunlu alanı doldurun.
                </p>
            )}

            {/* Sticky alt bar — canlı fiyat */}
            <FiyatBreakdownSticky
                sonuc={fiyatSonucu}
                yukleniyor={fiyatYukleniyor}
                onDevam={tamamlandi ? onDevam : undefined}
                devamYazisi="Özete geç"
                devamButonGizle={!tamamlandi}
            />
        </motion.div>
    );
}

// ─── ADIM 5: Özet + onay ────────────────────────────────────────────────────
function OzetAdim({
    urun, sureGun, secilenTeminatIdler, fiyatSonucu, fiyatYukleniyor,
    sigortaliMeta, gonderiliyor, onGonder,
}: {
    urun: Product;
    sureGun: number;
    secilenTeminatIdler: Set<number>;
    fiyatSonucu: PricingResult | null;
    fiyatYukleniyor: boolean;
    sigortaliMeta: SigortaliMeta;
    gonderiliyor: boolean;
    onGonder: () => void;
}) {
    const { Icon, aciklama } = urunMetadata(urun);
    const baslangic = new Date();
    const bitis = new Date(baslangic);
    bitis.setDate(bitis.getDate() + sureGun);
    const { ust: sureLabel } = sureMetni(sureGun);

    // Backend'in döndürdüğü PricingResult'ı tek doğru kaynak olarak kullanıyoruz.
    // Yerel hesap yapmıyoruz — risk çarpanı ve BSMV backend tarafında.
    const secilenTeminatlar = (urun.coverages ?? []).filter((c) => secilenTeminatIdler.has(c.id));
    const tahminFiyat = fiyatSonucu?.total ?? urun.price;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
        >
            {/* Özet kartı */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                    backdropFilter: "blur(8px)",
                }}
            >
                {/* Üst: ürün banner'ı — platin şerit */}
                <div
                    className="relative px-6 lg:px-8 py-6 flex items-center gap-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                    {/* Arka hafif platin glow */}
                    <div
                        className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full"
                        style={{ background: "radial-gradient(circle, rgba(226,232,240,0.08), transparent 70%)" }}
                    />
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{
                            background: "linear-gradient(135deg, #64748b, #cbd5e1)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(15,23,42,0.2)",
                        }}
                    >
                        <Icon className="w-6 h-6" style={{ color: "#0f172a" }} />
                    </div>
                    <div className="relative z-10 min-w-0">
                        <p className="text-white text-lg font-bold tracking-tight">{urun.productName}</p>
                        <p className="text-white/45 text-[13px] mt-0.5">{aciklama}</p>
                    </div>
                </div>

                {/* Orta: detay satırları */}
                <div className="px-6 lg:px-8 py-5 flex flex-col gap-2.5">
                    <OzetSatir
                        etiket="Sigortalı"
                        deger={
                            sigortaliMeta.yakinlik === "Kendisi"
                                ? `${sigortaliMeta.adSoyad} (Kendiniz)`
                                : `${sigortaliMeta.adSoyad}`
                        }
                    />
                    <OzetSatir etiket="Poliçe süresi"  deger={sureLabel} />
                    <OzetSatir etiket="Başlangıç"      deger={tarihFormat(baslangic)} />
                    <OzetSatir etiket="Bitiş"          deger={tarihFormat(bitis)} />
                    <OzetSatir
                        etiket="Seçilen teminat sayısı"
                        deger={`${secilenTeminatlar.length} kalem`}
                    />
                </div>

                {/* Teminat breakdown listesi — kullanıcıya net şekilde
                    ne için ne ödediğini gösteriyoruz. Şeffaflık güven kazandırır. */}
                {secilenTeminatlar.length > 0 && (
                    <div
                        className="px-6 lg:px-8 py-4 flex flex-col gap-1.5"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium mb-1">
                            Teminat Detayı
                        </p>
                        {/* Baz prim */}
                        <div className="flex items-center justify-between text-[13px]">
                            <span className="text-white/55">Ürün baz fiyatı</span>
                            <span className="text-white/85 tabular-nums font-medium">{paraFormat(urun.price)}</span>
                        </div>
                        {secilenTeminatlar.map((c) => (
                            <div key={c.id} className="flex items-center justify-between text-[13px]">
                                <span className="text-white/55 flex items-center gap-1.5">
                                    {/* Her teminatın yanında tip etiketi: zorunlu (vurgulu) / opsiyonel (sönük).
                                        Aynı genişlikte ve aynı yapı — kullanıcı tek bakışta ayırabiliyor. */}
                                    {c.isRequired ? (
                                        <span
                                            className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                                            style={{
                                                background: "rgba(226,232,240,0.08)",
                                                color: "#cbd5e1",
                                                border: "1px solid rgba(226,232,240,0.18)",
                                            }}
                                        >
                                            Zorunlu
                                        </span>
                                    ) : (
                                        <span
                                            className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                color: "rgba(255,255,255,0.45)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                            }}
                                        >
                                            Opsiyonel
                                        </span>
                                    )}
                                    {c.coverageName}
                                </span>
                                <span className="text-white/85 tabular-nums font-medium">+ {paraFormat(c.coveragePrice)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Alt: fiyat + CTA */}
                <div
                    className="px-6 lg:px-8 py-5 flex items-center justify-between gap-4"
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)",
                    }}
                >
                    <div>
                        <p className="text-white/45 text-[11px] uppercase tracking-wider font-medium">Toplam Prim</p>
                        <p className="text-white text-2xl font-bold tabular-nums mt-0.5">
                            {paraFormat(tahminFiyat)}
                        </p>
                    </div>
                    <button
                        onClick={onGonder}
                        disabled={gonderiliyor}
                        className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
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
                                Teklifi oluştur
                                <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Insurtech: Pricing Engine'in tam breakdown'ı ──────────────
                Risk faktörlerinin nasıl çarpan ürettiğini, BSMV'nin nereye eklendiğini
                kullanıcı tek bakışta görsün. Şeffaflık = güven. */}
            {fiyatSonucu && fiyatSonucu.breakdown.some((b) => b.category === "risk") && (
                <div className="mt-4">
                    <FiyatBreakdownDetayli sonuc={fiyatSonucu} yukleniyor={fiyatYukleniyor} />
                </div>
            )}

            <p className="text-white/30 text-[11px] mt-3 leading-relaxed text-center">
                Onay verirseniz teklifiniz &quot;Teklif Bekliyor&quot; durumunda sisteme kaydedilecektir.
                Poliçeniz <strong className="text-white/60">ödemeniz tamamlandığı an</strong> yürürlüğe girecek
                ve süre o tarihten itibaren işlemeye başlayacak.
            </p>
        </motion.div>
    );
}

function OzetSatir({ etiket, deger }: { etiket: string; deger: string }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-white/50 text-[13px]">{etiket}</span>
            <span className="text-white/90 text-[13px] font-medium tabular-nums">{deger}</span>
        </div>
    );
}

// ─── ADIM 5: Başarı ekranı ──────────────────────────────────────────────────
function BasariAdim({
    policyNumber, price, urunAdi,
}: {
    policyNumber: string; price: number; urunAdi: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-8 lg:p-10 text-center relative overflow-hidden"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                backdropFilter: "blur(8px)",
            }}
        >
            {/* Emerald başarı glow — üstten */}
            <div
                className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.18), transparent 70%)" }}
            />

            {/* Check ikonu — emerald halo + platin merkez */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 18 }}
                className="relative z-10 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))",
                    border: "1px solid rgba(16,185,129,0.35)",
                }}
            >
                <IconCheck className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
            </motion.div>

            <h2 className="relative z-10 text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Teklifiniz hazır
                <span style={{ color: "#cbd5e1" }}>.</span>
            </h2>
            <p className="relative z-10 text-white/50 text-sm mt-2 max-w-md mx-auto">
                {urunAdi} için teklifiniz sisteme kaydedildi. Onaylanması için ödemenizi tamamlayabilirsiniz.
            </p>

            {/* Teklif bilgileri satırı */}
            <div className="relative z-10 mt-6 inline-flex flex-wrap items-center gap-3 px-5 py-3 rounded-xl"
                style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div className="flex items-center gap-2">
                    <IconSparkles className="w-3.5 h-3.5" style={{ color: "#cbd5e1" }} />
                    <span className="text-white/45 text-[11px] uppercase tracking-wider font-medium">Teklif No</span>
                    <span className="text-white text-sm font-semibold font-mono tabular-nums">{policyNumber}</span>
                </div>
                <span className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="flex items-center gap-2">
                    <span className="text-white/45 text-[11px] uppercase tracking-wider font-medium">Tutar</span>
                    <span className="text-white text-sm font-semibold tabular-nums">{paraFormat(price)}</span>
                </div>
            </div>

            {/* Aksiyon butonları */}
            <div className="relative z-10 mt-7 flex items-center justify-center gap-3 flex-wrap">
                <Link
                    href="/dashboard/policeler"
                    className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    Poliçelerime git
                    <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white/55 hover:text-white/90 transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                    Dashboard
                </Link>
            </div>
        </motion.div>
    );
}

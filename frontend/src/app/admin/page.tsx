"use client";

// ─── /admin — Admin Dashboard ────────────────────────────────────────────────
// İstatistik kartları + grafikler.
//
// Backend: GET /api/Admin/dashboard-istatistik tek istekle veri çekiyor.
// Recharts ile 2 ana görselleştirme:
//   - Aylık ödeme hacmi (line chart, son 6 ay)
//   - Ürün bazlı aktif poliçe dağılımı (donut chart)
//
// Hızlı erişim kartları altta — admin sık yapılan işlemlere gitsin.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import {
    IconUsers,
    IconShieldCheck,
    IconClock,
    IconAlertTriangle,
    IconCash,
    IconTrendingUp,
    IconArrowRight,
    IconPackage,
    IconBell,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface AylikHacim {
    yil: number;
    ay: number;
    toplam: number;
    islemSayisi: number;
}

interface UrunDagilim {
    urunAdi: string;
    sayi: number;
}

interface HasarDagilim {
    durum: string;
    sayi: number;
}

interface IstatistikYanit {
    toplamMusteri: number;
    aktifPolice: number;
    bekleyenTeklif: number;
    acikHasar: number;
    aylikPrimHacmi: number;
    aylikYeniTeklif: number;
    aylikHacim: AylikHacim[];
    urunDagilim: UrunDagilim[];
    hasarDagilim: HasarDagilim[];
}

const AY_ADLARI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// Donut chart renkleri — slate paleti (UI ile tutarlı)
const URUN_RENKLER = ["#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155", "#1e293b"];
// Hasar durum renkleri — semantic
const HASAR_RENKLER: Record<string, string> = {
    "İncelemede": "#f59e0b",
    "Onaylandı":  "#3b82f6",
    "Ödendi":     "#10b981",
    "Reddedildi": "#ef4444",
};

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function paraKisa(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₺`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ₺`;
    return paraFormat(n);
}

export default function AdminDashboardPage() {
    const [istatistik, setIstatistik] = useState<IstatistikYanit | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");

    useEffect(() => {
        const cek = async () => {
            try {
                const r = await fetch(`${API}/Admin/dashboard-istatistik`, {
                    credentials: "include",
                });
                if (!r.ok) throw new Error();
                const data = await r.json();
                setIstatistik(data);
            } catch {
                setHata("İstatistikler yüklenemedi.");
            } finally {
                setYukleniyor(false);
            }
        };
        cek();
    }, []);

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }}
                />
            </div>
        );
    }

    if (hata || !istatistik) {
        return (
            <div className="p-8">
                <div className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "rgb(252,165,165)" }}
                >
                    {hata || "Veri bulunamadı."}
                </div>
            </div>
        );
    }

    // Chart data dönüşümleri
    const lineData = istatistik.aylikHacim.map((h) => ({
        ay: `${AY_ADLARI[h.ay - 1]} ${String(h.yil).slice(-2)}`,
        Toplam: Number(h.toplam),
        Sayi: h.islemSayisi,
    }));

    const pieData = istatistik.urunDagilim.map((u) => ({
        name: u.urunAdi,
        value: u.sayi,
    }));

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Üst başlık */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <p
                        className="text-[11px] uppercase tracking-wider font-bold mb-1"
                        style={{ color: "#fbbf24" }}
                    >
                        Yönetici Paneli
                    </p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Genel Bakış<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Sistem genelinin anlık özeti ve aylık performans göstergeleri.
                    </p>
                </motion.div>

                {/* KPI kartları */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <KpiKart
                        Icon={IconUsers}
                        etiket="Toplam Müşteri"
                        deger={istatistik.toplamMusteri.toLocaleString("tr-TR")}
                        delay={0.05}
                    />
                    <KpiKart
                        Icon={IconShieldCheck}
                        etiket="Aktif Poliçe"
                        deger={istatistik.aktifPolice.toLocaleString("tr-TR")}
                        renk="emerald"
                        delay={0.1}
                    />
                    <KpiKart
                        Icon={IconClock}
                        etiket="Bekleyen Teklif"
                        deger={istatistik.bekleyenTeklif.toLocaleString("tr-TR")}
                        renk="amber"
                        delay={0.15}
                    />
                    <KpiKart
                        Icon={IconAlertTriangle}
                        etiket="Açık Hasar"
                        deger={istatistik.acikHasar.toLocaleString("tr-TR")}
                        renk="red"
                        delay={0.2}
                    />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 mb-5">
                    <KpiKart
                        Icon={IconCash}
                        etiket="Bu Ay Tahsil Edilen"
                        deger={paraFormat(istatistik.aylikPrimHacmi)}
                        renk="emerald"
                        delay={0.25}
                        buyuk
                    />
                    <KpiKart
                        Icon={IconTrendingUp}
                        etiket="Bu Ay Yeni Teklif"
                        deger={istatistik.aylikYeniTeklif.toLocaleString("tr-TR")}
                        renk="blue"
                        delay={0.3}
                        buyuk
                    />
                </div>

                {/* Grafikler */}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-5">
                    {/* Sol: Aylık ödeme hacmi (Line) */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="rounded-2xl p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <div className="flex items-baseline justify-between mb-4">
                            <div>
                                <h2 className="text-white text-base font-semibold">
                                    Aylık Tahsilat Hacmi
                                </h2>
                                <p className="text-white/45 text-[12px] mt-0.5">
                                    Son 6 ay — başarılı ödemelerin TL toplamı
                                </p>
                            </div>
                        </div>

                        {lineData.length === 0 ? (
                            <BosGrafik metin="Henüz ödeme verisi yok." />
                        ) : (
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="ay"
                                            stroke="rgba(255,255,255,0.4)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.4)"
                                            fontSize={11}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => paraKisa(v as number)}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "rgba(2,6,16,0.95)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                fontSize: 12,
                                            }}
                                            labelStyle={{ color: "#cbd5e1" }}
                                            formatter={(v) => paraFormat(Number(v))}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="Toplam"
                                            stroke="#cbd5e1"
                                            strokeWidth={2}
                                            dot={{ fill: "#cbd5e1", r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>

                    {/* Sağ: Ürün dağılımı (Donut) */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-2xl p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <h2 className="text-white text-base font-semibold mb-1">
                            Aktif Poliçe Dağılımı
                        </h2>
                        <p className="text-white/45 text-[12px] mb-4">
                            Ürün bazlı aktif poliçe sayısı
                        </p>

                        {pieData.length === 0 ? (
                            <BosGrafik metin="Aktif poliçe yok." />
                        ) : (
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={50}
                                            outerRadius={85}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={URUN_RENKLER[i % URUN_RENKLER.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: "rgba(2,6,16,0.95)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 12,
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Hasar durum dağılımı + Hızlı linkler */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
                    {/* Hasar durum kartı */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="rounded-2xl p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <h2 className="text-white text-base font-semibold mb-1">
                            Hasar Durumu
                        </h2>
                        <p className="text-white/45 text-[12px] mb-4">
                            Tüm hasar dosyalarının durum dağılımı
                        </p>

                        {istatistik.hasarDagilim.length === 0 ? (
                            <BosGrafik metin="Hasar kaydı yok." />
                        ) : (
                            <div className="flex flex-col gap-2">
                                {istatistik.hasarDagilim.map((h) => {
                                    const renk = HASAR_RENKLER[h.durum] ?? "#94a3b8";
                                    const toplam = istatistik.hasarDagilim.reduce((s, x) => s + x.sayi, 0);
                                    const yuzde = toplam > 0 ? (h.sayi / toplam) * 100 : 0;
                                    return (
                                        <div key={h.durum}>
                                            <div className="flex items-center justify-between text-[12px] mb-1">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ background: renk }}
                                                    />
                                                    <span className="text-white/85 font-medium">{h.durum}</span>
                                                </span>
                                                <span className="text-white/55 tabular-nums">
                                                    {h.sayi} <span className="text-white/35">({yuzde.toFixed(0)}%)</span>
                                                </span>
                                            </div>
                                            <div
                                                className="h-1.5 rounded-full overflow-hidden"
                                                style={{ background: "rgba(255,255,255,0.04)" }}
                                            >
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${yuzde}%` }}
                                                    transition={{ delay: 0.6, duration: 0.6 }}
                                                    className="h-full rounded-full"
                                                    style={{ background: renk }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <Link
                            href="/admin/hasarlar"
                            className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-white/55 hover:text-white/90 transition-colors"
                        >
                            Tüm hasarları yönet
                            <IconArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </motion.div>

                    {/* Hızlı linkler */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-2xl p-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                        }}
                    >
                        <h2 className="text-white text-base font-semibold mb-1">Hızlı Erişim</h2>
                        <p className="text-white/45 text-[12px] mb-4">
                            Sık kullanılan yönetim sayfaları
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                            <HizliLink
                                Icon={IconUsers}
                                etiket="Müşteriler"
                                desc="Tüm müşteri listesi"
                                href="/admin/musteriler"
                            />
                            <HizliLink
                                Icon={IconAlertTriangle}
                                etiket="Açık Hasarlar"
                                desc={`${istatistik.acikHasar} dosya inceleme bekliyor`}
                                href="/admin/hasarlar"
                                vurgu={istatistik.acikHasar > 0}
                            />
                            <HizliLink
                                Icon={IconClock}
                                etiket="Bekleyen Teklifler"
                                desc={`${istatistik.bekleyenTeklif} teklif onay bekliyor`}
                                href="/admin/policeler?durum=Teklif Bekliyor"
                                vurgu={istatistik.bekleyenTeklif > 0}
                            />
                            <HizliLink
                                Icon={IconPackage}
                                etiket="Ürün Yönetimi"
                                desc="Fiyat ve teminat ayarları"
                                href="/admin/urunler"
                            />
                            <HizliLink
                                Icon={IconBell}
                                etiket="Bildirim Yayınla"
                                desc="Tüm müşterilere duyuru gönder"
                                href="/admin/bildirim"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────

function KpiKart({
    Icon, etiket, deger, renk = "slate", delay = 0, buyuk = false,
}: {
    Icon: React.ElementType;
    etiket: string;
    deger: string;
    renk?: "slate" | "emerald" | "amber" | "red" | "blue";
    delay?: number;
    buyuk?: boolean;
}) {
    const renkPalet = {
        slate: { bg: "rgba(226,232,240,0.06)", border: "rgba(226,232,240,0.2)", icon: "#cbd5e1" },
        emerald: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", icon: "rgb(110,231,183)" },
        amber: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", icon: "rgb(252,211,77)" },
        red: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", icon: "rgb(252,165,165)" },
        blue: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", icon: "rgb(147,197,253)" },
    }[renk];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="rounded-2xl p-5"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: renkPalet.bg, border: `1px solid ${renkPalet.border}` }}
                >
                    <Icon className="w-4 h-4" style={{ color: renkPalet.icon }} />
                </div>
                <p className="text-white/45 text-[10.5px] uppercase tracking-wider font-medium">
                    {etiket}
                </p>
            </div>
            <p className={`text-white font-bold tabular-nums ${buyuk ? "text-3xl" : "text-2xl"}`}>
                {deger}
            </p>
        </motion.div>
    );
}

function HizliLink({
    Icon, etiket, desc, href, vurgu,
}: {
    Icon: React.ElementType;
    etiket: string;
    desc: string;
    href: string;
    vurgu?: boolean;
}) {
    return (
        <Link
            href={href}
            className="group/link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.03]"
            style={{
                border: vurgu ? "1px solid rgba(245,158,11,0.18)" : "1px solid transparent",
                background: vurgu ? "rgba(245,158,11,0.04)" : "transparent",
            }}
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                    background: vurgu ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                    border: vurgu ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: vurgu ? "rgb(252,211,77)" : "#cbd5e1" }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white/85 text-[13px] font-medium truncate">{etiket}</p>
                <p className="text-white/40 text-[11px] truncate">{desc}</p>
            </div>
            <IconArrowRight className="w-3.5 h-3.5 text-white/25 group-hover/link:text-white/60 group-hover/link:translate-x-0.5 transition-all" />
        </Link>
    );
}

function BosGrafik({ metin }: { metin: string }) {
    return (
        <div className="h-[200px] flex items-center justify-center text-white/35 text-[12px]">
            {metin}
        </div>
    );
}

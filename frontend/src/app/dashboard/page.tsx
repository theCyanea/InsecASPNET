"use client";

import { useMusteri, Police, Musteri } from "@/hooks/useMusteri";
import { motion } from "motion/react";
import Link from "next/link";
import {
    IconShieldCheck,
    IconClock,
    IconAlertTriangle,
    IconArrowRight,
    IconFileDescription,
    IconHeadset,
    IconChevronRight,
    IconCheck,
    IconSparkles,
} from "@tabler/icons-react";

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function statusRenk(status: string) {
    const map: Record<string, { text: string; bg: string; border: string }> = {
        "Aktif Poliçe":        { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        "Teklif Bekliyor":     { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
        "Teklif İptal Edildi": { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
        "Poliçe İptal Edildi": { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
    };
    return map[status] ?? { text: "text-white/40", bg: "bg-white/5", border: "border-white/10" };
}

function tarih(str: string) {
    return new Date(str).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Ortak: Başlık ───────────────────────────────────────────────────────────

function Baslik({ musteri, altYazi }: { musteri: Musteri | null; altYazi: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-8 flex items-end justify-between max-w-5xl mx-auto w-full"
        >
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                    Hoş geldin, {musteri?.adi}
                    {/* Platin nokta — önceden sky-400'dü, premium hissiyat için gümüş */}
                    <span style={{ color: "#cbd5e1" }}>.</span>
                </h1>
                <p className="text-white/45 text-sm mt-1">{altYazi}</p>
            </div>
            <p className="text-white/35 text-sm hidden lg:block">
                {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
        </motion.div>
    );
}

// ─── MOD A: Onboarding (yeni kullanıcı, poliçesi yok) ────────────────────────
// Radikal sade: tek hero, tek mesaj, tek aksiyon. Feature kartları yok.
// Projenin teması: navy zemin + dark glass hero + sky aksan.

function OnboardingDashboard({ musteri }: { musteri: Musteri | null }) {
    const adimlar = [
        { tamam: true,  baslik: "Hesabını oluştur" },
        { tamam: false, baslik: "İlk teklifini al" },
        { tamam: false, baslik: "Poliçeni aktive et" },
    ];
    const ilerleme = (adimlar.filter(a => a.tamam).length / adimlar.length) * 100;

    return (
        // Dış sarmalayıcı: dikey ortala + max genişlik → hero ekranın merkezinde otursun,
        // boşluklar navy dokuyla dolsun (ölü alan değil, "sahne ışığı")
        <div className="min-h-[calc(100vh-2rem)] p-6 lg:p-8 flex flex-col">
            <Baslik musteri={musteri} altYazi="Sigorta yolculuğuna başlayalım." />

            {/* ── Tek hero kart — dark glass, navy + platin tema ───────────
                - Aksan rengi sky'dan platin gümüşe geçti (premium hissiyat)
                - Sol: rozet + başlık + CTA + 3 adım şeridi
                - Sağ: tilted ÖRNEK kartı */}
            <div className="flex-1 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="relative rounded-3xl overflow-hidden w-full max-w-5xl mx-auto"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(2,6,16,0.7) 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 30px 80px -30px rgba(2,8,20,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
                    backdropFilter: "blur(8px)",
                }}
            >
                {/* Platin glow — üst sol (beyaz/gümüş tonu, parlak mavi değil) */}
                <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(226,232,240,0.08), transparent 65%)" }} />
                {/* Platin glow — alt sağ (preview kartın arkasında hafif aura) */}
                <div className="pointer-events-none absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(203,213,225,0.06), transparent 70%)" }} />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 p-8 lg:p-12">

                    {/* SOL — 3/5 */}
                    <div className="lg:col-span-3">
                        {/* Rozet — platin tint, nötr gümüş */}
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(226,232,240,0.18)" }}>
                            <IconSparkles className="w-3 h-3" style={{ color: "#cbd5e1" }} />
                            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: "#e2e8f0" }}>Yeni Hesap</span>
                        </div>

                        {/* Başlık — "hazırsın" için platin gradient metin */}
                        <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-[1.1]">
                            Birkaç adımda{" "}
                            <span
                                className="bg-clip-text text-transparent"
                                style={{ backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)" }}
                            >
                                hazırsın
                            </span>
                            .
                        </h2>
                        <p className="text-white/55 text-sm mt-3 max-w-lg leading-relaxed">
                            İlk teklifini dakikalar içinde al, poliçeni anında yürürlüğe koy.
                        </p>

                        {/* CTA — yukarıda, sayfanın ağırlık merkezi burada */}
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.3 }}
                            className="mt-7 flex items-center gap-2 flex-wrap"
                        >
                            {/* CTA — platin gradient (beyaz→gümüş) + koyu metin.
                                Tesla/Apple benzeri premium "inverted button" görünümü. */}
                            <Link
                                href="/dashboard/teklif-al"
                                className="group/cta inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                                style={{
                                    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                    color: "#0f172a",
                                    boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                    border: "1px solid rgba(226,232,240,0.5)",
                                }}
                            >
                                Hemen teklif al
                                <IconArrowRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" />
                            </Link>
                            <Link
                                href="/dashboard/destek"
                                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
                            >
                                Nasıl çalışır?
                            </Link>
                        </motion.div>

                        {/* Kompakt 3-adım şeridi — satır içi, yer kaplamıyor */}
                        <div className="mt-8 max-w-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] text-white/50 font-medium">
                                    <span className="text-white font-semibold tabular-nums">1/3</span> adım tamamlandı
                                </span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                                {/* Platin gradient — gümüş şerit */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${ilerleme}%` }}
                                    transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                                    className="h-full rounded-full"
                                    style={{ background: "linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #f1f5f9 100%)" }}
                                />
                            </div>
                            {/* Küçük pill'ler — yatay, kompakt */}
                            <div className="flex flex-wrap gap-1.5">
                                {adimlar.map((a, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
                                        style={{
                                            background: a.tamam ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
                                            border: `1px solid ${a.tamam ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.07)"}`,
                                            color: a.tamam ? "rgb(110, 231, 183)" : "rgba(255,255,255,0.5)",
                                        }}
                                    >
                                        {a.tamam
                                            ? <IconCheck className="w-3 h-3" strokeWidth={2.5} />
                                            : <span className="tabular-nums font-semibold text-white/40">{i + 1}</span>}
                                        {a.baslik}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ — 2/5 : tilted preview */}
                    <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center min-h-[360px]">
                        <HedefPreview />
                    </div>
                </div>
            </motion.div>
            </div>
        </div>
    );
}

// ─── Hedef preview kartı (hero sağ) ──────────────────────────────────────────
function HedefPreview() {
    return (
        <div className="relative w-full h-full flex items-center justify-center pr-4">
            <motion.div
                initial={{ opacity: 0, y: 20, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 3 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative"
                style={{ transform: "rotate(3deg)" }}
            >
                {/* Ana kart — dark üstüne biraz daha parlak dark (kontrast için) */}
                <div className="relative w-[300px] rounded-2xl p-5 overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, #1e293b, #0f172a)",
                        border: "1px solid rgba(148,163,184,0.22)",
                        // Inset ring: sky'dan platine çevrildi
                        boxShadow: "0 30px 60px -15px rgba(0,0,0,0.6), 0 10px 20px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(226,232,240,0.15) inset",
                    }}
                >
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)" }} />

                    <span
                        className="absolute top-3 right-3 text-[9px] font-bold text-white/25 tracking-[0.2em] select-none pointer-events-none"
                        style={{ transform: "rotate(12deg)" }}
                    >
                        ÖRNEK
                    </span>

                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span className="text-[10px] font-medium text-emerald-400 tracking-wider uppercase">Aktif</span>
                    </div>

                    <p className="text-white/90 text-sm font-semibold">Kasko Sigortası</p>
                    <p className="text-white/40 text-[11px] font-mono mt-0.5">#P-2025-0482</p>

                    <div className="h-px my-4" style={{ background: "rgba(255,255,255,0.06)" }} />

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[10px] text-white/45 tracking-wider uppercase">Yıllık Prim</p>
                            <p className="text-white text-xl font-bold tabular-nums mt-0.5">₺4.280</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-white/45 tracking-wider uppercase">Kalan</p>
                            <p className="text-white/80 text-sm font-medium mt-0.5">328 gün</p>
                        </div>
                    </div>
                </div>

                {/* Alt caption */}
                <p className="absolute left-0 right-0 -bottom-6 text-center text-[10px] italic text-white/35 tracking-wide">
                    Örnek görünüm
                </p>
            </motion.div>
        </div>
    );
}

// ─── MOD B: Metrikler (poliçesi olan kullanıcı) ──────────────────────────────

function StatKart({
    label, value, sub, renk, Icon, delay,
}: {
    label: string; value: string | number; sub?: string;
    renk: string; Icon: React.ElementType; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35 }}
            className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
            <div className="flex items-center justify-between">
                <p className="text-white/40 text-xs font-medium tracking-wide uppercase">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <Icon className={`w-4 h-4 ${renk}`} />
                </div>
            </div>
            <div>
                <p className={`text-3xl font-bold tracking-tight ${renk}`}>{value}</p>
                {sub && <p className="text-white/25 text-xs mt-1">{sub}</p>}
            </div>
        </motion.div>
    );
}

function PoliceKarti({ police, index }: { police: Police; index: number }) {
    const s = statusRenk(police.status);
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.07, duration: 0.3 }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-150 group/row cursor-pointer hover:bg-white/[0.04]"
        >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <IconShieldCheck className="w-4 h-4 text-white/30" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium truncate">
                    {police.product?.productName ?? "Sigorta Ürünü"}
                </p>
                <p className="text-white/25 text-[11px] font-mono mt-0.5">
                    {police.policyNumber} · {tarih(police.startDate)} – {tarih(police.endDate)}
                </p>
            </div>

            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${s.text} ${s.bg} ${s.border} flex-shrink-0`}>
                {police.status}
            </span>

            <p className="text-white/70 text-sm font-semibold flex-shrink-0 tabular-nums">
                ₺{police.price.toLocaleString("tr-TR")}
            </p>

            <IconChevronRight className="w-4 h-4 text-white/15 group-hover/row:text-white/40 transition-colors flex-shrink-0" />
        </motion.div>
    );
}

function HizliIslem({
    href, label, desc, Icon, renk, delay,
}: {
    href: string; label: string; desc: string;
    Icon: React.ElementType; renk: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
        >
            <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-150 group/action hover:bg-white/[0.05]"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${renk}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <p className="text-white/75 text-sm font-medium">{label}</p>
                    <p className="text-white/30 text-[11px] mt-0.5">{desc}</p>
                </div>
                <IconArrowRight className="w-4 h-4 text-white/15 group-hover/action:text-white/50 group-hover/action:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
        </motion.div>
    );
}

function MetricsDashboard({ musteri, policeler }: { musteri: Musteri | null; policeler: Police[] }) {
    const aktif    = policeler.filter(p => p.status === "Aktif Poliçe");
    const bekleyen = policeler.filter(p => p.status === "Teklif Bekliyor");
    const sonPoliceler = [...policeler].slice(0, 5);

    return (
        <div className="min-h-full p-6 lg:p-8 ">
            <Baslik musteri={musteri} altYazi="Sigorta portföyünüze genel bakış." />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatKart label="Aktif Poliçe"    value={aktif.length}     sub="yürürlükte"    renk="text-emerald-400" Icon={IconShieldCheck}     delay={0.05} />
                <StatKart label="Bekleyen Teklif" value={bekleyen.length}  sub="onay bekliyor" renk="text-amber-400"   Icon={IconClock}           delay={0.1}  />
                <StatKart label="Toplam Poliçe"   value={policeler.length} sub="tüm kayıtlar"  renk="text-white/70"    Icon={IconFileDescription} delay={0.15} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                    className="lg:col-span-3 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    <div className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2.5">
                            <IconShieldCheck className="w-4 h-4 text-white/30" />
                            <p className="text-white/70 text-sm font-medium">Son Poliçeler</p>
                        </div>
                        <Link href="/dashboard/policeler"
                            className="flex items-center gap-1 text-[12px] transition-colors"
                            style={{ color: "#cbd5e1" }}>
                            Tümünü gör <IconArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="p-2">
                        {sonPoliceler.map((p, i) => (
                            <Link key={p.id} href={`/dashboard/policeler`}>
                                <PoliceKarti police={p} index={i} />
                            </Link>
                        ))}
                    </div>
                </motion.div>

                <div className="lg:col-span-2 flex flex-col gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.35 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-white/70 text-sm font-medium">Hızlı İşlemler</p>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5">
                            <HizliIslem href="/dashboard/teklif-al"      label="Teklif Al"   desc="Yeni sigorta teklifi oluştur" Icon={IconFileDescription} renk="bg-slate-300/10 text-slate-200"     delay={0.35} />
                            <HizliIslem href="/dashboard/hasarlarim"     label="Hasarlarım"   desc="Hasar talepleri ve durumları" Icon={IconAlertTriangle}   renk="bg-red-500/15 text-red-400"         delay={0.4}  />
                            <HizliIslem href="/dashboard/policeler"      label="Poliçelerim" desc="Tüm poliçeleri görüntüle"     Icon={IconShieldCheck}     renk="bg-emerald-500/15 text-emerald-400" delay={0.45} />
                            <HizliIslem href="/dashboard/destek"         label="Destek"      desc="Yardım ve SSS"                Icon={IconHeadset}         renk="bg-white/[0.06] text-white/40"      delay={0.5}  />
                        </div>
                    </motion.div>

                    {bekleyen.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55, duration: 0.3 }}
                        >
                            <Link href="/dashboard/policeler"
                                className="block rounded-2xl p-5 transition-all duration-150 hover:border-amber-500/30"
                                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)" }}>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <IconClock className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-amber-400 text-sm font-medium">
                                            {bekleyen.length} teklif onay bekliyor
                                        </p>
                                        <p className="text-amber-400/50 text-[12px] mt-0.5 leading-relaxed">
                                            Bekleyen tekliflerinizi inceleyip onaylayabilirsiniz.
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Ana sayfa: yönlendirici ────────────────────────────────────────────────

export default function DashboardPage() {
    const { musteri, policeler, yukleniyor, hata } = useMusteri();

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center ">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }} />
            </div>
        );
    }

    if (hata) {
        return (
            <div className="h-full flex items-center justify-center text-red-400 text-sm ">{hata}</div>
        );
    }

    const bos = policeler.length === 0;

    return bos
        ? <OnboardingDashboard musteri={musteri} />
        : <MetricsDashboard musteri={musteri} policeler={policeler} />;
}

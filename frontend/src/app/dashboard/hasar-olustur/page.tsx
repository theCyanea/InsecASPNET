"use client";

// ─── /dashboard/hasar-olustur ────────────────────────────────────────────────
// Hasar bildirim akışının BAŞLANGIÇ sayfası — poliçe seçimi.
// Kullanıcının aktif poliçelerini listeler, tıklayınca o poliçeye özel
// hasar formuna yönlendirir (/hasar-olustur/[policyId]).
//
// Niye iki sayfaya bölünmüş:
//   - Bu sayfa: poliçeyi seç (input yok, sadece nav)
//   - [policyId] sayfası: form (poliçe artık belli)
//
// Müşterinin zaten sadece bir aktif poliçesi varsa otomatik o sayfaya
// yönlendiriyoruz — gereksiz bir tıklama olmasın.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useMusteri } from "@/hooks/useMusteri";
import {
    IconArrowLeft,
    IconArrowRight,
    IconAlertTriangle,
    IconShieldCheck,
    IconCar,
    IconHeartbeat,
    IconHome,
    IconPlane,
    IconShield,
    IconCalendarEvent,
    IconClock,
    IconInfoCircle,
} from "@tabler/icons-react";
import type { Police } from "@/hooks/useMusteri";

function tarihFormat(d: Date) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
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

export default function HasarOlusturPoliceSecPage() {
    const { policeler, yukleniyor } = useMusteri();
    const router = useRouter();
    const [otomatikYonlendirildi, setOtomatikYonlendirildi] = useState(false);

    // Sadece "Aktif Poliçe" durumundakiler için hasar açılabilir
    const aktifPoliceler = policeler.filter((p) => p.status === "Aktif Poliçe" && p.isActive);

    // ─── Auto-redirect: tek aktif poliçe varsa direkt forma git ─────────────
    // UX optimizasyonu — 1 poliçe varken seçim ekranı göstermek anlamsız.
    // useEffect ile yapıyoruz çünkü router.push render içinde çağrılamaz.
    useEffect(() => {
        if (yukleniyor || otomatikYonlendirildi) return;
        if (aktifPoliceler.length === 1) {
            setOtomatikYonlendirildi(true);
            router.replace(`/dashboard/hasar-olustur/${aktifPoliceler[0].id}`);
        }
    }, [yukleniyor, aktifPoliceler, router, otomatikYonlendirildi]);

    if (yukleniyor || otomatikYonlendirildi) {
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
            <div className="max-w-3xl mx-auto">
                {/* Üst başlık */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                >
                    <Link
                        href="/dashboard/hasarlarim"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-4"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Hasarlarım
                    </Link>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Hasar Bildir<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Hangi poliçeniz için hasar bildirimi açmak istiyorsunuz?
                    </p>
                </motion.div>

                {/* Boş durum — aktif poliçe yok */}
                {aktifPoliceler.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="rounded-2xl px-6 py-12 text-center"
                        style={{
                            background: "rgba(245,158,11,0.05)",
                            border: "1px solid rgba(245,158,11,0.2)",
                        }}
                    >
                        <IconAlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                        <p className="text-white text-base font-semibold">
                            Aktif poliçeniz bulunmuyor
                        </p>
                        <p className="text-white/55 text-[13px] mt-1.5 mb-5 max-w-sm mx-auto">
                            Hasar bildirimi yapabilmek için yürürlükteki bir poliçenizin olması gerekir.
                            Bekleyen tekliflerinizin ödemesini tamamlayabilir veya yeni teklif alabilirsiniz.
                        </p>
                        <div className="flex items-center gap-2 justify-center flex-wrap">
                            <Link
                                href="/dashboard/policeler"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/85 hover:text-white transition-colors"
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                }}
                            >
                                Poliçelerim
                            </Link>
                            <Link
                                href="/dashboard/teklif-al"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.02]"
                                style={{
                                    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                    color: "#0f172a",
                                    border: "1px solid rgba(226,232,240,0.5)",
                                }}
                            >
                                Yeni Teklif Al
                                <IconArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* Bilgi banner */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05, duration: 0.4 }}
                            className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5"
                            style={{
                                background: "rgba(59,130,246,0.05)",
                                border: "1px solid rgba(59,130,246,0.18)",
                            }}
                        >
                            <IconInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgb(147,197,253)" }} />
                            <p className="text-blue-200/85 text-[12.5px] leading-relaxed">
                                Hasar bildirimini sadece <strong>aktif</strong> ve
                                <strong> geçerlilik aralığında</strong> olan poliçeler için yapabilirsiniz.
                                Teklif aşamasındaki kayıtlarınız aşağıda görünmez.
                            </p>
                        </motion.div>

                        {/* Aktif poliçe kartları */}
                        <div className="flex flex-col gap-2.5">
                            {aktifPoliceler.map((p, i) => (
                                <PoliceSecimKarti key={p.id} police={p} index={i} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function PoliceSecimKarti({ police, index }: { police: Police; index: number }) {
    const Icon = urunIkonu(police.product?.productName ?? "");
    const baslangic = new Date(police.startDate);
    const bitis = new Date(police.endDate);
    const kalanGun = Math.max(0, Math.ceil((bitis.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
        >
            <Link
                href={`/dashboard/hasar-olustur/${police.id}`}
                className="group/card block rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.6), rgba(2,6,16,0.6))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 20px 60px -30px rgba(2,8,20,0.5)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <div className="px-5 lg:px-6 py-5 flex items-center gap-5">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                            background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.08))",
                            border: "1px solid rgba(16,185,129,0.25)",
                        }}
                    >
                        <Icon className="w-5 h-5" style={{ color: "rgb(110,231,183)" }} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white text-[15px] font-semibold truncate">
                                {police.product?.productName ?? "Sigorta Ürünü"}
                            </p>
                            <span
                                className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                                style={{
                                    background: "rgba(16,185,129,0.12)",
                                    border: "1px solid rgba(16,185,129,0.3)",
                                    color: "rgb(110,231,183)",
                                }}
                            >
                                <IconShieldCheck className="w-3 h-3" />
                                Aktif
                            </span>
                            {police.insuredPerson && (
                                <span
                                    className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md"
                                    style={{
                                        background: "rgba(226,232,240,0.08)",
                                        border: "1px solid rgba(226,232,240,0.2)",
                                        color: "#cbd5e1",
                                    }}
                                >
                                    {sigortaliKisaEtiket(police.insuredPerson.yakinlik)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-[12px] text-white/45">
                            <span className="font-mono tabular-nums">{police.policyNumber}</span>
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span className="inline-flex items-center gap-1">
                                <IconCalendarEvent className="w-3 h-3" />
                                {tarihFormat(baslangic)} → {tarihFormat(bitis)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/15" />
                            <span className="inline-flex items-center gap-1" style={{ color: "rgb(110,231,183)" }}>
                                <IconClock className="w-3 h-3" />
                                {kalanGun} gün kaldı
                            </span>
                        </div>
                    </div>

                    <IconArrowRight
                        className="w-4 h-4 text-white/30 transition-all duration-200 group-hover/card:text-white/80 group-hover/card:translate-x-1 flex-shrink-0"
                    />
                </div>
            </Link>
        </motion.div>
    );
}

function sigortaliKisaEtiket(yakinlik: string): string {
    const map: Record<string, string> = {
        Es: "Eşim",
        Anne: "Annem",
        Baba: "Babam",
        Cocuk: "Çocuğum",
        Kardes: "Kardeşim",
        Diger: "Yakınım",
    };
    return map[yakinlik] ?? yakinlik;
}

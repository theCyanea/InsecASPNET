"use client";

// ─── /admin layout — Admin paneline özel sidebar + role check ────────────────

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Avatar } from "@/components/insurtech/Avatar";
import { useMusteri } from "@/hooks/useMusteri";
import {
    IconLayoutDashboard,
    IconUsers,
    IconFileText,
    IconAlertTriangle,
    IconPackage,
    IconBell,
    IconLogout,
    IconShield,
    IconArrowLeft,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

const NAV = [
    { label: "Genel Bakış",        href: "/admin",            Icon: IconLayoutDashboard },
    { label: "Müşteriler",         href: "/admin/musteriler", Icon: IconUsers },
    { label: "Poliçeler",          href: "/admin/policeler",  Icon: IconFileText },
    { label: "Hasarlar",           href: "/admin/hasarlar",   Icon: IconAlertTriangle },
    { label: "Ürünler",            href: "/admin/urunler",    Icon: IconPackage },
    { label: "Bildirim Yayını",    href: "/admin/bildirim",   Icon: IconBell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(true);
    const { musteri, yukleniyor } = useMusteri();
    const [yetkili, setYetkili] = useState<boolean | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const handleMouseLeave = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 150);
    };

    useEffect(() => {
        if (yukleniyor) return;
        if (!musteri) { window.location.href = "/"; return; }
        if (musteri.rol !== "Admin") { router.replace("/dashboard"); return; }
        setYetkili(true);
    }, [yukleniyor, musteri, router]);

    const handleCikis = async () => {
        await fetch(`${API}/Customers/cikis-yap`, { method: "POST", credentials: "include" });
        window.location.href = "/";
    };

    if (!yetkili) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: "#040812" }}>
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }} />
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden relative" style={{ background: "#040812" }}>

            {/* ── Admin Sidebar — absolute, flex layout'u etkilemez ───── */}
            <motion.aside
                animate={{ width: open ? 230 : 60 }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute top-0 left-0 bottom-0 flex flex-col h-full overflow-hidden z-20"
                style={{
                    background: "#020610",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                }}
            >
                <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)" }} />

                <div className="relative z-10 flex flex-col h-full px-3 py-4">

                    {/* Logo + ADMIN rozeti */}
                    <div className="flex items-center gap-3 mb-6 h-10 px-1">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(15,23,42,0.2)",
                            }}
                        >
                            <IconShield className="w-4 h-4" style={{ color: "#0f172a" }} />
                        </div>
                        <AnimatePresence>
                            {open && (
                                <motion.div
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="flex flex-col"
                                >
                                    <span className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap leading-tight">
                                        in<span className="text-white/20">SEC</span>
                                    </span>
                                    <span className="text-[8.5px] font-bold tracking-wider uppercase"
                                        style={{ color: "#fbbf24" }}>
                                        Admin Paneli
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Müşteri paneline dön — px-2 sabit */}
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 py-2 mb-3 rounded-xl px-2 transition-colors hover:bg-white/[0.03]"
                    >
                        <IconArrowLeft className="w-4 h-4 flex-shrink-0 text-white/35" />
                        <AnimatePresence>
                            {open && (
                                <motion.span
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="text-[12px] font-medium text-white/45 whitespace-nowrap"
                                >
                                    Müşteri Panelim
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>

                    {/* Nav linkleri — px-2 sabit, justify-* YOK */}
                    <nav className="flex flex-col gap-0.5 flex-1">
                        {NAV.map(({ label, href, Icon }) => {
                            const aktif = pathname === href || (href !== "/admin" && pathname.startsWith(href));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className="relative flex items-center gap-3 py-2.5 rounded-xl px-2 group/link"
                                >
                                    {aktif && (
                                        <motion.div
                                            layoutId="admin-nav-pill"
                                            className="absolute inset-0 rounded-xl"
                                            style={{
                                                background: "rgba(245,158,11,0.08)",
                                                border: "1px solid rgba(245,158,11,0.2)",
                                            }}
                                            transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
                                        />
                                    )}
                                    {!aktif && (
                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover/link:opacity-100 transition-opacity"
                                            style={{ background: "rgba(255,255,255,0.04)" }} />
                                    )}
                                    <Icon
                                        className="relative z-10 w-5 h-5 flex-shrink-0 transition-colors"
                                        style={{ color: aktif ? "rgb(252,211,77)" : "rgba(255,255,255,0.35)" }}
                                    />
                                    <AnimatePresence>
                                        {open && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -4 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -4 }}
                                                transition={{ duration: 0.15 }}
                                                className="relative z-10 text-sm font-medium whitespace-nowrap"
                                                style={{ color: aktif ? "white" : "rgba(255,255,255,0.45)" }}
                                            >
                                                {label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Alt: profil + logout — px-2 sabit */}
                    <div>
                        {musteri && (
                            <Link
                                href="/dashboard/profil"
                                className="flex items-center gap-3 w-full py-2 rounded-xl mb-1 px-2 hover:bg-white/[0.04] transition-colors"
                            >
                                <Avatar
                                    adi={musteri.adi}
                                    soyadi={musteri.soyadi}
                                    avatarUrl={musteri.avatarUrl}
                                    boyut={32}
                                />
                                <AnimatePresence>
                                    {open && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="min-w-0 flex-1"
                                        >
                                            <p className="text-white/85 text-[12.5px] font-medium truncate">
                                                {musteri.adi} {musteri.soyadi}
                                            </p>
                                            <p className="text-[10px] tabular-nums truncate" style={{ color: "#fbbf24" }}>
                                                Yönetici
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Link>
                        )}

                        <div className="h-px mx-1 mb-3" style={{ background: "rgba(255,255,255,0.05)" }} />

                        <button
                            onClick={handleCikis}
                            className="relative flex items-center gap-3 w-full py-2.5 rounded-xl px-2 group/logout transition-colors"
                        >
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover/logout:opacity-100 transition-opacity"
                                style={{ background: "rgba(239,68,68,0.07)" }} />
                            <IconLogout className="relative z-10 w-5 h-5 flex-shrink-0 transition-colors text-white/25 group-hover/logout:text-red-400" />
                            <AnimatePresence>
                                {open && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -4 }}
                                        transition={{ duration: 0.15 }}
                                        className="relative z-10 text-sm font-medium whitespace-nowrap text-white/25 group-hover/logout:text-red-400 transition-colors"
                                    >
                                        Çıkış Yap
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* İçerik — ml-[60px] */}
            <main className="relative flex-1 overflow-y-auto ml-[60px]" style={{ background: "#040812" }}>
                <div className="pointer-events-none fixed inset-0 z-0">
                    <DotPattern width={28} height={28} cr={1}
                        className="text-slate-300/15 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,white,transparent_80%)]" />
                    <div className="absolute inset-x-0 top-0 h-[40vh]"
                        style={{ background: "radial-gradient(ellipse_at_top, rgba(245,158,11,0.04), transparent 70%)" }} />
                </div>
                <div className="relative z-10">{children}</div>
            </main>
        </div>
    );
}

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Avatar } from "@/components/insurtech/Avatar";
import { BildirimMerkezi } from "@/components/insurtech/BildirimMerkezi";
import { useMusteri } from "@/hooks/useMusteri";
import {
    IconLayoutDashboard,
    IconFileText,
    IconAlertCircle,
    IconUser,
    IconLogout,
    IconShield,
    IconHeadset,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

const NAV = [
    { label: "Genel Bakış",      href: "/dashboard",            Icon: IconLayoutDashboard },
    { label: "Poliçelerim",      href: "/dashboard/policeler",  Icon: IconFileText },
    { label: "Hasar Taleplerim", href: "/dashboard/hasarlarim", Icon: IconAlertCircle },
    { label: "Profilim",         href: "/dashboard/profil",     Icon: IconUser },
    { label: "Destek",           href: "/dashboard/destek",     Icon: IconHeadset },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(true);
    const { musteri } = useMusteri();
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const handleMouseLeave = () => {
        closeTimer.current = setTimeout(() => setOpen(false), 150);
    };

    const handleCikis = async () => {
        await fetch(`${API}/Customers/cikis-yap`, { method: "POST", credentials: "include" });
        window.location.href = "/";
    };

    return (
        <div className="h-screen flex overflow-hidden relative" style={{ background: "#040812" }}>

            <motion.aside
                animate={{ width: open ? 220 : 60 }}
                transition={{ type: "tween", ease: "easeInOut", duration: 0.25 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="relative flex-shrink-0 flex flex-col h-full overflow-hidden z-20"
                style={{
                    background: "#020610",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                }}
            >
                <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
                    style={{ background: "linear-gradient(180deg, rgba(226,232,240,0.06) 0%, transparent 100%)" }} />

                <div className="relative z-10 flex flex-col h-full px-3 py-4">

                    <div className="flex items-center gap-3 mb-6 h-10 px-1">
                        <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(15,23,42,0.2)",
                            }}>
                            <IconShield className="w-4 h-4" style={{ color: "#0f172a" }} />
                        </div>
                        <AnimatePresence>
                            {open && (
                                <motion.span
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -6 }}
                                    transition={{ duration: 0.18 }}
                                    className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap"
                                >
                                    in<span className="text-white/20">SEC</span>
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Nav linkleri — px-2 sabit, justify-* YOK */}
                    <nav className="flex flex-col gap-0.5 flex-1">
                        {NAV.map(({ label, href, Icon }) => {
                            const aktif = pathname === href;
                            return (
                                <a
                                    key={href}
                                    href={href}
                                    className="relative flex items-center gap-3 py-2.5 rounded-xl px-2 group/link"
                                >
                                    {aktif && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            className="absolute inset-0 rounded-xl"
                                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.07)" }}
                                            transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
                                        />
                                    )}
                                    {!aktif && (
                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover/link:opacity-100 transition-opacity duration-150"
                                            style={{ background: "rgba(255,255,255,0.04)" }} />
                                    )}

                                    <Icon
                                        className="relative z-10 w-5 h-5 flex-shrink-0 transition-colors duration-150"
                                        style={{ color: aktif ? "white" : "rgba(255,255,255,0.35)" }}
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
                                </a>
                            );
                        })}

                        <BildirimMerkezi open={open} />
                    </nav>

                    {/* Admin Paneli linki */}
                    {musteri?.rol === "Admin" && (
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 w-full py-2.5 rounded-xl mb-2 px-2 transition-colors"
                            style={{
                                background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.02))",
                                border: "1px solid rgba(245,158,11,0.2)",
                            }}
                        >
                            <IconShield className="w-5 h-5 flex-shrink-0" style={{ color: "rgb(252,211,77)" }} />
                            <AnimatePresence>
                                {open && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -4 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-[12.5px] font-semibold whitespace-nowrap"
                                        style={{ color: "rgb(252,211,77)" }}
                                    >
                                        Admin Paneli
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    )}

                    {/* Alt alan: profil + çıkış */}
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
                                            <p className="text-white/35 text-[10.5px] truncate">
                                                {musteri.email}
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
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover/logout:opacity-100 transition-opacity duration-150"
                                style={{ background: "rgba(239,68,68,0.07)" }} />
                            <IconLogout
                                className="relative z-10 w-5 h-5 flex-shrink-0 transition-colors duration-150 text-white/25 group-hover/logout:text-red-400"
                            />
                            <AnimatePresence>
                                {open && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -4 }}
                                        transition={{ duration: 0.15 }}
                                        className="relative z-10 text-sm font-medium whitespace-nowrap text-white/25 group-hover/logout:text-red-400 transition-colors duration-150"
                                    >
                                        Çıkış Yap
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* ── İçerik — ml-[60px] collapsed sidebar kadar offset ───── */}
            <main className="relative flex-1 overflow-y-auto" style={{ background: "#040812" }}>
                <div className="pointer-events-none fixed inset-0 z-0">
                    <DotPattern
                        width={28}
                        height={28}
                        cr={1}
                        className="text-slate-300/15 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,white,transparent_80%)]"
                    />
                    <div className="absolute inset-x-0 top-0 h-[40vh]"
                        style={{ background: "radial-gradient(ellipse_at_top, rgba(226,232,240,0.05), transparent 70%)" }} />
                </div>
                <div className="relative z-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

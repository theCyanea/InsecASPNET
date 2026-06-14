"use client";

// ─── /dashboard/profil ───────────────────────────────────────────────────────
// Kullanıcı profil sayfası. 3 sekme:
//   1) Profil Bilgileri  → ad/soyad/email/telefon (düzenlenebilir)
//   2) Güvenlik          → şifre değiştirme
//   3) Hesap Bilgileri   → TC, doğum tarihi, üyelik tarihi (read-only)
//
// Sol tarafta avatar + tıklanınca dosya seçici → upload → otomatik güncellenir.
// Avatar yoksa kullanıcının baş harflerinden gradient fallback gösteriliyor.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "@/components/insurtech/Avatar";
import {
    IconArrowLeft,
    IconUser,
    IconLock,
    IconShieldCheck,
    IconCamera,
    IconCheck,
    IconAlertCircle,
    IconTrash,
    IconLoader2,
    IconEye,
    IconEyeOff,
    IconMail,
    IconPhone,
    IconHash,
    IconCalendarEvent,
} from "@tabler/icons-react";
import type { Musteri } from "@/hooks/useMusteri";

const API = "http://localhost:5156/api";

type Sekme = "profil" | "guvenlik" | "hesap";

export default function ProfilPage() {
    const [musteri, setMusteri] = useState<Musteri | null>(null);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState("");
    const [sekme, setSekme] = useState<Sekme>("profil");

    const cekProfil = async () => {
        try {
            const r = await fetch(`${API}/Customers/ben`, { credentials: "include" });
            if (r.status === 401) {
                window.location.href = "/";
                return;
            }
            if (!r.ok) throw new Error();
            const data = await r.json();
            setMusteri(data);
        } catch {
            setHata("Profil yüklenemedi.");
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => { cekProfil(); }, []);

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

    if (hata || !musteri) {
        return (
            <div className="min-h-full p-6 lg:p-8">
                <div className="max-w-3xl mx-auto">
                    <div
                        className="rounded-2xl p-8 text-center"
                        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                        <p className="text-white">{hata || "Profil bulunamadı."}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Üst */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors mb-4"
                    >
                        <IconArrowLeft className="w-4 h-4" />
                        Dashboard
                    </Link>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Profilim<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Hesap bilgilerinizi yönetin ve güvenlik ayarlarınızı güncelleyin.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
                    {/* Sol — Avatar + sekmeler */}
                    <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                        className="rounded-2xl p-5 flex flex-col gap-5"
                        style={{
                            background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                            border: "1px solid rgba(255,255,255,0.06)",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        <AvatarBolumu musteri={musteri} onGuncellendi={cekProfil} />

                        <div className="flex flex-col gap-1">
                            <SekmeButton
                                aktif={sekme === "profil"}
                                onClick={() => setSekme("profil")}
                                Icon={IconUser}
                                etiket="Profil Bilgileri"
                            />
                            <SekmeButton
                                aktif={sekme === "guvenlik"}
                                onClick={() => setSekme("guvenlik")}
                                Icon={IconLock}
                                etiket="Güvenlik"
                            />
                            <SekmeButton
                                aktif={sekme === "hesap"}
                                onClick={() => setSekme("hesap")}
                                Icon={IconShieldCheck}
                                etiket="Hesap Bilgileri"
                            />
                        </div>
                    </motion.div>

                    {/* Sağ — sekme içeriği */}
                    <motion.div
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <AnimatePresence mode="wait">
                            {sekme === "profil" && (
                                <ProfilSekmesi key="profil" musteri={musteri} onGuncellendi={cekProfil} />
                            )}
                            {sekme === "guvenlik" && <GuvenlikSekmesi key="guvenlik" />}
                            {sekme === "hesap" && <HesapBilgileriSekmesi key="hesap" musteri={musteri} />}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ─── Avatar bölümü — değiştir / kaldır ───────────────────────────────────────
function AvatarBolumu({
    musteri,
    onGuncellendi,
}: {
    musteri: Musteri;
    onGuncellendi: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState("");

    const dosyaSec = () => inputRef.current?.click();

    const dosyaSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";  // aynı dosyayı tekrar seçebilmek için reset
        if (!file) return;

        setHata("");
        setYukleniyor(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch(`${API}/Customers/profilim/avatar-yukle`, {
                method: "POST",
                credentials: "include",
                body: fd,
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Avatar yüklenemedi.");
                return;
            }
            onGuncellendi();
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setYukleniyor(false);
        }
    };

    const avatarKaldir = async () => {
        setHata("");
        setYukleniyor(true);
        try {
            const r = await fetch(`${API}/Customers/profilim/avatar-kaldir`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!r.ok) {
                setHata("Avatar kaldırılamadı.");
                return;
            }
            onGuncellendi();
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setYukleniyor(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <Avatar adi={musteri.adi} soyadi={musteri.soyadi} avatarUrl={musteri.avatarUrl} boyut={120} />
                {yukleniyor && (
                    <div
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
                    >
                        <IconLoader2 className="w-7 h-7 text-white animate-spin" />
                    </div>
                )}
                {/* Hover overlay — kamera ikonu */}
                <button
                    type="button"
                    onClick={dosyaSec}
                    disabled={yukleniyor}
                    className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        border: "2px solid #0f172a",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                    title="Avatar değiştir"
                >
                    <IconCamera className="w-4 h-4" />
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={dosyaSecildi}
                    className="hidden"
                />
            </div>

            <div className="text-center">
                <p className="text-white text-sm font-semibold">
                    {musteri.adi} {musteri.soyadi}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5">{musteri.email}</p>
            </div>

            {/* Avatar kaldır butonu — sadece avatar varsa */}
            {musteri.avatarUrl && (
                <button
                    type="button"
                    onClick={avatarKaldir}
                    disabled={yukleniyor}
                    className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                    <IconTrash className="w-3 h-3" />
                    Avatarı kaldır
                </button>
            )}

            {hata && (
                <p className="text-[11px] text-red-300 text-center">{hata}</p>
            )}

            <p className="text-white/30 text-[10px] text-center leading-snug">
                JPG, PNG veya WebP · Maks 2 MB
            </p>
        </div>
    );
}

function SekmeButton({
    aktif, onClick, Icon, etiket,
}: {
    aktif: boolean; onClick: () => void; Icon: React.ElementType; etiket: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left"
            style={{
                background: aktif
                    ? "linear-gradient(135deg, rgba(226,232,240,0.1), rgba(148,163,184,0.04))"
                    : "transparent",
                border: aktif
                    ? "1px solid rgba(226,232,240,0.3)"
                    : "1px solid transparent",
                color: aktif ? "#ffffff" : "rgba(255,255,255,0.55)",
            }}
        >
            <Icon className="w-4 h-4" />
            {etiket}
        </button>
    );
}

// ─── SEKME 1: Profil Bilgileri ───────────────────────────────────────────────
function ProfilSekmesi({
    musteri,
    onGuncellendi,
}: {
    musteri: Musteri;
    onGuncellendi: () => void;
}) {
    const [adi, setAdi] = useState(musteri.adi);
    const [soyadi, setSoyadi] = useState(musteri.soyadi);
    const [email, setEmail] = useState(musteri.email);
    const [telefon, setTelefon] = useState(formatTelefon(musteri.telefonNo));

    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    // Değişiklik var mı? — kaydet butonu için
    const degistiMi =
        adi.trim() !== musteri.adi ||
        soyadi.trim() !== musteri.soyadi ||
        email.trim().toLowerCase() !== musteri.email.toLowerCase() ||
        telefon.replace(/\D/g, "") !== musteri.telefonNo;

    const kaydet = async () => {
        setHata("");
        setBasari("");
        setKaydediliyor(true);
        try {
            const r = await fetch(`${API}/Customers/profilim/guncelle`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    adi: adi.trim(),
                    soyadi: soyadi.trim(),
                    email: email.trim(),
                    telefonNo: telefon.replace(/\D/g, ""),
                }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Güncellenemedi.");
                return;
            }
            setBasari("Profil bilgileriniz güncellendi.");
            onGuncellendi();
            setTimeout(() => setBasari(""), 3000);
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setKaydediliyor(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 lg:p-8"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(8px)",
            }}
        >
            <h2 className="text-white text-lg font-semibold mb-1">Profil Bilgileri</h2>
            <p className="text-white/45 text-[12.5px] mb-6">
                Ad, soyad, telefon ve e-posta bilgilerinizi güncelleyebilirsiniz.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormAlani label="Ad" Icon={IconUser}>
                    <input
                        type="text"
                        value={adi}
                        onChange={(e) => setAdi(e.target.value)}
                        disabled={kaydediliyor}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                        style={inputStyle}
                    />
                </FormAlani>

                <FormAlani label="Soyad" Icon={IconUser}>
                    <input
                        type="text"
                        value={soyadi}
                        onChange={(e) => setSoyadi(e.target.value)}
                        disabled={kaydediliyor}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                        style={inputStyle}
                    />
                </FormAlani>

                <FormAlani label="E-Posta" Icon={IconMail}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={kaydediliyor}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                        style={inputStyle}
                    />
                </FormAlani>

                <FormAlani label="Telefon" Icon={IconPhone}>
                    <input
                        type="tel"
                        value={telefon}
                        onChange={(e) => setTelefon(formatTelefon(e.target.value))}
                        disabled={kaydediliyor}
                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50 tabular-nums"
                        style={inputStyle}
                    />
                </FormAlani>
            </div>

            {hata && (
                <div
                    className="mt-4 rounded-xl px-4 py-3 text-[12.5px] flex items-start gap-2"
                    style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "rgb(252,165,165)",
                    }}
                >
                    <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {hata}
                </div>
            )}

            {basari && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl px-4 py-3 text-[12.5px] flex items-start gap-2"
                    style={{
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        color: "rgb(110,231,183)",
                    }}
                >
                    <IconCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {basari}
                </motion.div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={kaydet}
                    disabled={!degistiMi || kaydediliyor}
                    className="group/cta inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    {kaydediliyor ? (
                        <>
                            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>Değişiklikleri Kaydet</>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

// ─── SEKME 2: Şifre Değiştirme ───────────────────────────────────────────────
function GuvenlikSekmesi() {
    const [eskiSifre, setEskiSifre] = useState("");
    const [yeniSifre, setYeniSifre] = useState("");
    const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
    const [eskiGoster, setEskiGoster] = useState(false);
    const [yeniGoster, setYeniGoster] = useState(false);

    const [kaydediliyor, setKaydediliyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    const formGecerli =
        eskiSifre.length > 0 &&
        yeniSifre.length >= 8 &&
        yeniSifre === yeniSifreTekrar &&
        yeniSifre !== eskiSifre;

    const sifreDegistir = async () => {
        setHata("");
        setBasari("");
        setKaydediliyor(true);
        try {
            const r = await fetch(`${API}/Customers/profilim/sifre-degistir`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ eskiSifre, yeniSifre }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Şifre değiştirilemedi.");
                return;
            }
            setBasari("Şifreniz başarıyla güncellendi.");
            setEskiSifre("");
            setYeniSifre("");
            setYeniSifreTekrar("");
            setTimeout(() => setBasari(""), 4000);
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setKaydediliyor(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 lg:p-8"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(8px)",
            }}
        >
            <h2 className="text-white text-lg font-semibold mb-1">Şifre Değiştir</h2>
            <p className="text-white/45 text-[12.5px] mb-6">
                Hesap güvenliğiniz için düzenli olarak şifrenizi değiştirmenizi öneririz.
            </p>

            <div className="flex flex-col gap-4 max-w-md">
                <FormAlani label="Mevcut Şifre" Icon={IconLock}>
                    <SifreInput
                        value={eskiSifre}
                        onChange={setEskiSifre}
                        goster={eskiGoster}
                        setGoster={setEskiGoster}
                        disabled={kaydediliyor}
                        placeholder="Mevcut şifreniz"
                    />
                </FormAlani>

                <FormAlani label="Yeni Şifre" Icon={IconLock}>
                    <SifreInput
                        value={yeniSifre}
                        onChange={setYeniSifre}
                        goster={yeniGoster}
                        setGoster={setYeniGoster}
                        disabled={kaydediliyor}
                        placeholder="En az 8 karakter"
                    />
                    {/* Inline kurallar — kullanıcı yazarken anlık feedback */}
                    <div className="mt-1.5 flex flex-col gap-0.5">
                        <KuralSatiri
                            saglandi={yeniSifre.length >= 8}
                            metin="En az 8 karakter"
                        />
                        <KuralSatiri
                            saglandi={yeniSifre.length > 0 && yeniSifre !== eskiSifre}
                            metin="Eskisinden farklı"
                        />
                    </div>
                </FormAlani>

                <FormAlani label="Yeni Şifre (Tekrar)" Icon={IconLock}>
                    <SifreInput
                        value={yeniSifreTekrar}
                        onChange={setYeniSifreTekrar}
                        goster={yeniGoster}
                        setGoster={setYeniGoster}
                        disabled={kaydediliyor}
                        placeholder="Yeni şifrenizi tekrar girin"
                    />
                    {yeniSifreTekrar.length > 0 && (
                        <KuralSatiri
                            saglandi={yeniSifre === yeniSifreTekrar}
                            metin="Şifreler eşleşiyor"
                        />
                    )}
                </FormAlani>
            </div>

            {hata && (
                <div
                    className="mt-4 rounded-xl px-4 py-3 text-[12.5px] flex items-start gap-2 max-w-md"
                    style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "rgb(252,165,165)",
                    }}
                >
                    <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {hata}
                </div>
            )}

            {basari && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl px-4 py-3 text-[12.5px] flex items-start gap-2 max-w-md"
                    style={{
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        color: "rgb(110,231,183)",
                    }}
                >
                    <IconCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {basari}
                </motion.div>
            )}

            <div className="mt-6 max-w-md flex justify-end">
                <button
                    type="button"
                    onClick={sifreDegistir}
                    disabled={!formGecerli || kaydediliyor}
                    className="group/cta inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                        color: "#0f172a",
                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                        border: "1px solid rgba(226,232,240,0.5)",
                    }}
                >
                    {kaydediliyor ? (
                        <>
                            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                            Güncelleniyor...
                        </>
                    ) : (
                        <>Şifreyi Değiştir</>
                    )}
                </button>
            </div>
        </motion.div>
    );
}

// ─── SEKME 3: Hesap Bilgileri (read-only) ────────────────────────────────────
function HesapBilgileriSekmesi({ musteri }: { musteri: Musteri }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-6 lg:p-8"
            style={{
                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                border: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(8px)",
            }}
        >
            <h2 className="text-white text-lg font-semibold mb-1">Hesap Bilgileri</h2>
            <p className="text-white/45 text-[12.5px] mb-6">
                Bu bilgiler kayıt sırasında doğrulandı ve değiştirilemez.
                Değişiklik için lütfen müşteri hizmetlerine başvurun.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SabitBilgi
                    Icon={IconHash}
                    etiket="TC Kimlik No"
                    deger={musteri.kimlikNo
                        ? `${musteri.kimlikNo.slice(0, 3)}******${musteri.kimlikNo.slice(-2)}`
                        : "—"}
                />
                <SabitBilgi
                    Icon={IconCalendarEvent}
                    etiket="Doğum Tarihi"
                    deger={musteri.dogumTarihi
                        ? new Date(musteri.dogumTarihi).toLocaleDateString("tr-TR", {
                            day: "2-digit", month: "long", year: "numeric"
                        })
                        : "—"}
                />
                <SabitBilgi
                    Icon={IconShieldCheck}
                    etiket="Hesap Türü"
                    deger={musteri.rol}
                />
                <SabitBilgi
                    Icon={IconUser}
                    etiket="Müşteri No"
                    deger={`#${String(musteri.id).padStart(6, "0")}`}
                    mono
                />
            </div>

            <div
                className="mt-6 rounded-xl px-4 py-3 flex items-start gap-2.5"
                style={{
                    background: "rgba(245,158,11,0.05)",
                    border: "1px solid rgba(245,158,11,0.18)",
                }}
            >
                <IconShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
                <p className="text-amber-200/85 text-[12px] leading-relaxed">
                    <strong>KVKK ve Bütünlük:</strong> Kimlik bilgileri kayıt sırasında doğrulandığı için
                    sonradan değiştirilemez. Sigortacılık mevzuatı gereği ad-soyad veya doğum tarihi
                    değişikliği talep ediyorsanız resmi belgelerinizle birlikte müşteri hizmetlerine
                    başvurmanız gerekir.
                </p>
            </div>
        </motion.div>
    );
}

// ─── Yardımcı küçük komponentler ──────────────────────────────────────────────

function FormAlani({
    label, Icon, children,
}: {
    label: string; Icon: React.ElementType; children: React.ReactNode;
}) {
    return (
        <div>
            <label className="flex items-center gap-1.5 text-white/65 text-[12px] font-medium mb-1.5">
                <Icon className="w-3 h-3" />
                {label}
            </label>
            {children}
        </div>
    );
}

function SifreInput({
    value, onChange, goster, setGoster, disabled, placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    goster: boolean;
    setGoster: (v: boolean) => void;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <div className="relative">
            <input
                type={goster ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="new-password"
                className="w-full rounded-xl px-3 py-2.5 pr-10 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                style={inputStyle}
            />
            <button
                type="button"
                onClick={() => setGoster(!goster)}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
            >
                {goster ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}

function KuralSatiri({ saglandi, metin }: { saglandi: boolean; metin: string }) {
    return (
        <div
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: saglandi ? "rgb(110,231,183)" : "rgba(255,255,255,0.35)" }}
        >
            {saglandi ? (
                <IconCheck className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
            ) : (
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} />
            )}
            {metin}
        </div>
    );
}

function SabitBilgi({
    Icon, etiket, deger, mono,
}: {
    Icon: React.ElementType;
    etiket: string;
    deger: string;
    mono?: boolean;
}) {
    return (
        <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3 h-3 text-white/35" />
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-medium">{etiket}</p>
            </div>
            <p className={`text-white/85 text-[13px] font-medium ${mono ? "font-mono tabular-nums" : ""}`}>
                {deger}
            </p>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
};

// Telefon format helper — login sayfasındaki ile aynı mantık
function formatTelefon(value: string): string {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
}

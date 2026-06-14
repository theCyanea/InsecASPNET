"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe } from "@/components/ui/globe";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import SpotlightCard from "@/components/ui/spotlight-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

type Mod = "kayit" | "giris";

const API = "http://localhost:5156/api";

const DARK_GLOBE_CONFIG = {
    width: 800, height: 800, onRender: () => { },
    devicePixelRatio: 2, phi: 0, theta: 0.3, dark: 1, diffuse: 1.2,
    mapSamples: 16000, mapBrightness: 6,
    baseColor: [0.3, 0.3, 0.35] as [number, number, number],
    markerColor: [56 / 255, 189 / 255, 248 / 255] as [number, number, number],
    glowColor: [0.05, 0.15, 0.28] as [number, number, number],
    markers: [
        { location: [14.5995, 120.9842] as [number, number], size: 0.03 },
        { location: [19.076, 72.8777] as [number, number], size: 0.1 },
        { location: [23.8103, 90.4125] as [number, number], size: 0.05 },
        { location: [30.0444, 31.2357] as [number, number], size: 0.07 },
        { location: [39.9042, 116.4074] as [number, number], size: 0.08 },
        { location: [-23.5505, -46.6333] as [number, number], size: 0.1 },
        { location: [19.4326, -99.1332] as [number, number], size: 0.1 },
        { location: [40.7128, -74.006] as [number, number], size: 0.1 },
        { location: [34.6937, 135.5022] as [number, number], size: 0.05 },
        { location: [41.0082, 28.9784] as [number, number], size: 0.06 },
    ],
};

const Field = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("flex w-full flex-col space-y-2", className)}>{children}</div>
);

const labelClass = "text-sm font-medium text-white/70";
const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/20 h-10 focus-visible:ring-sky-500/30 focus-visible:border-sky-500/40 transition-all duration-200";

function formatTelefon(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
}

export default function Home() {
    const router = useRouter();
    const [mod, setMod] = useState<Mod>("kayit");
    const [asama, setAsama] = useState(1);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    // Kayıt state
    const [adi, setAdi] = useState("");
    const [soyadi, setSoyadi] = useState("");
    const [kimlikNo, setKimlikNo] = useState("");
    const [telefon, setTelefon] = useState("");
    const [dogumTarihi, setDogumTarihi] = useState<Date | undefined>();
    const [email, setEmail] = useState("");
    const [sifre, setSifre] = useState("");
    const [kvkkKabul, setKvkkKabul] = useState(false);
    const [sozlesmeKabul, setSozlesmeKabul] = useState(false);
    const [hatalar, setHatalar] = useState<Record<string, string>>({});

    // OTP state
    const [otp, setOtp] = useState("");

    // Giriş state
    // loginYontem: kullanıcının email mi yoksa TC ile mi giriş yaptığı.
    // Bu seçim hem input maskını (TC için 11 hane sınır + sadece sayı) hem de
    // placeholder/etiket metnini belirliyor. Backend tarafında ikisi de tek
    // alana ("emailVeyaKimlik") gidiyor; controller içerikten anlayıp eşleştiriyor.
    const [loginYontem, setLoginYontem] = useState<"email" | "tc">("email");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginSifre, setLoginSifre] = useState("");

    const kayitValidate = () => {
        const yeni: Record<string, string> = {};
        if (!adi.trim()) yeni.adi = "Ad zorunludur.";
        if (!soyadi.trim()) yeni.soyadi = "Soyad zorunludur.";
        if (kimlikNo.length !== 11) yeni.kimlikNo = "TC Kimlik No 11 haneli olmalıdır.";
        if (telefon.replace(/\D/g, "").length !== 11) yeni.telefon = "Telefon 11 haneli olmalıdır.";
        if (!dogumTarihi) yeni.dogumTarihi = "Doğum tarihi zorunludur.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) yeni.email = "Geçerli bir e-posta girin.";
        if (sifre.length < 8) yeni.sifre = "Şifre en az 8 karakter olmalıdır.";
        if (!kvkkKabul || !sozlesmeKabul) yeni.sozlesme = "Tüm sözleşmeleri kabul etmelisiniz.";
        setHatalar(yeni);
        return Object.keys(yeni).length === 0;
    };

    const handleKayit = async () => {
        if (!kayitValidate()) return;
        setYukleniyor(true);
        setHata("");
        try {
            const res = await fetch(`${API}/Customers/kayit-ol`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adi, soyadi, kimlikNo,
                    telefonNo: telefon.replace(/\s/g, ""),
                    dogumTarihi: dogumTarihi ? format(dogumTarihi, "yyyy-MM-dd") : "",
                    email, sifre,
                }),
            });
            const text = await res.text();
            let data: string;
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
            if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
            setAsama(2);
        } catch (err: unknown) {
            setHata(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setYukleniyor(false);
        }
    };

    const handleOtpDogrula = async () => {
        if (otp.length !== 6) { setHata("6 haneli kodu eksiksiz girin."); return; }
        setYukleniyor(true);
        setHata("");
        try {
            const res = await fetch(`${API}/Customers/otp-dogrula`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const text = await res.text();
            let data: string;
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
            if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
            setBasari("Hesabınız oluşturuldu! Giriş yapabilirsiniz.");
            setTimeout(() => { setMod("giris"); setAsama(1); setBasari(""); }, 2000);
        } catch (err: unknown) {
            setHata(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setYukleniyor(false);
        }
    };

    const handleGiris = async () => {
        if (!loginEmail.trim() || !loginSifre.trim()) { setHata("Tüm alanları doldurun."); return; }
        // Mod-spesifik client-side validation
        if (loginYontem === "tc") {
            if (loginEmail.length !== 11) {
                setHata("TC Kimlik No 11 haneli olmalıdır."); return;
            }
        } else {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
                setHata("Geçerli bir e-posta girin."); return;
            }
        }
        setYukleniyor(true);
        setHata("");
        try {
            const res = await fetch(`${API}/Customers/giris-yap`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ emailVeyaKimlik: loginEmail, sifre: loginSifre }),
            });
            const text = await res.text();
            let data: string;
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
            if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
            router.push("/dashboard");
        } catch (err: unknown) {
            setHata(err instanceof Error ? err.message : "Bir hata oluştu.");
        } finally {
            setYukleniyor(false);
        }
    };

    const modDegistir = (yeniMod: Mod) => {
        setMod(yeniMod); setAsama(1); setHata(""); setBasari(""); setHatalar({});
        // Mod değişiminde login alanlarını da temizle (kayıt → giriş geçişinde
        // kalan TC değeri email moduna kayıyordu)
        setLoginEmail(""); setLoginSifre(""); setLoginYontem("email");
    };

    // Login yöntemi değiştiğinde input içeriğini temizle — TC'den email'e
    // geçince 11 hane sayı kalmasın, kafa karıştırmasın.
    const loginYontemDegistir = (yontem: "email" | "tc") => {
        setLoginYontem(yontem);
        setLoginEmail("");
        setHata("");
    };

    return (
        <div className="h-screen bg-[#080c14] text-white flex flex-col overflow-hidden">

            <nav className="h-14 flex-shrink-0 flex items-center px-8 z-50">
                <span className="text-xl font-extrabold tracking-tighter">
                    in<span className="text-white/20">SEC</span>
                </span>
            </nav>

            <main className="flex-1 relative overflow-hidden">

                <InteractiveGridPattern
                    squares={[50, 25]}
                    className="[mask-image:radial-gradient(ellipse_90%_90%_at_50%_50%,white,transparent)] opacity-[0.30]"
                    squaresClassName="stroke-white/15 hover:fill-sky-500/5"
                />

                <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_35%_50%_at_28%_55%,rgba(56,189,248,0.08)_0%,transparent_65%)]" />
                <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_25%_40%_at_78%_50%,rgba(56,189,248,0.04)_0%,transparent_70%)]" />

                <div className="relative z-10 h-full flex items-center justify-center gap-0 px-12">

                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex flex-col justify-center items-start w-[600px] flex-shrink-0">
                            <h1 className="text-[5.5rem] font-bold tracking-tight leading-[1.1]">
                                <span className="text-white">Dünyanın dört</span>
                                <br />
                                <span className="text-white">bir yanındaki</span>
                                <br />
                                <span className="text-white/70">müşterilerle</span>
                                <br />
                                <span className="text-white/50">aramıza katıl.</span>
                            </h1>
                        </div>
                        <div className="relative flex size-[420px] items-center justify-center flex-shrink-0">
                            <Globe config={DARK_GLOBE_CONFIG} />
                        </div>
                    </div>

                    <div className="h-[60%] w-px flex-shrink-0 mx-10" />

                    <div className="flex items-center justify-center flex-shrink-0">
                        <SpotlightCard
                            className="w-[460px] !p-8 !rounded-2xl !border-white/[0.08] !bg-[#0d1320]"
                            spotlightColor="rgba(56, 189, 248, 0.06)"
                        >
                            {/* Hata / başarı mesajı */}
                            {hata && (
                                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {hata}
                                </div>
                            )}
                            {basari && (
                                <div className="mb-4 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm">
                                    {basari}
                                </div>
                            )}

                            {mod === "kayit" && asama === 1 && (
                                <div className="animate-in fade-in slide-in-from-right-6 duration-300">
                                    <div className="mb-5">
                                        <h2 className="text-2xl font-bold text-white">Hesap Oluştur</h2>
                                        <p className="text-sm text-white/40 mt-1">Saniyeler içinde aramıza katılın.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Field>
                                                <Label htmlFor="adi" className={labelClass}>Adı</Label>
                                                <Input id="adi" placeholder="Ahmet" value={adi}
                                                    onChange={e => setAdi(e.target.value)}
                                                    className={cn(inputClass, hatalar.adi && "border-red-500/50")} />
                                                {hatalar.adi && <p className="text-xs text-red-400">{hatalar.adi}</p>}
                                            </Field>
                                            <Field>
                                                <Label htmlFor="soyadi" className={labelClass}>Soyadı</Label>
                                                <Input id="soyadi" placeholder="Yılmaz" value={soyadi}
                                                    onChange={e => setSoyadi(e.target.value)}
                                                    className={cn(inputClass, hatalar.soyadi && "border-red-500/50")} />
                                                {hatalar.soyadi && <p className="text-xs text-red-400">{hatalar.soyadi}</p>}
                                            </Field>
                                        </div>
                                        <Field>
                                            <Label htmlFor="kimlik" className={labelClass}>TC Kimlik No</Label>
                                            <Input id="kimlik" placeholder="11 haneli TC Kimlik No" value={kimlikNo}
                                                onChange={e => setKimlikNo(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                                className={cn(inputClass, hatalar.kimlikNo && "border-red-500/50")} />
                                            {hatalar.kimlikNo && <p className="text-xs text-red-400">{hatalar.kimlikNo}</p>}
                                        </Field>
                                        <div className="flex gap-3">
                                            <Field>
                                                <Label htmlFor="telefon" className={labelClass}>Telefon</Label>
                                                <Input id="telefon" placeholder="05XX XXX XX XX" value={telefon}
                                                    onChange={e => setTelefon(formatTelefon(e.target.value))}
                                                    className={cn(inputClass, hatalar.telefon && "border-red-500/50")} />
                                                {hatalar.telefon && <p className="text-xs text-red-400">{hatalar.telefon}</p>}
                                            </Field>
                                            <Field>
                                                <Label className={labelClass}>Doğum Tarihi</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button className={cn(
                                                            "flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 text-sm transition-all duration-200",
                                                            dogumTarihi ? "text-white" : "text-white/20",
                                                            "hover:border-sky-500/40 focus:outline-none",
                                                            hatalar.dogumTarihi && "border-red-500/50"
                                                        )}>
                                                            {dogumTarihi ? format(dogumTarihi, "dd.MM.yyyy") : "gg.aa.yyyy"}
                                                            <CalendarIcon className="h-4 w-4 text-white/30 flex-shrink-0" />
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 border-white/10 bg-[#0d1320]" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={dogumTarihi}
                                                            onSelect={setDogumTarihi}
                                                            locale={tr}
                                                            captionLayout="dropdown"
                                                            defaultMonth={new Date(1990, 0)}
                                                            startMonth={new Date(1940, 0)}
                                                            endMonth={new Date(2010, 11)}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {hatalar.dogumTarihi && <p className="text-xs text-red-400">{hatalar.dogumTarihi}</p>}
                                            </Field>
                                        </div>
                                        <Field>
                                            <Label htmlFor="email" className={labelClass}>E-Posta</Label>
                                            <Input id="email" type="email" placeholder="ornek@mail.com" value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className={cn(inputClass, hatalar.email && "border-red-500/50")}
                                                autoComplete="off" />
                                            {hatalar.email && <p className="text-xs text-red-400">{hatalar.email}</p>}
                                        </Field>
                                        <Field>
                                            <Label htmlFor="sifre" className={labelClass}>Şifre</Label>
                                            <Input id="sifre" type="password" placeholder="En az 8 karakter" value={sifre}
                                                onChange={e => setSifre(e.target.value)}
                                                className={cn(inputClass, hatalar.sifre && "border-red-500/50")} />
                                            {hatalar.sifre && <p className="text-xs text-red-400">{hatalar.sifre}</p>}
                                        </Field>
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-start gap-2.5">
                                                <Checkbox id="kvkk" checked={kvkkKabul}
                                                    onCheckedChange={(v) => setKvkkKabul(v === true)}
                                                    className="mt-0.5 border-white/30 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                                                <label htmlFor="kvkk" className="text-xs text-white/50 leading-relaxed cursor-pointer">
                                                    <span className="text-sky-400 hover:text-sky-300 transition-colors">KVKK Aydınlatma Metni</span>
                                                    {`'ni okudum ve kabul ediyorum.`}
                                                </label>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <Checkbox id="sozlesme" checked={sozlesmeKabul}
                                                    onCheckedChange={(v) => setSozlesmeKabul(v === true)}
                                                    className="mt-0.5 border-white/30 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                                                <label htmlFor="sozlesme" className="text-xs text-white/50 leading-relaxed cursor-pointer">
                                                    <span className="text-sky-400 hover:text-sky-300 transition-colors">Kullanım Koşulları</span>
                                                    {`'nı ve `}
                                                    <span className="text-sky-400 hover:text-sky-300 transition-colors">Gizlilik Politikası</span>
                                                    {`'nı kabul ediyorum.`}
                                                </label>
                                            </div>
                                            {hatalar.sozlesme && <p className="text-xs text-red-400">{hatalar.sozlesme}</p>}
                                        </div>
                                        <button
                                            onClick={handleKayit}
                                            disabled={yukleniyor}
                                            className="group/cta relative w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                                            style={{
                                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                                color: "#0f172a",
                                                boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                                border: "1px solid rgba(226,232,240,0.5)",
                                            }}
                                        >
                                            {yukleniyor ? (
                                                <>
                                                    <span
                                                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                        style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                                                    />
                                                    Gönderiliyor...
                                                </>
                                            ) : (
                                                <>Hesap Oluştur →</>
                                            )}
                                        </button>
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <p className="text-center text-sm text-white/30">
                                            Zaten hesabınız var mı?{" "}
                                            <button onClick={() => modDegistir("giris")} className="text-white font-medium hover:text-sky-400 transition-colors">
                                                Giriş Yap
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {mod === "kayit" && asama === 2 && (
                                <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center text-center space-y-6">
                                    <div>
                                        <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">E-Postanızı Doğrulayın</h2>
                                        <p className="text-sm text-white/40 mt-2">
                                            <span className="text-sky-400">{email}</span> adresine gönderilen 6 haneli kodu girin.
                                        </p>
                                    </div>
                                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                                        <InputOTPGroup>
                                            {[0, 1, 2, 3, 4, 5].map(i => (
                                                <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg border-white/10 bg-white/5 text-white" />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                    <button
                                        onClick={handleOtpDogrula}
                                        disabled={yukleniyor}
                                        className="group/cta relative w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 inline-flex items-center justify-center gap-2"
                                        style={{
                                            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                            color: "#0f172a",
                                            boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                            border: "1px solid rgba(226,232,240,0.5)",
                                        }}
                                    >
                                        {yukleniyor ? (
                                            <>
                                                <span
                                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                    style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                                                />
                                                Doğrulanıyor...
                                            </>
                                        ) : (
                                            <>Doğrula ve Devam Et</>
                                        )}
                                    </button>
                                    <button onClick={() => { setAsama(1); setHata(""); }} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                                        ← Geri dön
                                    </button>
                                </div>
                            )}

                            {mod === "giris" && (
                                <div className="animate-in fade-in slide-in-from-left-6 duration-300">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-white">Tekrar Hoş Geldiniz</h2>
                                        <p className="text-sm text-white/40 mt-1">Hesabınıza giriş yapın.</p>
                                    </div>
                                    <div className="space-y-4">
                                        {/* ── Yöntem seçici sekmeleri ───────────────────────────────
                                            Email / TC Kimlik No arasında geçiş. Aktif sekmeye platin tonlu
                                            arka plan, pasif sekme şeffaf. Tek satırda 2 kolon. */}
                                        <div
                                            className="grid grid-cols-2 gap-1 p-1 rounded-xl"
                                            style={{
                                                background: "rgba(255,255,255,0.03)",
                                                border: "1px solid rgba(255,255,255,0.06)",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => loginYontemDegistir("email")}
                                                className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                                                style={{
                                                    background: loginYontem === "email"
                                                        ? "linear-gradient(135deg, rgba(226,232,240,0.12), rgba(148,163,184,0.04))"
                                                        : "transparent",
                                                    border: loginYontem === "email"
                                                        ? "1px solid rgba(226,232,240,0.25)"
                                                        : "1px solid transparent",
                                                    color: loginYontem === "email" ? "#ffffff" : "rgba(255,255,255,0.45)",
                                                }}
                                            >
                                                E-Posta
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => loginYontemDegistir("tc")}
                                                className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all"
                                                style={{
                                                    background: loginYontem === "tc"
                                                        ? "linear-gradient(135deg, rgba(226,232,240,0.12), rgba(148,163,184,0.04))"
                                                        : "transparent",
                                                    border: loginYontem === "tc"
                                                        ? "1px solid rgba(226,232,240,0.25)"
                                                        : "1px solid transparent",
                                                    color: loginYontem === "tc" ? "#ffffff" : "rgba(255,255,255,0.45)",
                                                }}
                                            >
                                                TC Kimlik No
                                            </button>
                                        </div>

                                        <Field>
                                            <Label htmlFor="login-email" className={labelClass}>
                                                {loginYontem === "email" ? "E-Posta" : "TC Kimlik No"}
                                            </Label>
                                            {loginYontem === "email" ? (
                                                <Input
                                                    id="login-email"
                                                    type="email"
                                                    placeholder="ornek@mail.com"
                                                    value={loginEmail}
                                                    onChange={e => setLoginEmail(e.target.value)}
                                                    className={inputClass}
                                                    autoComplete="username"
                                                />
                                            ) : (
                                                /* TC modu: sadece sayı + 11 hane sınırı */
                                                <Input
                                                    id="login-email"
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="11 haneli TC Kimlik No"
                                                    value={loginEmail}
                                                    onChange={e => setLoginEmail(e.target.value.replace(/\D/g, "").slice(0, 11))}
                                                    maxLength={11}
                                                    className={cn(inputClass, "tabular-nums font-mono")}
                                                    autoComplete="username"
                                                />
                                            )}
                                            {loginYontem === "tc" && loginEmail && loginEmail.length < 11 && (
                                                <p className="text-[11px] text-white/30 tabular-nums">
                                                    {loginEmail.length} / 11 hane
                                                </p>
                                            )}
                                        </Field>
                                        <Field>
                                            <Label htmlFor="login-sifre" className={labelClass}>Şifre</Label>
                                            <Input id="login-sifre" type="password" placeholder="Şifreniz" value={loginSifre}
                                                onChange={e => setLoginSifre(e.target.value)}
                                                className={inputClass}
                                                autoComplete="current-password" />
                                        </Field>
                                        {/* Platin button — dashboard'daki "Teklifi oluştur"/"Ödemeyi tamamla"
                                            butonlarıyla görsel dil tutarlı. */}
                                        <button
                                            onClick={handleGiris}
                                            disabled={yukleniyor}
                                            className="group/cta relative w-full h-11 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1 inline-flex items-center justify-center gap-2"
                                            style={{
                                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                                color: "#0f172a",
                                                boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                                border: "1px solid rgba(226,232,240,0.5)",
                                            }}
                                        >
                                            {yukleniyor ? (
                                                <>
                                                    <span
                                                        className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                                        style={{ borderColor: "#0f172a", borderTopColor: "transparent" }}
                                                    />
                                                    Giriş yapılıyor...
                                                </>
                                            ) : (
                                                <>Giriş Yap →</>
                                            )}
                                        </button>
                                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <p className="text-center text-sm text-white/30">
                                            Hesabınız yok mu?{" "}
                                            <button onClick={() => modDegistir("kayit")} className="text-white font-medium hover:text-sky-400 transition-colors">
                                                Kayıt Ol
                                            </button>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </SpotlightCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
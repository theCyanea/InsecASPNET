"use client";

// ─── /dashboard/destek ───────────────────────────────────────────────────────
// Yardım merkezi sayfası. İki ana bölüm:
//   1) Sıkça Sorulan Sorular (SSS) — accordion ile
//   2) Bize Ulaşın formu — konu seçimi + mesaj, backend'e POST → admin email'e
//
// Üst tarafta hero + iletişim kanalları (telefon/email gösterimi).
// Sigortacılığa özel SSS'lerle yapılandırıldı: poliçe, hasar, ödeme, KVKK.

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
    IconArrowLeft,
    IconHeadset,
    IconMail,
    IconPhone,
    IconMessage,
    IconChevronDown,
    IconCheck,
    IconAlertCircle,
    IconSearch,
    IconShieldCheck,
    IconAlertTriangle,
    IconCreditCard,
    IconLock,
    IconFileText,
    IconHelp,
    IconInbox,
    IconArrowRight,
} from "@tabler/icons-react";

const API = "http://localhost:5156/api";

// ─── SSS Verisi ──────────────────────────────────────────────────────────────
// Konu kategorileri ile ikonlu, gruplanmış. İçerik sigortacılık + sistem
// kullanımına özgü; öğrenci tezi olarak realistic görünmek için Türkiye
// mevzuatına atıflar var (KVKK, BSMV, TRAMER).

interface SSSMaddesi {
    soru: string;
    cevap: string;
    kategori: string;
}

const SSS_LISTESI: SSSMaddesi[] = [
    {
        kategori: "Teklif & Poliçe",
        soru: "Poliçem ne zaman yürürlüğe girer?",
        cevap: "Poliçeniz, ödemeniz tamamlandığı an yürürlüğe girer. Teklif aşamasındaki tarihler tahminidir; ödeme yapıldığında başlangıç tarihi otomatik olarak güncellenir ve seçtiğiniz süre boyunca geçerli olur.",
    },
    {
        kategori: "Teklif & Poliçe",
        soru: "Tek bir teklifte birden fazla yakınım için sigorta yapabilir miyim?",
        cevap: "Hayır, her teklif tek bir sigortalı kişi içindir. Eşiniz, anneniz veya çocuğunuz için ayrı ayrı poliçe oluşturmanız gerekir. Teklif başlangıcında 'Kimin için sigorta?' adımında yakınınızı seçebilir veya yeni bir yakın ekleyebilirsiniz.",
    },
    {
        kategori: "Teklif & Poliçe",
        soru: "Teklifimi ne kadar süre sonra düzenleyebilirim?",
        cevap: "Sadece 'Teklif Bekliyor' durumundaki kayıtlarınızı düzenleyebilirsiniz. Ödeme tamamlandıktan sonra poliçe yürürlüğe girdiği için süre/teminat değişikliği için yeni bir teklif almanız gerekir.",
    },
    {
        kategori: "Hasar",
        soru: "Hasar bildirimi yaparken tutarı bilmiyorum, ne yazmalıyım?",
        cevap: "Tutar alanı opsiyoneldir; boş bırakabilirsiniz. Net hasar tutarını eksperimiz dosyanızı inceledikten sonra belirler. Sağlık hasarlarında fatura tutarı varsa girebilirsiniz; trafik kazası, yangın gibi durumlarda eksperin değerlendirmesi esastır.",
    },
    {
        kategori: "Hasar",
        soru: "Hasar talebimi sonradan iptal edebilir miyim?",
        cevap: "Sadece 'İncelemede' durumundaki hasar talepleri iptal edilebilir. Eksperimiz değerlendirme yaptıktan ve talebiniz onaylandıktan sonra iptal işlemi sigortacılık mevzuatı gereği müşteri hizmetleri kanalıyla yapılır.",
    },
    {
        kategori: "Hasar",
        soru: "Geçen yıl yaşadığım bir kaza için bugün hasar bildirimi açabilir miyim?",
        cevap: "Hayır. Sigortacılıkta zamanaşımı kuralı gereği 1 yıldan eski hasarlar için talep oluşturulamaz. Ayrıca hasar tarihi, bildirimde bulunduğunuz poliçenizin geçerlilik aralığında olmalıdır.",
    },
    {
        kategori: "Ödeme",
        soru: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
        cevap: "Şu anda kredi kartı ve banka kartı ile ödeme alıyoruz. Ödemeleriniz 256-bit SSL ile şifrelenir; kart bilgileriniz hiçbir şekilde sistemimizde saklanmaz, yalnızca son 4 hane ödeme makbuzunuzda görünür.",
    },
    {
        kategori: "Ödeme",
        soru: "BSMV (Banka ve Sigorta Muameleleri Vergisi) nedir?",
        cevap: "BSMV, sigorta primlerine eklenen %5 oranındaki yasal vergidir. Türkiye'de Hazine ve Maliye Bakanlığı tarafından düzenlenir. Tüm sigorta ürünlerinde fiyatın üzerine eklenir; ödeme detayında ayrı bir kalem olarak gösteririz.",
    },
    {
        kategori: "Ödeme",
        soru: "Ödeme reddedildi, ne yapmalıyım?",
        cevap: "Önce kart bilgilerinizi (kart numarası, son kullanma, CVV) kontrol edin. Bakiyeniz yetersizse veya bankanız işlemi reddediyorsa banka ile iletişime geçmeniz gerekir. Tekrar denemeden önce kartınızda yeterli bakiye olduğundan emin olun.",
    },
    {
        kategori: "Hesap & Profil",
        soru: "TC Kimlik No veya doğum tarihimi nasıl değiştiririm?",
        cevap: "Bu bilgiler kayıt sırasında doğrulandığı için sistem üzerinden değiştirilemez. KVKK ve sigortacılık mevzuatı gereği değişiklik talepleri için resmi belgelerinizle birlikte müşteri hizmetlerine başvurmanız gerekir.",
    },
    {
        kategori: "Hesap & Profil",
        soru: "Şifremi unuttum, ne yapmalıyım?",
        cevap: "Şu anda şifre sıfırlama bağlantısı için müşteri hizmetlerine başvurmanız gerekir. Yakın zamanda 'Şifremi Unuttum' özelliği aktif edilecektir.",
    },
    {
        kategori: "Güvenlik & KVKK",
        soru: "Kişisel verilerim nasıl korunuyor?",
        cevap: "KVKK (6698 Sayılı Kişisel Verilerin Korunması Kanunu) çerçevesinde verileriniz şifrelenmiş şekilde saklanır. Şifreniz tek yönlü hash'lenir (BCrypt), bizim bile düz metin olarak göremeyeceğimiz şekilde kayıt altına alınır. Verileriniz üçüncü taraflarla paylaşılmaz.",
    },
    {
        kategori: "Güvenlik & KVKK",
        soru: "Yakınım için sigorta açtığımda onun verilerini nasıl saklıyorsunuz?",
        cevap: "Yakınınızın bilgileri 'sigortalı' kaydı olarak ayrı tutulur. Yeni yakın eklerken KVKK kapsamında 'kişinin onayını aldığınıza dair' beyanı işaretlemeniz gerekir. Yakın bilgilerinizi sadece poliçe ve hasar süreçlerinde kullanırız.",
    },
];

const KATEGORI_IKONLARI: Record<string, React.ElementType> = {
    "Teklif & Poliçe": IconFileText,
    "Hasar": IconAlertTriangle,
    "Ödeme": IconCreditCard,
    "Hesap & Profil": IconShieldCheck,
    "Güvenlik & KVKK": IconLock,
};

const ILETISIM_KONULARI = [
    "Genel Soru",
    "Teklif & Poliçe",
    "Ödeme",
    "Hasar",
    "Hesap & Profil",
    "Teknik Sorun",
    "Şikayet",
    "Diğer",
];

export default function DestekPage() {
    const [aramaSorgusu, setAramaSorgusu] = useState("");
    const [acikIndex, setAcikIndex] = useState<number | null>(null);

    // Form state
    const [konu, setKonu] = useState("Genel Soru");
    const [mesaj, setMesaj] = useState("");
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    // ─── SSS arama / filtreleme ──────────────────────────────────────────────
    // Basit case-insensitive substring match — soru ve cevap içinde arar.
    const filtreliSSS = SSS_LISTESI.filter((s) => {
        if (!aramaSorgusu.trim()) return true;
        const q = aramaSorgusu.toLowerCase();
        return s.soru.toLowerCase().includes(q) || s.cevap.toLowerCase().includes(q);
    });

    // Kategoriye göre grupla — sıralı kategori listesi
    const kategoriler = Array.from(new Set(filtreliSSS.map((s) => s.kategori)));

    const formGecerli = mesaj.trim().length >= 20 && mesaj.trim().length <= 2000;

    const gonder = async () => {
        setHata("");
        setBasari("");
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Support/talep-olustur`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ konu, mesaj: mesaj.trim() }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Mesaj gönderilemedi.");
                return;
            }
            setBasari("Talebiniz alındı. 'Taleplerim' sayfasından ekibimizin yanıtını takip edebilirsiniz.");
            setMesaj("");
            setKonu("Genel Soru");
        } catch {
            setHata("Bağlantı hatası. Lütfen tekrar deneyin.");
        } finally {
            setGonderiliyor(false);
        }
    };

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Üst başlık */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/90 transition-colors"
                        >
                            <IconArrowLeft className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard/destek/taleplerim"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:scale-[1.02]"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                                border: "1px solid rgba(226,232,240,0.18)",
                                color: "#e2e8f0",
                            }}
                        >
                            <IconInbox className="w-4 h-4" />
                            Taleplerim
                            <IconArrowRight className="w-3.5 h-3.5 opacity-60" />
                        </Link>
                    </div>
                </motion.div>

                {/* Hero kartı */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl p-8 lg:p-10 mb-5 relative overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 30px 80px -30px rgba(2,8,20,0.6)",
                    }}
                >
                    <div
                        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
                        style={{ background: "radial-gradient(ellipse, rgba(226,232,240,0.06), transparent 70%)" }}
                    />
                    <div className="relative">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                            style={{
                                background: "linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                            }}
                        >
                            <IconHeadset className="w-5 h-5" style={{ color: "#0f172a" }} />
                        </div>
                        <h1 className="text-white text-2xl lg:text-3xl font-bold tracking-tight">
                            Size nasıl yardımcı olabiliriz?
                        </h1>
                        <p className="text-white/55 text-sm mt-2 max-w-xl">
                            Sıkça sorulan sorular arasında cevabınızı bulamazsanız aşağıdaki formdan
                            ekibimize ulaşabilirsiniz. Talepler genellikle 24 saat içinde cevaplanır.
                        </p>

                        {/* Hızlı iletişim kanalları */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <KanalKart
                                Icon={IconMail}
                                etiket="E-posta"
                                deger="destek@insec.com"
                            />
                            <KanalKart
                                Icon={IconPhone}
                                etiket="Müşteri Hizmetleri"
                                deger="0850 123 45 67"
                            />
                            <KanalKart
                                Icon={IconMessage}
                                etiket="Çalışma Saatleri"
                                deger="Hafta içi 09:00 - 18:00"
                            />
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
                    {/* ── Sol: SSS ─────────────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="rounded-2xl p-5 lg:p-6"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.5), rgba(2,6,16,0.5))",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <IconHelp className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                <h2 className="text-white text-base font-semibold">
                                    Sıkça Sorulan Sorular
                                </h2>
                                <span className="ml-auto text-white/35 text-[11px]">
                                    {filtreliSSS.length} sonuç
                                </span>
                            </div>

                            {/* Arama kutusu */}
                            <div className="relative mb-4">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                                <input
                                    type="text"
                                    value={aramaSorgusu}
                                    onChange={(e) => setAramaSorgusu(e.target.value)}
                                    placeholder="Soru ara..."
                                    className="w-full rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#ffffff",
                                    }}
                                />
                            </div>

                            {/* Boş sonuç */}
                            {filtreliSSS.length === 0 && (
                                <div className="rounded-xl px-5 py-8 text-center"
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                        border: "1px dashed rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <p className="text-white/55 text-[13px]">
                                        &quot;{aramaSorgusu}&quot; için sonuç bulunamadı.
                                    </p>
                                    <p className="text-white/30 text-[11px] mt-1">
                                        Sağdaki formdan bize doğrudan ulaşabilirsiniz.
                                    </p>
                                </div>
                            )}

                            {/* Kategori grupları */}
                            <div className="flex flex-col gap-5">
                                {kategoriler.map((kategori) => {
                                    const KategoriIcon = KATEGORI_IKONLARI[kategori] ?? IconHelp;
                                    const sorular = filtreliSSS.filter((s) => s.kategori === kategori);
                                    return (
                                        <div key={kategori}>
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <KategoriIcon className="w-3 h-3 text-white/45" />
                                                <p className="text-white/45 text-[10.5px] uppercase tracking-wider font-medium">
                                                    {kategori}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {sorular.map((s) => {
                                                    const globalIndex = SSS_LISTESI.indexOf(s);
                                                    const acik = acikIndex === globalIndex;
                                                    return (
                                                        <SSSKart
                                                            key={globalIndex}
                                                            soru={s.soru}
                                                            cevap={s.cevap}
                                                            acik={acik}
                                                            onToggle={() => setAcikIndex(acik ? null : globalIndex)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Sağ: İletişim formu ─────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <div
                            className="rounded-2xl p-5 lg:p-6 sticky top-6"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                                border: "1px solid rgba(255,255,255,0.06)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <IconMessage className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                <h2 className="text-white text-base font-semibold">
                                    Bize Ulaşın
                                </h2>
                            </div>

                            <p className="text-white/45 text-[12px] mb-5 leading-relaxed">
                                Mesajınız hesabınızla ilişkili e-postaya cevap olarak gelecektir.
                                İsim ve e-posta bilgilerinizi tekrar girmenize gerek yok.
                            </p>

                            <div className="flex flex-col gap-4">
                                {/* Konu */}
                                <div>
                                    <label className="block text-white/65 text-[11.5px] font-medium mb-1.5 uppercase tracking-wider">
                                        Konu
                                    </label>
                                    <select
                                        value={konu}
                                        onChange={(e) => setKonu(e.target.value)}
                                        disabled={gonderiliyor}
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 disabled:opacity-50"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            color: "#ffffff",
                                        }}
                                    >
                                        {ILETISIM_KONULARI.map((k) => (
                                            <option key={k} value={k} style={{ background: "#0f172a" }}>
                                                {k}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Mesaj */}
                                <div>
                                    <label className="block text-white/65 text-[11.5px] font-medium mb-1.5 uppercase tracking-wider">
                                        Mesajınız
                                    </label>
                                    <textarea
                                        value={mesaj}
                                        onChange={(e) => setMesaj(e.target.value)}
                                        placeholder="Sorununuzu detaylı bir şekilde açıklayın. Mümkünse poliçe numaranızı da belirtin."
                                        rows={6}
                                        maxLength={2000}
                                        disabled={gonderiliyor}
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y disabled:opacity-50"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            color: "#ffffff",
                                        }}
                                    />
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-white/30 text-[11px]">Min 20 karakter</p>
                                        <p
                                            className="text-[11px] tabular-nums"
                                            style={{
                                                color: mesaj.length > 1900
                                                    ? "rgb(252,211,77)"
                                                    : "rgba(255,255,255,0.3)",
                                            }}
                                        >
                                            {mesaj.length} / 2000
                                        </p>
                                    </div>
                                </div>

                                {/* Hata / başarı */}
                                {hata && (
                                    <div
                                        className="rounded-xl px-3.5 py-2.5 flex items-start gap-2"
                                        style={{
                                            background: "rgba(239,68,68,0.08)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                        }}
                                    >
                                        <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-300" />
                                        <p className="text-red-200/90 text-[12px] leading-snug">{hata}</p>
                                    </div>
                                )}

                                {basari && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl px-3.5 py-3 flex items-start gap-2"
                                        style={{
                                            background: "rgba(16,185,129,0.08)",
                                            border: "1px solid rgba(16,185,129,0.25)",
                                        }}
                                    >
                                        <IconCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-300" />
                                        <p className="text-emerald-200/90 text-[12px] leading-snug">{basari}</p>
                                    </motion.div>
                                )}

                                <button
                                    type="button"
                                    onClick={gonder}
                                    disabled={!formGecerli || gonderiliyor}
                                    className="group/cta inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    style={{
                                        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                        color: "#0f172a",
                                        boxShadow: "0 10px 30px -10px rgba(226,232,240,0.35), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(148,163,184,0.3)",
                                        border: "1px solid rgba(226,232,240,0.5)",
                                    }}
                                >
                                    {gonderiliyor ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>Mesajı Gönder</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

function KanalKart({
    Icon, etiket, deger,
}: {
    Icon: React.ElementType; etiket: string; deger: string;
}) {
    return (
        <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <Icon className="w-4 h-4" style={{ color: "#cbd5e1" }} />
            </div>
            <div className="min-w-0">
                <p className="text-white/45 text-[10px] uppercase tracking-wider font-medium">{etiket}</p>
                <p className="text-white text-[12.5px] font-medium truncate">{deger}</p>
            </div>
        </div>
    );
}

function SSSKart({
    soru, cevap, acik, onToggle,
}: {
    soru: string; cevap: string; acik: boolean; onToggle: () => void;
}) {
    return (
        <div
            className="rounded-xl overflow-hidden transition-colors"
            style={{
                background: acik
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                border: acik
                    ? "1px solid rgba(226,232,240,0.18)"
                    : "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors hover:bg-white/[0.02]"
            >
                <span className="text-white/85 text-[13px] font-medium">{soru}</span>
                <motion.div
                    animate={{ rotate: acik ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                >
                    <IconChevronDown className="w-4 h-4 text-white/45" />
                </motion.div>
            </button>
            <AnimatePresence initial={false}>
                {acik && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 pt-1">
                            <p className="text-white/65 text-[12.5px] leading-relaxed">{cevap}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

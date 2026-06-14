"use client";

// Sistem geneli bildirim yayını formu.
// Backend: POST /api/Admin/bildirim-yayinla — tüm aktif müşterilere veya seçilenE.

import { useState } from "react";
import { motion } from "motion/react";
import { IconBell, IconCheck, IconAlertCircle, IconUsers, IconUser } from "@tabler/icons-react";

const API = "http://localhost:5156/api";

export default function BildirimYayinlaPage() {
    const [hedefMod, setHedefMod] = useState<"hepsi" | "tek">("hepsi");
    const [hedefMusteriId, setHedefMusteriId] = useState("");
    const [baslik, setBaslik] = useState("");
    const [mesaj, setMesaj] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState("");

    const formGecerli =
        baslik.trim().length >= 3 &&
        mesaj.trim().length >= 10 &&
        (hedefMod === "hepsi" || (hedefMod === "tek" && /^\d+$/.test(hedefMusteriId.trim())));

    const yayinla = async () => {
        setHata("");
        setBasari("");
        setGonderiliyor(true);
        try {
            const body: { baslik: string; mesaj: string; linkUrl?: string; hedefMusteriId?: number } = {
                baslik: baslik.trim(),
                mesaj: mesaj.trim(),
            };
            if (linkUrl.trim()) body.linkUrl = linkUrl.trim();
            if (hedefMod === "tek") body.hedefMusteriId = parseInt(hedefMusteriId, 10);

            const r = await fetch(`${API}/Admin/bildirim-yayinla`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                setHata(data?.title ?? data?.mesaj ?? "Bildirim gönderilemedi.");
                return;
            }
            setBasari(data.mesaj ?? "Bildirim yayınlandı.");
            setBaslik("");
            setMesaj("");
            setLinkUrl("");
            setHedefMusteriId("");
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <p className="text-[11px] uppercase tracking-wider font-bold mb-1"
                        style={{ color: "#fbbf24" }}>Yönetici Paneli</p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Bildirim Yayınla<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        Tüm aktif müşterilere veya seçili bir müşteriye sistem bildirimi gönderin.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-2xl p-6 lg:p-8 flex flex-col gap-5"
                    style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {/* Hedef seçici */}
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-2 block uppercase tracking-wider">
                            Hedef
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <HedefKart
                                aktif={hedefMod === "hepsi"}
                                onClick={() => setHedefMod("hepsi")}
                                Icon={IconUsers}
                                baslik="Tüm Müşteriler"
                                desc="Aktif tüm müşterilere yayınla"
                            />
                            <HedefKart
                                aktif={hedefMod === "tek"}
                                onClick={() => setHedefMod("tek")}
                                Icon={IconUser}
                                baslik="Tek Müşteri"
                                desc="ID ile hedef gönderim"
                            />
                        </div>
                    </div>

                    {hedefMod === "tek" && (
                        <div>
                            <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                                Müşteri ID
                            </label>
                            <input
                                type="number"
                                value={hedefMusteriId}
                                onChange={(e) => setHedefMusteriId(e.target.value)}
                                placeholder="Örn: 5"
                                disabled={gonderiliyor}
                                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: "#ffffff",
                                }}
                            />
                            <p className="text-white/35 text-[11px] mt-1">
                                Müşteri sayfasından kopyalayabilirsiniz.
                            </p>
                        </div>
                    )}

                    {/* Başlık */}
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                            Başlık
                        </label>
                        <input
                            type="text"
                            value={baslik}
                            onChange={(e) => setBaslik(e.target.value)}
                            placeholder="Örn: Yeni ürün eklendi"
                            maxLength={200}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                    </div>

                    {/* Mesaj */}
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                            Mesaj
                        </label>
                        <textarea
                            value={mesaj}
                            onChange={(e) => setMesaj(e.target.value)}
                            placeholder="Bildirimde gösterilecek tek satır metin..."
                            rows={4}
                            maxLength={500}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 resize-y"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-white/30 text-[11px]">Min 10, max 500 karakter</p>
                            <p className="text-white/30 text-[11px] tabular-nums">{mesaj.length} / 500</p>
                        </div>
                    </div>

                    {/* Link (opsiyonel) */}
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                            Tıklama Linki (opsiyonel)
                        </label>
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="Örn: /dashboard/policeler"
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 font-mono"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                    </div>

                    {/* Önizleme */}
                    {(baslik || mesaj) && (
                        <div className="rounded-xl p-4"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <p className="text-white/35 text-[10px] uppercase tracking-wider mb-2">
                                Önizleme
                            </p>
                            <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: "rgba(226,232,240,0.08)",
                                        border: "1px solid rgba(226,232,240,0.18)",
                                    }}
                                >
                                    <IconBell className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-[13px] font-semibold">
                                        {baslik || "Başlık..."}
                                    </p>
                                    <p className="text-white/65 text-[11.5px] mt-0.5">
                                        {mesaj || "Mesaj..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hata && (
                        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                            style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.25)",
                                color: "rgb(252,165,165)",
                            }}
                        >
                            <IconAlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <p className="text-[12px]">{hata}</p>
                        </div>
                    )}

                    {basari && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl px-3 py-2.5 flex items-start gap-2"
                            style={{
                                background: "rgba(16,185,129,0.08)",
                                border: "1px solid rgba(16,185,129,0.25)",
                                color: "rgb(110,231,183)",
                            }}
                        >
                            <IconCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <p className="text-[12px]">{basari}</p>
                        </motion.div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={yayinla}
                            disabled={!formGecerli || gonderiliyor}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
                                color: "#0f172a",
                                border: "1px solid rgba(226,232,240,0.5)",
                            }}
                        >
                            {gonderiliyor ? (
                                <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                            ) : (
                                <IconBell className="w-4 h-4" />
                            )}
                            Bildirimi Yayınla
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function HedefKart({
    aktif, onClick, Icon, baslik, desc,
}: {
    aktif: boolean;
    onClick: () => void;
    Icon: React.ElementType;
    baslik: string;
    desc: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-xl px-4 py-3 text-left transition-all hover:-translate-y-0.5"
            style={{
                background: aktif
                    ? "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.04))"
                    : "rgba(255,255,255,0.02)",
                border: aktif
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
            }}
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" style={{ color: aktif ? "rgb(252,211,77)" : "rgba(255,255,255,0.55)" }} />
                <p className="text-[13px] font-semibold" style={{ color: aktif ? "#ffffff" : "rgba(255,255,255,0.85)" }}>
                    {baslik}
                </p>
            </div>
            <p className="text-[11px]" style={{ color: aktif ? "#cbd5e1" : "rgba(255,255,255,0.4)" }}>
                {desc}
            </p>
        </button>
    );
}

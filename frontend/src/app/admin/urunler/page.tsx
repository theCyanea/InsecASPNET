"use client";

// Ürün yönetimi — fiyat ve isim güncelleme.
// Backend: PUT /api/Products/urun-fiyati-guncelle/{id}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconPackage, IconCheck, IconX, IconAlertCircle, IconLock, IconLockOpen, IconDeviceFloppy } from "@tabler/icons-react";

const API = "http://localhost:5156/api";

interface Coverage {
    id: number;
    coverageName: string;
    coveragePrice: number;
    isRequired: boolean;
}

interface Urun {
    id: number;
    productName: string;
    productDescription?: string | null;
    price: number;
    productCode?: string | null;
    coverages?: Coverage[];
}

function paraFormat(n: number) {
    return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function AdminUrunlerPage() {
    const [urunler, setUrunler] = useState<Urun[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [duzenleyen, setDuzenleyen] = useState<Urun | null>(null);

    const cek = async () => {
        try {
            const r = await fetch(`${API}/Products/tum-urunleri-ve-teminatlari-getir`, {
                credentials: "include",
            });
            if (!r.ok) return;
            const data = await r.json();
            setUrunler(Array.isArray(data) ? data : []);
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => { cek(); }, []);

    if (yukleniyor) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#cbd5e1", borderTopColor: "transparent" }} />
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <p className="text-[11px] uppercase tracking-wider font-bold mb-1"
                        style={{ color: "#fbbf24" }}>Yönetici Paneli</p>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                        Ürünler<span style={{ color: "#cbd5e1" }}>.</span>
                    </h1>
                    <p className="text-white/45 text-sm mt-1">
                        {urunler.length} ürün — fiyat ve isim güncellemek için tıklayın.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {urunler.map((u) => (
                        <motion.button
                            key={u.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            type="button"
                            onClick={() => setDuzenleyen(u)}
                            className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                            style={{
                                background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(2,6,16,0.7))",
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: "rgba(255,255,255,0.04)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                        }}
                                    >
                                        <IconPackage className="w-4 h-4" style={{ color: "#cbd5e1" }} />
                                    </div>
                                    <div>
                                        <p className="text-white text-[14px] font-semibold">{u.productName}</p>
                                        {u.productCode && (
                                            <p className="text-white/35 text-[10px] uppercase tracking-wider">
                                                {u.productCode}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-white text-[15px] font-bold tabular-nums">
                                    {paraFormat(u.price)}
                                </span>
                            </div>
                            {u.productDescription && (
                                <p className="text-white/45 text-[11.5px] line-clamp-2 mt-1">
                                    {u.productDescription}
                                </p>
                            )}
                            <p className="text-white/35 text-[10.5px] mt-2">
                                {u.coverages?.length ?? 0} teminat
                            </p>
                        </motion.button>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {duzenleyen && (
                    <UrunDuzenleModal
                        urun={duzenleyen}
                        onKapat={() => setDuzenleyen(null)}
                        onBasarili={() => {
                            setDuzenleyen(null);
                            cek();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function UrunDuzenleModal({
    urun, onKapat, onBasarili,
}: {
    urun: Urun; onKapat: () => void; onBasarili: () => void;
}) {
    const [productName, setProductName] = useState(urun.productName);
    const [price, setPrice] = useState(urun.price.toString());
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState("");

    const kaydet = async () => {
        setHata("");
        const fiyat = parseFloat(price);
        if (!productName.trim() || isNaN(fiyat) || fiyat <= 0) {
            setHata("Geçerli bir isim ve fiyat girin.");
            return;
        }
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Products/urun-fiyati-guncelle/${urun.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ productName: productName.trim(), price: fiyat }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Güncellenemedi.");
                return;
            }
            onBasarili();
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget && !gonderiliyor) onKapat(); }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,16,0.98))",
                    border: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <div className="px-6 py-5 flex items-center justify-between"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h2 className="text-white text-lg font-semibold">Ürün Düzenle</h2>
                    <button onClick={onKapat} className="text-white/40 hover:text-white/80">
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                            Ürün Adı
                        </label>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                    </div>
                    <div>
                        <label className="text-white/65 text-[12px] font-medium mb-1.5 block uppercase tracking-wider">
                            Taban Prim (₺)
                        </label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            step="0.01"
                            min="0"
                            disabled={gonderiliyor}
                            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-white/30 tabular-nums"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                    </div>

                    {urun.coverages && urun.coverages.length > 0 && (
                        <div className="rounded-xl px-3 py-3"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-white/55 text-[10.5px] uppercase tracking-wider font-medium">
                                    Teminatlar ({urun.coverages.length})
                                </p>
                                <p className="text-white/30 text-[10px]">
                                    Her satırı ayrı kaydedin
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                {urun.coverages.map((c) => (
                                    <TeminatSatiri key={c.id} teminat={c} />
                                ))}
                            </div>
                        </div>
                    )}

                    {hata && (
                        <div className="rounded-xl px-3 py-2 text-[12px] flex items-center gap-2"
                            style={{
                                background: "rgba(239,68,68,0.08)",
                                border: "1px solid rgba(239,68,68,0.25)",
                                color: "rgb(252,165,165)",
                            }}
                        >
                            <IconAlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {hata}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 flex items-center justify-end gap-3"
                    style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.02)",
                    }}
                >
                    <button onClick={onKapat} disabled={gonderiliyor}
                        className="text-[13px] text-white/55 hover:text-white/90 transition-colors">
                        Vazgeç
                    </button>
                    <button onClick={kaydet} disabled={gonderiliyor}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
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
                            <IconCheck className="w-3.5 h-3.5" />
                        )}
                        Kaydet
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function TeminatSatiri({ teminat }: { teminat: Coverage }) {
    const [fiyat, setFiyat] = useState(teminat.coveragePrice.toString());
    const [zorunlu, setZorunlu] = useState(teminat.isRequired);
    const [orijinalFiyat, setOrijinalFiyat] = useState(teminat.coveragePrice);
    const [orijinalZorunlu, setOrijinalZorunlu] = useState(teminat.isRequired);
    const [gonderiliyor, setGonderiliyor] = useState(false);
    const [hata, setHata] = useState("");
    const [basari, setBasari] = useState(false);

    const fiyatNum = parseFloat(fiyat);
    const degisti =
        !isNaN(fiyatNum) &&
        (fiyatNum !== orijinalFiyat || zorunlu !== orijinalZorunlu);

    const kaydet = async () => {
        setHata("");
        setBasari(false);
        if (isNaN(fiyatNum) || fiyatNum < 0) {
            setHata("Geçersiz fiyat.");
            return;
        }
        setGonderiliyor(true);
        try {
            const r = await fetch(`${API}/Products/teminat-guncelle/${teminat.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ coveragePrice: fiyatNum, isRequired: zorunlu }),
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => "");
                setHata(txt || "Güncellenemedi.");
                return;
            }
            setOrijinalFiyat(fiyatNum);
            setOrijinalZorunlu(zorunlu);
            setBasari(true);
            setTimeout(() => setBasari(false), 2000);
        } catch {
            setHata("Bağlantı hatası.");
        } finally {
            setGonderiliyor(false);
        }
    };

    return (
        <div className="rounded-lg px-3 py-2.5"
            style={{
                background: basari
                    ? "rgba(16,185,129,0.05)"
                    : degisti
                        ? "rgba(245,158,11,0.04)"
                        : "rgba(255,255,255,0.02)",
                border: basari
                    ? "1px solid rgba(16,185,129,0.25)"
                    : degisti
                        ? "1px solid rgba(245,158,11,0.2)"
                        : "1px solid rgba(255,255,255,0.05)",
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-white/85 text-[12.5px] font-medium flex-1 truncate">
                    {teminat.coverageName}
                </span>
                {basari && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
                        <IconCheck className="w-3 h-3" />
                        Kaydedildi
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[120px]">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[11px]">₺</span>
                        <input
                            type="number"
                            value={fiyat}
                            onChange={(e) => setFiyat(e.target.value)}
                            step="0.01"
                            min="0"
                            disabled={gonderiliyor}
                            className="w-full rounded-lg pl-6 pr-2 py-1.5 text-[12px] outline-none focus:border-white/30 tabular-nums"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#ffffff",
                            }}
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setZorunlu(!zorunlu)}
                    disabled={gonderiliyor}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02]"
                    style={{
                        background: zorunlu ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.03)",
                        border: zorunlu ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)",
                        color: zorunlu ? "rgb(252,211,77)" : "rgba(255,255,255,0.55)",
                    }}
                >
                    {zorunlu ? <IconLock className="w-3 h-3" /> : <IconLockOpen className="w-3 h-3" />}
                    {zorunlu ? "Zorunlu" : "Opsiyonel"}
                </button>

                <button
                    type="button"
                    onClick={kaydet}
                    disabled={gonderiliyor || !degisti}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                        background: degisti
                            ? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)"
                            : "rgba(255,255,255,0.04)",
                        color: degisti ? "#0f172a" : "rgba(255,255,255,0.4)",
                        border: degisti ? "1px solid rgba(226,232,240,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    {gonderiliyor ? (
                        <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: "#0f172a", borderTopColor: "transparent" }} />
                    ) : (
                        <IconDeviceFloppy className="w-3 h-3" />
                    )}
                    Kaydet
                </button>
            </div>

            {hata && (
                <p className="mt-1.5 text-[10.5px] text-red-300 inline-flex items-center gap-1">
                    <IconAlertCircle className="w-3 h-3" />
                    {hata}
                </p>
            )}
        </div>
    );
}

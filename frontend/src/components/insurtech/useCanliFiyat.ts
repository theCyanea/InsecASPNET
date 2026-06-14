"use client";

// ─── useCanliFiyat — Backend pricing engine'i debounce'lu çağıran hook ───────
// Her teminat toggle'ında veya risk form değişikliğinde anında /teklif-hesapla'ya
// gitmek backend'i flood eder. Bu hook bekleyip son istek hariç hepsini iptal eder.

import { useEffect, useRef, useState } from "react";
import { PricingResult, TeklifHesaplaIstegi } from "./types";

const API = "http://localhost:5156/api";

export function useCanliFiyat(istek: TeklifHesaplaIstegi | null, debounceMs = 350) {
    const [sonuc, setSonuc] = useState<PricingResult | null>(null);
    const [yukleniyor, setYukleniyor] = useState(false);
    const [hata, setHata] = useState<string | null>(null);

    // Render arasında stabil — abort controller'ı aynı tutmak için
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // İsteği JSON-string'e çevirip karşılaştırıyoruz; nesne referansı her render'da
    // değişiyor ama içerik aynıysa tekrar tetiklenmemeli.
    const istekKey = istek ? JSON.stringify(istek) : null;

    useEffect(() => {
        if (!istek) {
            setSonuc(null);
            setYukleniyor(false);
            setHata(null);
            return;
        }

        // Önceki timer + abort
        if (timerRef.current) clearTimeout(timerRef.current);
        if (abortRef.current) abortRef.current.abort();

        timerRef.current = setTimeout(async () => {
            const controller = new AbortController();
            abortRef.current = controller;
            setYukleniyor(true);
            setHata(null);

            try {
                const r = await fetch(`${API}/Pricing/teklif-hesapla`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(istek),
                    signal: controller.signal,
                });
                if (!r.ok) throw new Error("Fiyat hesaplanamadı");
                const data: PricingResult = await r.json();
                setSonuc(data);
            } catch (e) {
                if ((e as { name?: string }).name === "AbortError") return;
                setHata("Fiyat alınamadı. Bağlantınızı kontrol edin.");
            } finally {
                setYukleniyor(false);
            }
        }, debounceMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [istekKey, debounceMs]);

    return { sonuc, yukleniyor, hata };
}

// ─── useRiskSemasi — Ürün koduna göre risk şemasını çeker ───────────────────
import { RiskParameter, InsuredPerson } from "./types";

export function useRiskSemasi(productCode: string | null | undefined) {
    const [sema, setSema] = useState<RiskParameter[]>([]);
    const [yukleniyor, setYukleniyor] = useState(false);

    useEffect(() => {
        if (!productCode) {
            setSema([]);
            return;
        }
        const ac = new AbortController();
        setYukleniyor(true);
        fetch(`${API}/Pricing/risk-semasi/${encodeURIComponent(productCode)}`, {
            credentials: "include",
            signal: ac.signal,
        })
            .then((r) => r.json())
            .then((data: RiskParameter[]) => {
                setSema(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                setSema([]);
            })
            .finally(() => setYukleniyor(false));

        return () => ac.abort();
    }, [productCode]);

    return { sema, yukleniyor };
}

// ─── useYakinlarim — Kullanıcının kendi yakın listesini çeker ───────────────
// "Kimin için sigorta?" adımında dropdown'ı doldurmak için.
// reload() döndürerek "yeni yakın eklendi" sonrası listeyi güncelleyebiliyoruz.
export function useYakinlarim() {
    const [yakinlar, setYakinlar] = useState<InsuredPerson[]>([]);
    const [yukleniyor, setYukleniyor] = useState(true);

    const cek = async () => {
        setYukleniyor(true);
        try {
            const r = await fetch(`${API}/Policies/yakinlarim`, { credentials: "include" });
            if (!r.ok) {
                setYakinlar([]);
                return;
            }
            const data = await r.json();
            setYakinlar(Array.isArray(data) ? data : []);
        } catch {
            setYakinlar([]);
        } finally {
            setYukleniyor(false);
        }
    };

    useEffect(() => {
        cek();
    }, []);

    return { yakinlar, yukleniyor, reload: cek };
}

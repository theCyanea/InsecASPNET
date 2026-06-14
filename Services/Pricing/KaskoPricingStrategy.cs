using InsecASPNET.Entities;
using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public class KaskoPricingStrategy : IPricingStrategy
    {
        public string ProductCode => "KASKO";

        public PricingResult Hesapla(
            Product urun,
            IList<Coverage> secilenTeminatlar,
            IDictionary<string, string> riskParametreleri)
        {
            var sonuc = new PricingResult
            {
                BasePrice = urun.Price,
                CoverageTotal = secilenTeminatlar.Sum(t => t.CoveragePrice),
            };

            // 1) Base + Coverages breakdown
            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = $"{urun.ProductName} - Taban Prim",
                Category = "base",
                Delta = urun.Price,
                Hint = "Kasko ürünü için tarife başlangıç primi"
            });

            foreach (var teminat in secilenTeminatlar)
            {
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = teminat.CoverageName,
                    Category = "coverage",
                    Delta = teminat.CoveragePrice,
                    Hint = teminat.IsRequired ? "Zorunlu teminat" : "Opsiyonel teminat"
                });
            }

            sonuc.RawSubtotal = sonuc.BasePrice + sonuc.CoverageTotal;

            // 2) Risk faktörleri — her biri çarpan üretir
            decimal toplamCarpan = 1.0m;

            // 1) ARAÇ YAŞI
            if (TryGetInt(riskParametreleri, "aracYili", out int aracYili))
            {
                int yas = DateTime.Now.Year - aracYili;
                decimal carpan = AracYasiCarpani(yas);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Araç Yaşı: {yas} yıl",
                    Category = "risk",
                    Factor = carpan,
                    Hint = AracYasiAciklama(yas)
                });
            }

            // 2) MOTOR GÜCÜ (kW)
            if (TryGetInt(riskParametreleri, "motorGucuKw", out int motorKw))
            {
                decimal carpan = MotorGucuCarpani(motorKw);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Motor Gücü: {motorKw} kW",
                    Category = "risk",
                    Factor = carpan,
                    Hint = motorKw >= 150 ? "Yüksek motor gücü — hasar şiddeti riski artar"
                         : motorKw <= 60 ? "Düşük motor gücü — düşük risk"
                         : "Standart motor gücü"
                });
            }

            // 3) YAKIT TİPİ
            if (riskParametreleri.TryGetValue("yakitTipi", out string? yakit) && !string.IsNullOrWhiteSpace(yakit))
            {
                decimal carpan = YakitTipiCarpani(yakit);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Yakıt: {YakitEtiket(yakit)}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = YakitAciklama(yakit)
                });
            }

            // 4) ŞEHİR
            if (riskParametreleri.TryGetValue("sehir", out string? sehir) && !string.IsNullOrWhiteSpace(sehir))
            {
                decimal carpan = SehirCarpani(sehir);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Şehir: {sehir}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = SehirAciklama(sehir)
                });
            }

            // 5) SÜRÜCÜ YAŞI
            if (TryGetInt(riskParametreleri, "surucuYasi", out int surucuYasi))
            {
                decimal carpan = SurucuYasiCarpani(surucuYasi);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Sürücü Yaşı: {surucuYasi}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = SurucuYasiAciklama(surucuYasi)
                });
            }

            // 6) HASARSIZLIK BASAMAĞI (TRAMER bonus-malus)
            if (TryGetInt(riskParametreleri, "hasarsizlikBasamagi", out int basamak))
            {
                decimal carpan = HasarsizlikCarpani(basamak);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Hasarsızlık Basamağı: {basamak}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = $"TRAMER bonus-malus sistemi — basamak {basamak}/8"
                });
            }

            // 7) GARAJ TİPİ
            if (riskParametreleri.TryGetValue("garajTipi", out string? garaj) && !string.IsNullOrWhiteSpace(garaj))
            {
                decimal carpan = GarajCarpani(garaj);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Park Yeri: {GarajEtiket(garaj)}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = GarajAciklama(garaj)
                });
            }

            // 8) YILLIK KM
            if (TryGetInt(riskParametreleri, "yillikKm", out int yillikKm))
            {
                decimal carpan = YillikKmCarpani(yillikKm);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Yıllık Kullanım: {yillikKm:N0} km",
                    Category = "risk",
                    Factor = carpan,
                    Hint = yillikKm >= 30000 ? "Yüksek km — kaza olasılığı artar"
                         : yillikKm <= 10000 ? "Düşük km — düşük risk"
                         : "Ortalama kullanım"
                });
            }

            // 9) KULLANIM AMACI
            if (riskParametreleri.TryGetValue("kullanimAmaci", out string? amac) && !string.IsNullOrWhiteSpace(amac))
            {
                decimal carpan = KullanimAmaciCarpani(amac);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Kullanım: {KullanimEtiket(amac)}",
                    Category = "risk",
                    Factor = carpan,
                    Hint = amac == "ticari" ? "Ticari kullanım — daha fazla yolda"
                         : "Şahsi kullanım — standart risk"
                });
            }

            // 10) SON 3 YIL HASAR ADEDİ
            if (TryGetInt(riskParametreleri, "hasarAdedi", out int hasarAdedi))
            {
                decimal carpan = HasarAdediCarpani(hasarAdedi);
                toplamCarpan *= carpan;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Son 3 Yıl Hasar: {hasarAdedi} adet",
                    Category = "risk",
                    Factor = carpan,
                    Hint = hasarAdedi == 0 ? "Hasarsız geçmiş — indirim"
                         : hasarAdedi >= 3 ? "Yüksek hasar geçmişi — surcharge"
                         : "Geçmiş hasar mevcut"
                });
            }

            // 3) Risk düzeltmesi
            sonuc.RiskMultiplier = Math.Round(toplamCarpan, 4);
            sonuc.RiskAdjustedSubtotal = Math.Round(sonuc.RawSubtotal * toplamCarpan, 2);

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "Ara Toplam (Risk düzeltmesi sonrası)",
                Category = "subtotal",
                Delta = sonuc.RiskAdjustedSubtotal,
                Factor = sonuc.RiskMultiplier,
                Hint = $"Toplam risk çarpanı ×{sonuc.RiskMultiplier:F2}"
            });

            // 4) BSMV %5
            sonuc.Tax = Math.Round(sonuc.RiskAdjustedSubtotal * DefaultPricingStrategy.BSMV_ORANI, 2);
            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "BSMV (%5)",
                Category = "tax",
                Delta = sonuc.Tax,
                Hint = "Banka ve Sigorta Muameleleri Vergisi"
            });

            sonuc.Total = Math.Round(sonuc.RiskAdjustedSubtotal + sonuc.Tax, 2);
            return sonuc;
        }

        // Faktör fonksiyonları
        // Her biri tek sorumluluklu — birim test edilebilir.
        // İleride bir TarifeTablo entity'sine taşınabilir (admin panelden yönetim).

        private static decimal AracYasiCarpani(int yas) => yas switch
        {
            <= 1 => 1.10m, 
            <= 3 => 1.05m,    
            <= 5 => 1.00m,    
            <= 10 => 0.92m,   
            <= 15 => 0.88m,   
            _ => 0.95m        
        };

        private static string AracYasiAciklama(int yas) => yas switch
        {
            <= 1 => "Yeni araç — replacement value yüksek",
            <= 3 => "2-3 yaş — yüksek değer",
            <= 5 => "Standart yaş",
            <= 10 => "Değer kaybı — kasko ucuzlar",
            <= 15 => "Eski araç — minimum değer",
            _ => "Çok eski — tamir/parça zorluğu"
        };

        private static decimal MotorGucuCarpani(int kw) => kw switch
        {
            <= 60 => 0.92m,
            <= 100 => 1.00m,   
            <= 150 => 1.10m,
            <= 200 => 1.25m,  
            _ => 1.40m         
        };

        private static decimal YakitTipiCarpani(string yakit) => yakit.ToLowerInvariant() switch
        {
            "benzin" => 1.00m,
            "dizel" => 1.00m,
            "lpg" => 1.08m,        // yangın riski — sigortacılıkta klasik LPG sürşarjı
            "elektrik" => 0.95m,   // çevre dostu indirim + düşük yangın riski (genelde)
            "hibrit" => 0.97m,
            _ => 1.00m
        };

        private static string YakitEtiket(string yakit) => yakit.ToLowerInvariant() switch
        {
            "benzin" => "Benzin",
            "dizel" => "Dizel",
            "lpg" => "LPG",
            "elektrik" => "Elektrik",
            "hibrit" => "Hibrit",
            _ => yakit
        };

        private static string YakitAciklama(string yakit) => yakit.ToLowerInvariant() switch
        {
            "lpg" => "LPG sürşarjı — yangın riski",
            "elektrik" => "Elektrikli araç indirimi",
            "hibrit" => "Hibrit indirimi",
            _ => "Standart yakıt"
        };

        private static decimal SehirCarpani(string sehir) => sehir.Trim().ToLowerInvariant() switch
        {
            "istanbul" or "i̇stanbul" => 1.30m,   // en yüksek trafik + hırsızlık
            "ankara" => 1.18m,
            "izmir" or "i̇zmir" => 1.15m,
            "bursa" or "antalya" or "adana" or "kocaeli" => 1.08m,
            "konya" or "gaziantep" or "kayseri" or "mersin" or "samsun" => 1.02m,
            _ => 0.95m   // kücük sehirlere indirim
        };

        private static string SehirAciklama(string sehir)
        {
            var s = sehir.Trim().ToLowerInvariant();
            if (s == "istanbul" || s == "i̇stanbul") return "İstanbul — en yüksek risk grubu";
            if (s == "ankara" || s == "izmir" || s == "i̇zmir") return "Büyükşehir — yüksek trafik yoğunluğu";
            return "Standart şehir riski";
        }

        private static decimal SurucuYasiCarpani(int yas) => yas switch
        {
            < 21 => 1.45m,    // Çok genç sürücü — istatistiksel olarak en riskli grup
            < 25 => 1.25m,    // Genç sürücü surcharge
            < 30 => 1.08m,    // Hafif surcharge
            <= 65 => 1.00m,   // Olgun sürücü, nötr
            <= 75 => 1.10m,   // Yaşlı sürücü, hafif surcharge
            _ => 1.25m        // 75+ surcharge
        };

        private static string SurucuYasiAciklama(int yas) => yas switch
        {
            < 25 => "Genç sürücü surcharge — istatistiksel risk",
            <= 65 => "Olgun sürücü — standart risk",
            _ => "Yaşlı sürücü surcharge"
        };

        private static decimal HasarsizlikCarpani(int basamak) => basamak switch
        {
            <= 1 => 1.30m,    // 1. basamak — yeni başlayan / çok hasar yapan
            2 => 1.15m,
            3 => 1.05m,
            4 => 1.00m,
            5 => 0.92m,
            6 => 0.85m,
            7 => 0.78m,
            >= 8 => 0.70m     // 8. basamak — yıllarca hasarsız sürücü, max indirim
        };

        private static decimal GarajCarpani(string garaj) => garaj.ToLowerInvariant() switch
        {
            "kapali" or "kapalı" => 0.92m,    // Kapalı garaj — hırsızlık/dolu indirim
            "acik" or "açık" => 1.00m,         // Açık otopark — nötr
            "sokak" => 1.10m,                  // Sokak — hırsızlık/çarpma riski
            _ => 1.00m
        };

        private static string GarajEtiket(string garaj) => garaj.ToLowerInvariant() switch
        {
            "kapali" or "kapalı" => "Kapalı garaj",
            "acik" or "açık" => "Açık otopark",
            "sokak" => "Sokak",
            _ => garaj
        };

        private static string GarajAciklama(string garaj) => garaj.ToLowerInvariant() switch
        {
            "kapali" or "kapalı" => "Kapalı garaj indirimi — hırsızlık/dolu koruması",
            "sokak" => "Sokak parkı — surcharge",
            _ => "Standart park koşulu"
        };

        private static decimal YillikKmCarpani(int km) => km switch
        {
            <= 5000 => 0.88m,    // Çok az kullanım — büyük indirim
            <= 10000 => 0.94m,   // Az kullanım
            <= 20000 => 1.00m,   // Ortalama
            <= 30000 => 1.08m,   // Yüksek
            _ => 1.18m           // Çok yüksek (taksi/kurye?)
        };

        private static decimal KullanimAmaciCarpani(string amac) => amac.ToLowerInvariant() switch
        {
            "sahsi" or "şahsi" => 1.00m,
            "ticari" => 1.25m,    // Ticari araç sürekli yolda — risk yüksek
            _ => 1.00m
        };

        private static string KullanimEtiket(string amac) => amac.ToLowerInvariant() switch
        {
            "sahsi" or "şahsi" => "Şahsi",
            "ticari" => "Ticari",
            _ => amac
        };

        private static decimal HasarAdediCarpani(int adet) => adet switch
        {
            0 => 0.92m,   // Hasarsız — indirim
            1 => 1.05m,
            2 => 1.18m,
            3 => 1.35m,
            _ => 1.55m    // 4+ hasar — yüksek surcharge
        };

        // dictionary'den int parse — başarısızsa false döner.
        private static bool TryGetInt(IDictionary<string, string> dict, string key, out int value)
        {
            value = 0;
            if (!dict.TryGetValue(key, out string? str) || string.IsNullOrWhiteSpace(str))
                return false;
            return int.TryParse(str, out value);
        }
    }
}

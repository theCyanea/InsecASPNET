using InsecASPNET.Entities;
using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public class SeyahatPricingStrategy : IPricingStrategy
    {
        public string ProductCode => "SEYAHAT";

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

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = $"{urun.ProductName} - Taban Prim",
                Category = "base",
                Delta = urun.Price,
                Hint = "Seyahat ürünü tarife başlangıç primi"
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
            decimal carpan = 1.0m;

            // 1) Hedef bölge
            if (riskParametreleri.TryGetValue("bolge", out string? bolge) && !string.IsNullOrWhiteSpace(bolge))
            {
                decimal c = bolge.ToLowerInvariant() switch
                {
                    "yurtici" or "yurtiçi" => 0.50m,         // Yurt içi seyahat çok ucuz
                    "schengen" or "avrupa" => 1.00m,          // Standart referans
                    "amerika" or "abd" or "kanada" => 1.65m,  // Sağlık masrafları yüksek
                    "asya" or "ortadogu" or "ortadoğu" => 1.20m,
                    "afrika" => 1.35m,
                    "okyanusya" or "avustralya" => 1.45m,
                    _ => 1.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Bölge: {bolge}",
                    Category = "risk",
                    Factor = c,
                    Hint = bolge.ToLowerInvariant().Contains("amerika") ? "ABD sağlık masrafları yüksek" : null
                });
            }

            // 2) Süre — günlük çarpan, 7 gün referans
            if (TryGetInt(riskParametreleri, "gunSayisi", out int gun))
            {
                decimal c = gun switch
                {
                    <= 7 => 1.00m,
                    <= 15 => 1.40m,
                    <= 30 => 1.80m,
                    <= 60 => 2.50m,
                    <= 90 => 3.20m,
                    _ => 4.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Süre: {gun} gün",
                    Category = "risk",
                    Factor = c,
                    Hint = gun <= 7 ? "Kısa seyahat" : "Uzun seyahat — risk artar"
                });
            }

            // 3) Yolcu yaşı
            if (TryGetInt(riskParametreleri, "yas", out int yas))
            {
                decimal c = yas switch
                {
                    < 18 => 0.90m,
                    < 35 => 1.00m,
                    < 55 => 1.10m,
                    < 65 => 1.30m,
                    < 75 => 1.70m,
                    _ => 2.20m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Yolcu Yaşı: {yas}",
                    Category = "risk",
                    Factor = c,
                    Hint = yas >= 65 ? "Yaşlı yolcu surcharge — sağlık riski" : null
                });
            }

            // 4) Macera sporu
            if (riskParametreleri.TryGetValue("maceraSporu", out string? macera) && !string.IsNullOrWhiteSpace(macera))
            {
                bool varMi = macera.ToLowerInvariant() is "evet" or "true" or "1";
                decimal c = varMi ? 1.40m : 1.00m;
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Macera Sporu: {(varMi ? "Evet" : "Hayır")}",
                    Category = "risk",
                    Factor = c,
                    Hint = varMi ? "Kayak/dalış/paragliding gibi yüksek riskli aktiviteler" : null
                });
            }

            sonuc.RiskMultiplier = Math.Round(carpan, 4);
            sonuc.RiskAdjustedSubtotal = Math.Round(sonuc.RawSubtotal * carpan, 2);

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "Ara Toplam (Risk düzeltmesi sonrası)",
                Category = "subtotal",
                Delta = sonuc.RiskAdjustedSubtotal,
                Factor = sonuc.RiskMultiplier
            });

            sonuc.Tax = Math.Round(sonuc.RiskAdjustedSubtotal * DefaultPricingStrategy.BSMV_ORANI, 2);
            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "BSMV (%5)",
                Category = "tax",
                Delta = sonuc.Tax
            });

            sonuc.Total = Math.Round(sonuc.RiskAdjustedSubtotal + sonuc.Tax, 2);
            return sonuc;
        }

        private static bool TryGetInt(IDictionary<string, string> d, string key, out int v)
        {
            v = 0;
            return d.TryGetValue(key, out string? s) && !string.IsNullOrWhiteSpace(s) && int.TryParse(s, out v);
        }
    }
}

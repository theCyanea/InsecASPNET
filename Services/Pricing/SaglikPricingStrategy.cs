using InsecASPNET.Entities;
using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public class SaglikPricingStrategy : IPricingStrategy
    {
        public string ProductCode => "SAGLIK";

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
                Hint = "Sağlık ürünü tarife başlangıç primi"
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

            // 1) Yaş — sağlıkta en belirleyici faktör
            if (TryGetInt(riskParametreleri, "yas", out int yas))
            {
                decimal c = yas switch
                {
                    < 18 => 0.70m,
                    < 30 => 0.85m,
                    < 40 => 1.00m,
                    < 50 => 1.20m,
                    < 60 => 1.50m,
                    < 70 => 1.95m,
                    _ => 2.50m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Yaş: {yas}",
                    Category = "risk",
                    Factor = c,
                    Hint = yas >= 50 ? "Yaş ile risk artıyor" : "Genç yaş — düşük risk"
                });
            }

            // 2) Cinsiyet
            if (riskParametreleri.TryGetValue("cinsiyet", out string? cins) && !string.IsNullOrWhiteSpace(cins))
            {
                decimal c = cins.ToLowerInvariant() switch
                {
                    "kadin" or "kadın" => 1.05m,
                    "erkek" => 1.00m,
                    _ => 1.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Cinsiyet: {(cins.ToLowerInvariant().StartsWith("kad") ? "Kadın" : "Erkek")}",
                    Category = "risk",
                    Factor = c
                });
            }

            // 3) Sigara
            if (riskParametreleri.TryGetValue("sigara", out string? sigara) && !string.IsNullOrWhiteSpace(sigara))
            {
                bool icer = sigara.ToLowerInvariant() is "evet" or "true" or "1";
                decimal c = icer ? 1.35m : 0.95m;
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Sigara: {(icer ? "İçiyor" : "İçmiyor")}",
                    Category = "risk",
                    Factor = c,
                    Hint = icer ? "Sigara surcharge — major risk faktörü"
                                : "Sigara içmeyen indirimi"
                });
            }

            // 4) Kronik hastalık
            if (riskParametreleri.TryGetValue("kronikHastalik", out string? kronik) && !string.IsNullOrWhiteSpace(kronik))
            {
                decimal c = kronik.ToLowerInvariant() switch
                {
                    "yok" or "hayir" or "hayır" => 1.00m,
                    "diyabet" => 1.30m,
                    "hipertansiyon" => 1.20m,
                    "kalp" => 1.45m,
                    "astim" or "astım" => 1.15m,
                    "diger" or "diğer" => 1.20m,
                    _ => 1.00m
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"Kronik: {kronik}",
                    Category = "risk",
                    Factor = c,
                    Hint = c > 1.0m ? "Kronik hastalık ek prim" : "Kronik hastalık yok"
                });
            }

            // 5) BMI
            if (TryGetDecimal(riskParametreleri, "bmi", out decimal bmi) && bmi > 10m)
            {
                decimal c = bmi switch
                {
                    < 18.5m => 1.05m,    // Düşük kilo
                    < 25m => 1.00m,       // Normal
                    < 30m => 1.10m,       // Fazla kilolu
                    < 35m => 1.25m,       // Obez
                    _ => 1.45m            // Morbid obez
                };
                carpan *= c;
                sonuc.Breakdown.Add(new BreakdownItem
                {
                    Label = $"BMI: {bmi:F1}",
                    Category = "risk",
                    Factor = c,
                    Hint = bmi >= 30m ? "Obezite ek prim" : "Standart BMI"
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

        private static bool TryGetDecimal(IDictionary<string, string> d, string key, out decimal v)
        {
            v = 0m;
            return d.TryGetValue(key, out string? s) && !string.IsNullOrWhiteSpace(s)
                && decimal.TryParse(s.Replace(',', '.'), System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out v);
        }
    }
}

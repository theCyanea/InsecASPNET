using InsecASPNET.Entities;
using InsecASPNET.Models.Pricing;

namespace InsecASPNET.Services.Pricing
{
    public class DefaultPricingStrategy : IPricingStrategy
    {
        public const decimal BSMV_ORANI = 0.05m;

        public string ProductCode => "";

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
                Hint = "Ürünün varsayılan başlangıç primi"
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
            sonuc.RiskMultiplier = 1.0m;
            sonuc.RiskAdjustedSubtotal = sonuc.RawSubtotal;

            sonuc.Breakdown.Add(new BreakdownItem
            {
                Label = "Ara Toplam",
                Category = "subtotal",
                Delta = sonuc.RiskAdjustedSubtotal,
                Hint = "Vergi öncesi tutar"
            });

            sonuc.Tax = Math.Round(sonuc.RiskAdjustedSubtotal * BSMV_ORANI, 2);
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
    }
}

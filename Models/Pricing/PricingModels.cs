namespace InsecASPNET.Models.Pricing
{
    public class PricingResult
    {
        public decimal BasePrice { get; set; }
        public decimal CoverageTotal { get; set; }
        // Risk faktörleri uygulanmadan önceki toplam (base + coverages)
        public decimal RawSubtotal { get; set; }
        // Toplam risk çarpanı (1.0 = nötr, >1 = ek prim, <1 = indirim)
        public decimal RiskMultiplier { get; set; } = 1.0m;
        // Risk uygulandıktan sonraki ara toplam (vergi öncesi)
        public decimal RiskAdjustedSubtotal { get; set; }
        // BSMV — Banka ve Sigorta Muameleleri Vergisi (TR'de sigortada %5)
        public decimal Tax { get; set; }
        public decimal Total { get; set; }
        public List<BreakdownItem> Breakdown { get; set; } = new();
    }

    public class BreakdownItem
    {
        public required string Label { get; set; }
        public required string Category { get; set; }   
        public decimal? Factor { get; set; }
        public decimal? Delta { get; set; }
        public string? Hint { get; set; }               
    }

    public class RiskParameter
    {
        public required string Key { get; set; }        
        public required string Label { get; set; }      
        public required string Type { get; set; }       
        public string? Hint { get; set; }               
        public string? Placeholder { get; set; }
        public List<RiskOption>? Options { get; set; }  
        public decimal? Min { get; set; }               
        public decimal? Max { get; set; }
        public bool IsRequired { get; set; } = true;
        public int DisplayOrder { get; set; }
        public bool FullWidth { get; set; }
    }

    public class RiskOption
    {
        public required string Value { get; set; }      // Backend'in kullanacağı değer
        public required string Label { get; set; }      // UI'da gösterilen
    }

    public class TeklifHesaplaDto
    {
        public int ProductId { get; set; }
        public List<int> SelectedCoverageIds { get; set; } = new();
        public Dictionary<string, string>? RiskParameters { get; set; }
    }
}

using Microsoft.EntityFrameworkCore;

namespace InsecASPNET.Entities
{
    public class Payment
    {
        public int Id { get; set; }

        public int PolicyId { get; set; }
        public Policy? Policy { get; set; }

        [Precision(18, 2)]
        public decimal Tutar { get; set; }

        public DateTime IslemTarihi { get; set; } = DateTime.UtcNow;

        public required string KartSon4 { get; set; }

        public required string KartSahibi { get; set; }

        public required string Durum { get; set; }

        public string? HataMesaji { get; set; }

        public required string IslemReferansi { get; set; }
    }
}

namespace InsecASPNET.DTOs
{
    public class TeklifOlusturDto
    {
        public required string PolicyNumber { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int ProductId { get; set; }
        public int CustomerId { get; set; }

        public List<int> SelectedCoverageIds { get; set; } = new();

        public Dictionary<string, string>? RiskParameters { get; set; }

        public int? InsuredPersonId { get; set; }
        public InsuredPersonOlusturDto? YeniSigortali { get; set; }
    }

    public class TeklifGuncelleDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int ProductId { get; set; }
        public List<int> SelectedCoverageIds { get; set; } = new();

        public Dictionary<string, string>? RiskParameters { get; set; }
    }

    public class InsuredPersonOlusturDto
    {
        public required string AdSoyad { get; set; }
        public required string TcKimlikNo { get; set; }
        public DateOnly DogumTarihi { get; set; }
        public string Yakinlik { get; set; } = "Diger";
        public string? Telefon { get; set; }
    }
}

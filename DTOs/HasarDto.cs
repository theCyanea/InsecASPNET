namespace InsecASPNET.DTOs
{
    public class HasarOlusturDto
    {
        public int PolicyId { get; set; }

        public required string HasarTuru { get; set; }

        public DateTime HasarTarihi { get; set; }

        public string? HasarYeri { get; set; }

        public required string Aciklama { get; set; }


        public decimal? TahminiTutar { get; set; }

        public List<string>? FotografUrlleri { get; set; }
    }

    public class HasarDegerlendirDto
    {
        public required string YeniDurum { get; set; }
        public decimal? OnaylananTutar { get; set; }
        public string? Not { get; set; }
    }
}

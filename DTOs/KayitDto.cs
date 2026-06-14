namespace InsecASPNET.DTOs
{
    public class KayitDto
    {
        public required string Adi { get; set; }
        public required string Soyadi { get; set; }
        public required string KimlikNo { get; set; }
        public required string TelefonNo { get; set; }
        public required DateOnly DogumTarihi { get; set; }
        public required string Email { get; set; }
        public required string Sifre { get; set; }
    }
}
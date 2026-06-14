namespace InsecASPNET.DTOs
{
    public class MusteriDto
    {
        public int Id { get; set; }
        public string Adi { get; set; } = "";
        public string Soyadi { get; set; } = "";
        public string KimlikNo { get; set; } = "";
        public string TelefonNo { get; set; } = "";
        public DateOnly DogumTarihi { get; set; }
        public string Email { get; set; } = "";
        public string Rol { get; set; } = "";
        public bool IsActive { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
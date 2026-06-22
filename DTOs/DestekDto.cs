namespace InsecASPNET.DTOs
{
    public class DestekDto
    {
        public required string Konu { get; set; }
        public required string Mesaj { get; set; }
    }

    public class DestekMesajEkleDto
    {
        public required string Mesaj { get; set; }
    }

    public class DestekYanitDto
    {
        public required string Mesaj { get; set; }
        public bool TalebiKapat { get; set; } = false;
    }

    public class DestekDurumDto
    {
        public required string Durum { get; set; }
    }
}

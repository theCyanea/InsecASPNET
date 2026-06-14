namespace InsecASPNET.DTOs
{

    public class ProfilGuncelleDto
    {
        public required string Adi { get; set; }
        public required string Soyadi { get; set; }
        public required string TelefonNo { get; set; }
        public required string Email { get; set; }
    }

    public class SifreDegistirDto
    {
        public required string EskiSifre { get; set; }
        public required string YeniSifre { get; set; }
    }
}

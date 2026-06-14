using InsecASPNET.DTOs;

namespace InsecASPNET.Services.Payment
{

    public interface IPaymentService
    {
        Task<OdemeSonucu> OdemeyiIsleAsync(OdemeDto odeme, decimal tutar);
    }

    public class OdemeSonucu
    {
        public bool Basarili { get; set; }

        public string? HataMesaji { get; set; }

        public string KartSon4 { get; set; } = "";

        public string IslemReferansi { get; set; } = "";

        public string Durum { get; set; } = "";
    }
}

namespace InsecASPNET.Services.Pdf
{
    public interface IPolicePdfService
    {
        byte[] PoliceUret(InsecASPNET.Entities.Policy police);
        byte[] MakbuzUret(InsecASPNET.Entities.Payment odeme, InsecASPNET.Entities.Policy police);
    }
}

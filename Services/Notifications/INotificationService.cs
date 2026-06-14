namespace InsecASPNET.Services.Notifications
{
    public interface INotificationService
    {
        Task OlusturAsync(
            int customerId,
            string tip,
            string baslik,
            string mesaj,
            string? linkUrl = null,
            string? iconKey = null);
    }
}

namespace InsecASPNET.Services
{
    public interface IOtpService
    {
        string GenerateOtp(string email);
        bool ValidateOtp(string email, string otp);
        void RemoveOtp(string email);
    }
    public class OtpService : IOtpService
    {
        // email (otp kodu, oluşturulma zamanı)
        private static readonly Dictionary<string, (string Code, DateTime CreatedAt)> _otps = new();
        public string GenerateOtp(string email)
        {
            var otp = new Random().Next(100000, 999999).ToString();
            _otps[email] = (otp, DateTime.UtcNow);
            return otp;
        }
        public bool ValidateOtp(string email, string otp)
        {
            if (!_otps.TryGetValue(email, out var entry))
                return false;
            // 10 dakika geçerli
            if (DateTime.UtcNow - entry.CreatedAt > TimeSpan.FromMinutes(10))
            {
                _otps.Remove(email);
                return false;
            }
            return entry.Code == otp;
        }
        public void RemoveOtp(string email)
        {
            _otps.Remove(email);
        }
    }
}


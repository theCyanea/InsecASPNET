import type { Metadata } from "next";
// Vercel'in kendi paketi olan Geist fontunu içe aktarıyoruz
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
    title: "inSEC | Dünyanın Güvencesi",
    description: "Modern ve güvenilir sigortacılık deneyimi.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            {/* GeistSans.className ile tüm siteye bu teknolojik fontu uyguluyoruz */}
            <body className={`${GeistSans.className} antialiased bg-slate-50 text-slate-900`}>
                {children}
            </body>
        </html>
    );
}
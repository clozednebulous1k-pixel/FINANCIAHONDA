import { Analytics } from "@vercel/analytics/next";
import Pixel from "../components/Pixel";
import Providers from "../components/Providers";
import "./globals.css";

export const metadata = {
  title: "Honda · Fale com um consultor",
  description: "Escolha financiamento, consórcio ou conhecer motos e fale com um consultor Honda.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Pixel />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

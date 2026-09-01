import { Analytics } from "@vercel/analytics/next";
import Pixel from "../components/Pixel";
import "./globals.css";

export const metadata = {
  title: "Honda · Fale com um consultor",
  description: "Escolha financiamento, consórcio ou conhecer motos e fale com um consultor Honda.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Pixel />
        <Analytics />
      </body>
    </html>
  );
}

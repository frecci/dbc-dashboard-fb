export const metadata = {
  title: "DBC Dashboard — ASISD",
  description: "Monitoraggio dental business coach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}

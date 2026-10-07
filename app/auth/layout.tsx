import Image from "next/image";
import logo from "@/public/logo.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8">
      <Image src={logo} alt="Greenaway" priority className="h-auto w-48" />
      {children}
    </main>
  );
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draw - Login",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
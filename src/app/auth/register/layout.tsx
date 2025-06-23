import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draw - Register",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
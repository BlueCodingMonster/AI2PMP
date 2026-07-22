import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import ProfileClient from "@/components/profile/profile-client";

export const metadata = {
  title: "SDLC · 个人信息",
  description: "SDLC · 研发效能平台 - 个人信息面板",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  const formattedUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    department: user.department,
    level: user.level,
    position: user.position,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    createdAt: format(user.createdAt, "yyyy-MM-dd HH:mm"),
  };

  return <ProfileClient user={formattedUser} />;
}

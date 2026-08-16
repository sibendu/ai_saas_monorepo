import AppShell from "@/components/AppShell";
import UserManagement from "@/components/admin/UserManagement";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminUserGroups, getAdminUsers } from "@/lib/admin-page-data";
import { getAuthenticatedShellData } from "@/lib/role-menu";

interface AdminUsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const [{ session, menuSections, menuLayout }, users, userGroups] =
    await Promise.all([
      getAuthenticatedShellData(),
      getAdminUsers({
        name: readSearchParam(params.name),
        email: readSearchParam(params.email),
        company: readSearchParam(params.company),
        page: Number(readSearchParam(params.page)),
        pageSize: Number(readSearchParam(params.pageSize)),
      }),
      getAdminUserGroups(),
    ]);

  return (
    <AppShell
      user={session.user}
      menuSections={menuSections}
      menuLayout={menuLayout}
      pageTitle="Admin"
      pageSubtitle="Users"
    >
      <UserManagement data={users} availableGroups={userGroups} />
    </AppShell>
  );
}

import { NextResponse } from "next/server";
import {
  AdminUserCreateRequest,
  AdminUserSummary,
  ApiResponse,
  AdminUsersData,
} from "@saas/shared-types";
import { getAdminAuthorization } from "@/lib/admin-auth";
import { adminUserSelect, mapAdminUser } from "@/lib/admin-users";
import { getAdminUsers } from "@/lib/admin-page-data";
import { startEmailActivationRegistration } from "@/lib/activation-registration";
import { caseInsensitiveEquals, prisma } from "@/lib/prisma";
import { registerUser } from "@/lib/register";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeGroupIds(value: unknown): number[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const groupIds = value.map((id) =>
    typeof id === "string" && /^[1-9]\d*$/.test(id) ? Number(id) : NaN,
  );
  return groupIds.some((id) => !Number.isSafeInteger(id)) ||
    new Set(groupIds).size !== groupIds.length
    ? null
    : groupIds;
}

async function readCreateRequest(
  request: Request,
): Promise<Partial<AdminUserCreateRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserCreateRequest>;
  } catch {
    return null;
  }
}

export async function GET(request?: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization();

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const searchParams = request
      ? new URL(request.url).searchParams
      : new URLSearchParams();
    const toNumber = (value: string | null) =>
      value === null ? undefined : Number(value);
    const data = await getAdminUsers({
      name: searchParams.get("name") ?? "",
      email: searchParams.get("email") ?? "",
      company: searchParams.get("company") ?? "",
      page: toNumber(searchParams.get("page")),
      pageSize: toNumber(searchParams.get("pageSize")),
    });

    return NextResponse.json<ApiResponse<AdminUsersData>>({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await getAdminAuthorization();

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status },
    );
  }

  try {
    const body = await readCreateRequest(request);
    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const company = normalizeText(body.company) || null;
    const groupIds = normalizeGroupIds(body.groupIds);

    if (!name || !email || !isValidEmail(email)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "A valid name and email are required" },
        { status: 400 },
      );
    }
    if (!groupIds) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Group ids must be unique positive integers" },
        { status: 400 },
      );
    }
    if (
      body.creationMode !== "activation" &&
      body.creationMode !== "temporary_password"
    ) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Choose an account creation method" },
        { status: 400 },
      );
    }
    const temporaryPassword =
      typeof body.temporaryPassword === "string" ? body.temporaryPassword : "";
    if (
      body.creationMode === "temporary_password" &&
      temporaryPassword.length < 8
    ) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "Temporary password must be at least 8 characters",
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.customer.findFirst({
      where: { email: caseInsensitiveEquals(email) },
    });
    if (existingUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }
    if (groupIds.length > 0) {
      const groups = await prisma.userGroup.findMany({
        where: { id: { in: groupIds } },
        select: { id: true },
      });
      if (groups.length !== groupIds.length) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: "One or more groups were not found" },
          { status: 400 },
        );
      }
    }

    const result =
      body.creationMode === "activation"
        ? await startEmailActivationRegistration({ name, email, groupIds })
        : await registerUser({
            name,
            email,
            password: temporaryPassword,
            registrationType: "DIRECT",
            forcePasswordChange: true,
            groupIds,
          });

    if (!result.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: result.error ?? "Failed to create user" },
        { status: result.error?.includes("exists") ? 409 : 400 },
      );
    }

    const createdUser = await prisma.customer.findFirst({
      where: { email: caseInsensitiveEquals(email) },
      select: { id: true },
    });
    if (!createdUser) {
      throw new Error("Created user could not be found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: createdUser.id },
        data: { company },
      });
    });

    const user = await prisma.customer.findUnique({
      where: { id: createdUser.id },
      select: adminUserSelect,
    });
    if (!user) throw new Error("Created user could not be found");

    return NextResponse.json<ApiResponse<AdminUserSummary>>(
      {
        success: true,
        data: mapAdminUser(user),
        message:
          body.creationMode === "activation"
            ? "Activation invitation sent"
            : "User created with temporary password",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin user creation error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to create user" },
      { status: 500 },
    );
  }
}

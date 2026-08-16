import { NextResponse } from "next/server";
import {
  ApiResponse,
  AdminUserMutationRequest,
  AdminUserSummary,
} from "@saas/shared-types";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAdminAuthorization } from "@/lib/admin-auth";
import { adminUserSelect, mapAdminUser } from "@/lib/admin-users";
import { caseInsensitiveEquals, prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

interface NormalizedUserMutation {
  email: string;
  name: string;
  company: string | null;
}

function parseUserId(userId: string): number | null {
  const parsedUserId = Number(userId);

  return Number.isInteger(parsedUserId) && parsedUserId > 0
    ? parsedUserId
    : null;
}

async function readUserMutationRequest(
  request: Request,
): Promise<Partial<AdminUserMutationRequest> | null> {
  try {
    return (await request.json()) as Partial<AdminUserMutationRequest>;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCompany(value: unknown): string | null {
  const company = normalizeText(value);

  return company.length > 0 ? company : null;
}

function normalizeUserMutation(
  body: Partial<AdminUserMutationRequest>,
): NormalizedUserMutation {
  return {
    email: normalizeText(body.email).toLowerCase(),
    name: normalizeText(body.name),
    company: normalizeCompany(body.company),
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPrismaErrorCode(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const authorization = await getAdminAuthorization();

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status },
    );
  }

  const { userId } = await context.params;
  const parsedUserId = parseUserId(userId);

  if (!parsedUserId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid user id" },
      { status: 400 },
    );
  }

  try {
    const body = await readUserMutationRequest(request);

    if (!body) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 },
      );
    }

    const normalizedUser = normalizeUserMutation(body);

    if (!normalizedUser.name) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Name is required" },
        { status: 400 },
      );
    }

    if (!normalizedUser.email) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    if (!isValidEmail(normalizedUser.email)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Email format is invalid" },
        { status: 400 },
      );
    }

    const currentUser = await prisma.customer.findUnique({
      where: { id: parsedUserId },
      select: { id: true, email: true, name: true, company: true },
    });

    if (!currentUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const duplicateUser = await prisma.customer.findFirst({
      where: {
        email: caseInsensitiveEquals(normalizedUser.email),
        NOT: {
          id: parsedUserId,
        },
      },
    });

    if (duplicateUser) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const changedFields = [
      ...(currentUser.email.toLowerCase() !== normalizedUser.email
        ? ["email"]
        : []),
      ...(currentUser.name !== normalizedUser.name ? ["name"] : []),
      ...(currentUser.company !== normalizedUser.company ? ["company"] : []),
    ];

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.customer.update({
        where: { id: parsedUserId },
        data: normalizedUser,
        select: adminUserSelect,
      });

      await writeAdminAuditLog(tx, {
        actor: authorization,
        action: "USER_UPDATED",
        entityType: "CUSTOMER",
        entityId: parsedUserId.toString(),
        entityLabel: updatedUser.name,
        targetCustomerId: parsedUserId,
        metadata: { changedFields },
      });

      return updatedUser;
    });

    return NextResponse.json<ApiResponse<AdminUserSummary>>({
      success: true,
      data: mapAdminUser(user),
      message: "User updated successfully",
    });
  } catch (error) {
    const prismaErrorCode = getPrismaErrorCode(error);

    if (prismaErrorCode === "P2025") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    if (prismaErrorCode === "P2002") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    console.error("Admin user update error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const authorization = await getAdminAuthorization();

  if (!authorization.isAuthorized) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: authorization.error },
      { status: authorization.status },
    );
  }

  const { userId } = await context.params;
  const parsedUserId = parseUserId(userId);
  if (!parsedUserId) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid user id" },
      { status: 400 },
    );
  }
  if (parsedUserId === authorization.customer.id) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "You cannot delete your own account" },
      { status: 400 },
    );
  }

  try {
    const deletedUser = await prisma.customer.delete({
      where: { id: parsedUserId },
      select: { id: true, name: true },
    });

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id: deletedUser.id.toString() },
      message: `${deletedUser.name} was deleted`,
    });
  } catch (error) {
    const prismaErrorCode = getPrismaErrorCode(error);
    if (prismaErrorCode === "P2025") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }
    console.error("Admin user deletion error:", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to delete user" },
      { status: 500 },
    );
  }
}

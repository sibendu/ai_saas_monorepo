import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  customerFindManyMock,
  customerFindFirstMock,
  customerFindUniqueMock,
  customerUpdateMock,
  userGroupFindManyMock,
  getAdminAuthorizationMock,
  registerUserMock,
  startEmailActivationRegistrationMock,
  transactionMock,
} = vi.hoisted(() => ({
  customerFindManyMock: vi.fn(),
  customerFindFirstMock: vi.fn(),
  customerFindUniqueMock: vi.fn(),
  customerUpdateMock: vi.fn(),
  userGroupFindManyMock: vi.fn(),
  getAdminAuthorizationMock: vi.fn(),
  registerUserMock: vi.fn(),
  startEmailActivationRegistrationMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminAuthorization: getAdminAuthorizationMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    customer: {
      findMany: customerFindManyMock,
      findFirst: customerFindFirstMock,
      findUnique: customerFindUniqueMock,
    },
    userGroup: { findMany: userGroupFindManyMock },
  },
  caseInsensitiveEquals: (value: string) => ({ equals: value }),
}));

vi.mock("@/lib/register", () => ({ registerUser: registerUserMock }));
vi.mock("@/lib/activation-registration", () => ({
  startEmailActivationRegistration: startEmailActivationRegistrationMock,
}));

import { GET, POST } from "./route";

function authorizeAdmin() {
  getAdminAuthorizationMock.mockResolvedValue({
    isAuthorized: true,
    customer: {
      id: 1,
      email: "admin@example.com",
      name: "Admin User",
      company: null,
    },
  });
}

describe("admin users API", () => {
  beforeEach(() => {
    customerFindManyMock.mockReset();
    customerFindFirstMock.mockReset();
    customerFindUniqueMock.mockReset();
    customerUpdateMock.mockReset();
    userGroupFindManyMock.mockReset();
    getAdminAuthorizationMock.mockReset();
    registerUserMock.mockReset();
    startEmailActivationRegistrationMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation((callback) =>
      callback({
        customer: { update: customerUpdateMock },
      }),
    );
  });

  it("creates a temporary-password user, assigns selected groups, and returns a safe summary", async () => {
    authorizeAdmin();
    customerFindFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 3 });
    userGroupFindManyMock.mockResolvedValue([{ id: 7 }]);
    registerUserMock.mockResolvedValue({ success: true });
    customerFindUniqueMock.mockResolvedValue({
      id: 3,
      email: "new@example.com",
      name: "New User",
      firstName: "New",
      middleName: null,
      lastName: "User",
      company: "Acme",
      userGroupMemberships: [
        { group: { id: 7, name: "Support Team", description: null } },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "New@example.com",
          company: "Acme",
          groupIds: ["7"],
          creationMode: "temporary_password",
          temporaryPassword: "password123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { id: "3", email: "new@example.com", groups: [{ id: "7" }] },
    });
    expect(registerUserMock).toHaveBeenCalledWith({
      name: "New User",
      email: "new@example.com",
      password: "password123",
      registrationType: "DIRECT",
      forcePasswordChange: true,
      groupIds: [7],
    });
  });

  it("uses the General group when an admin does not select a group", async () => {
    authorizeAdmin();
    customerFindFirstMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 3 });
    registerUserMock.mockResolvedValue({ success: true });
    customerFindUniqueMock.mockResolvedValue({
      id: 3,
      email: "new@example.com",
      name: "New User",
      firstName: "New",
      middleName: null,
      lastName: "User",
      company: null,
      userGroupMemberships: [
        { group: { id: 11, name: "General", description: null } },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "new@example.com",
          creationMode: "temporary_password",
          temporaryPassword: "password123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ groupIds: [] }),
    );
    expect(userGroupFindManyMock).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers before listing users", async () => {
    getAdminAuthorizationMock.mockResolvedValue({
      isAuthorized: false,
      status: 403,
      error: "Admin access required",
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(response.status).toBe(403);
    expect(customerFindManyMock).not.toHaveBeenCalled();
  });

  it("returns users with read-only role summaries and omits sensitive fields", async () => {
    authorizeAdmin();
    customerFindManyMock.mockResolvedValue([
      {
        id: 2,
        email: "jane@example.com",
        name: "Jane Admin",
        firstName: "Jane",
        middleName: "A",
        lastName: "Admin",
        company: "Acme",
        userRoles: [
          {
            role: {
              id: 1,
              name: "Admin",
              description: "Full access",
            },
          },
        ],
        userGroupMemberships: [
          {
            group: {
              id: 7,
              name: "Support Team",
              description: "Support users",
            },
          },
        ],
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        filters: { name: "", email: "", company: "" },
        users: [
          {
            id: "2",
            email: "jane@example.com",
            name: "Jane Admin",
            firstName: "Jane",
            middleName: "A",
            lastName: "Admin",
            company: "Acme",
            groups: [
              {
                id: "7",
                name: "Support Team",
                description: "Support users",
              },
            ],
          },
        ],
      },
    });
    expect(JSON.stringify(payload)).not.toContain("password");
    expect(JSON.stringify(payload)).not.toContain("passwordResetToken");
    expect(customerFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { email: "asc" },
        select: expect.not.objectContaining({
          password: expect.anything(),
          passwordResetToken: expect.anything(),
          passwordResetExpiresAt: expect.anything(),
        }),
      }),
    );
  });
});

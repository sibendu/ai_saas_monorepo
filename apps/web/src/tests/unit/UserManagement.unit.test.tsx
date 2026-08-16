import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import UserManagement from "@/components/admin/UserManagement";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const initialUsers = [
  {
    id: "2",
    email: "jane@example.com",
    name: "Jane User",
    firstName: "Jane",
    middleName: "K",
    lastName: "User",
    company: "Acme",
    activationStatus: "ACTIVE" as const,
    groups: [
      {
        id: "10",
        name: "Support Team",
        description: "Support users",
      },
    ],
  },
];

const availableGroups = [
  {
    id: "10",
    name: "Support Team",
    description: "Support users",
    memberCount: 1,
    roles: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "11",
    name: "Finance Team",
    description: null,
    memberCount: 0,
    roles: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

function renderUsers() {
  return render(
    <UserManagement
      data={{
        users: initialUsers,
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        filters: { name: "", email: "", company: "" },
      }}
      availableGroups={availableGroups}
    />,
  );
}

describe("UserManagement", () => {
  it("renders each user with assigned groups", () => {
    renderUsers();

    expect(screen.getAllByText("jane@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane K User").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Support Team").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("updates profile and groups from the edit row", async () => {
    const user = userEvent.setup();

    server.use(
      http.put("*/api/admin/users/2", async () =>
        HttpResponse.json({
          success: true,
          message: "User updated successfully",
          data: {
            ...initialUsers[0],
            email: "jane.updated@example.com",
            name: "Jane Updated",
            firstName: "Jane",
            middleName: "K",
            lastName: "Updated",
            company: null,
          },
        }),
      ),
      http.put("*/api/admin/users/2/groups", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          groupIds: ["10", "11"],
        });

        return HttpResponse.json({
          success: true,
          message: "User groups updated successfully",
          data: {
            ...initialUsers[0],
            email: "jane.updated@example.com",
            name: "Jane Updated",
            firstName: "Jane",
            middleName: "K",
            lastName: "Updated",
            company: null,
            groups: [
              ...initialUsers[0].groups,
              {
                id: "11",
                name: "Finance Team",
                description: null,
              },
            ],
          },
        });
      }),
    );

    renderUsers();

    await user.click(
      screen.getAllByRole("button", { name: "Edit Jane User" }).at(-1)!,
    );
    await user.clear(screen.getByLabelText("Name", { selector: "#edit-name" }));
    await user.type(
      screen.getByLabelText("Name", { selector: "#edit-name" }),
      "Jane Updated",
    );
    await user.clear(
      screen.getByLabelText("Email", { selector: "#edit-email" }),
    );
    await user.type(
      screen.getByLabelText("Email", { selector: "#edit-email" }),
      "jane.updated@example.com",
    );
    await user.clear(
      screen.getByLabelText("Company", { selector: "#edit-company" }),
    );
    await user.click(screen.getByRole("button", { name: "Groups" }));
    await user.click(screen.getByRole("option", { name: "Finance Team" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("User and groups updated successfully"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("jane.updated@example.com").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Jane K Updated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No company").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Support Team, Finance Team").length,
    ).toBeGreaterThan(0);
  });
});

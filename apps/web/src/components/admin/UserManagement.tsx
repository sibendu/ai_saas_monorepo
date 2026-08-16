"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AdminUserCreateRequest,
  AdminUserGroupAssignmentRequest,
  AdminUserGroupSummary,
  AdminUserMutationRequest,
  AdminUserSummary,
  AdminUsersData,
} from "@saas/shared-types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readApiResponse } from "@/lib/client-api";
import GroupsMultiSelect from "./GroupsMultiSelect";

interface UserManagementProps {
  data: AdminUsersData;
  availableGroups: AdminUserGroupSummary[];
}
interface UserFormState {
  email: string;
  name: string;
  company: string;
}
interface CreateUserFormState {
  firstName: string;
  lastName: string;
  email: string;
  creationMode: "activation" | "temporary_password";
  temporaryPassword: string;
}
const emptyForm: UserFormState = { email: "", name: "", company: "" };
const emptyCreateForm: CreateUserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  creationMode: "activation",
  temporaryPassword: "",
};

function formFor(user: AdminUserSummary): UserFormState {
  return { email: user.email, name: user.name, company: user.company ?? "" };
}
function displayName(user: AdminUserSummary): string {
  return (
    [user.firstName, user.middleName, user.lastName]
      .filter(Boolean)
      .join(" ") || user.name
  );
}

export default function UserManagement({
  data,
  availableGroups,
}: UserManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState(data.users);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createGroups, setCreateGroups] = useState<string[]>([]);
  const [editing, setEditing] = useState<AdminUserSummary | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editGroups, setEditGroups] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { total, page, pageSize, totalPages, filters } = data;
  const visibleUsers = users;
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  useEffect(() => {
    setUsers(data.users);
  }, [data.users]);
  function updateQuery(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) =>
      value ? params.set(key, value) : params.delete(key),
    );
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }
  function refreshUsers() {
    router.refresh();
  }
  function resetNotice() {
    setMessage(null);
    setError(null);
  }
  function closeCreate() {
    setCreating(false);
    setCreateForm(emptyCreateForm);
    setCreateGroups([]);
  }
  function startEdit(user: AdminUserSummary) {
    setEditing(user);
    setEditForm(formFor(user));
    setEditGroups(user.groups.map((group) => group.id));
    resetNotice();
  }
  function closeEdit() {
    setEditing(null);
    setEditForm(emptyForm);
    setEditGroups([]);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    resetNotice();
    try {
      const body: AdminUserCreateRequest = {
        name: `${createForm.firstName.trim()} ${createForm.lastName.trim()}`.trim(),
        email: createForm.email,
        company: "",
        creationMode: createForm.creationMode,
        temporaryPassword: createForm.temporaryPassword,
        groupIds: createGroups,
      };
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readApiResponse<AdminUserSummary>(
        response,
        "Failed to create user",
      );
      if (!response.ok || !payload.success || !payload.data)
        throw new Error(payload.error ?? "Failed to create user");
      setUsers((current) => [...current, payload.data as AdminUserSummary]);
      closeCreate();
      setMessage(payload.message ?? "User created");
      refreshUsers();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to create user",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    resetNotice();
    try {
      const attributes: AdminUserMutationRequest = editForm;
      const attributesResponse = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attributes),
      });
      const attributesPayload = await readApiResponse<AdminUserSummary>(
        attributesResponse,
        "Failed to update user",
      );
      if (!attributesResponse.ok || !attributesPayload.success)
        throw new Error(attributesPayload.error ?? "Failed to update user");
      const groupRequest: AdminUserGroupAssignmentRequest = {
        groupIds: editGroups,
      };
      const groupsResponse = await fetch(
        `/api/admin/users/${editing.id}/groups`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupRequest),
        },
      );
      const groupsPayload = await readApiResponse<AdminUserSummary>(
        groupsResponse,
        "Failed to update groups",
      );
      if (!groupsResponse.ok || !groupsPayload.success || !groupsPayload.data)
        throw new Error(groupsPayload.error ?? "Failed to update groups");
      setUsers((current) =>
        current.map((user) =>
          user.id === editing.id
            ? (groupsPayload.data as AdminUserSummary)
            : user,
        ),
      );
      closeEdit();
      setMessage("User and groups updated successfully");
      refreshUsers();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to update user",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deleteUser(user: AdminUserSummary) {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setSaving(true);
    resetNotice();
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const payload = await readApiResponse<{ id: string }>(
        response,
        "Failed to delete user",
      );
      if (!response.ok || !payload.success)
        throw new Error(payload.error ?? "Failed to delete user");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(payload.message ?? "User deleted");
      refreshUsers();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Failed to delete user",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updateQuery({
              name: String(formData.get("name") ?? "").trim(),
              email: String(formData.get("email") ?? "").trim(),
              company: String(formData.get("company") ?? "").trim(),
              page: "1",
              pageSize: pageSize.toString(),
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto] lg:items-end">
            <label
              className="block text-sm font-semibold text-gray-700"
              htmlFor="user-name-search"
            >
              Name
              <input
                id="user-name-search"
                name="name"
                type="search"
                defaultValue={filters.name}
                placeholder="User name"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label
              className="block text-sm font-semibold text-gray-700"
              htmlFor="user-email-search"
            >
              Email
              <input
                id="user-email-search"
                name="email"
                type="search"
                defaultValue={filters.email}
                placeholder="Email"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label
              className="block text-sm font-semibold text-gray-700"
              htmlFor="user-company-search"
            >
              Company
              <input
                id="user-company-search"
                name="company"
                type="search"
                defaultValue={filters.company}
                placeholder="Company"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                closeCreate();
                setCreating(true);
                resetNotice();
              }}
              className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Add
            </button>
          </div>
        </form>
        {message && (
          <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      {creating && (
        <form
          className="rounded-lg bg-white p-4 shadow sm:p-5"
          onSubmit={createUser}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-gray-700" htmlFor="create-first-name">First Name
              <input id="create-first-name" required value={createForm.firstName} onChange={(event) => setCreateForm((state) => ({ ...state, firstName: event.target.value }))} disabled={saving} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-gray-700" htmlFor="create-last-name">Last Name
              <input id="create-last-name" required value={createForm.lastName} onChange={(event) => setCreateForm((state) => ({ ...state, lastName: event.target.value }))} disabled={saving} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-gray-700" htmlFor="create-email">Email
              <input id="create-email" type="email" required value={createForm.email} onChange={(event) => setCreateForm((state) => ({ ...state, email: event.target.value }))} disabled={saving} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <div className="mt-4 max-w-md">
            <label
              className="text-sm font-semibold text-gray-700"
              htmlFor="create-groups"
            >
              Groups
            </label>
            <GroupsMultiSelect
              id="create-groups"
              availableGroups={availableGroups}
              selectedGroupIds={createGroups}
              onChange={setCreateGroups}
              disabled={saving}
            />
            <p className="mt-1 text-xs text-gray-500">
              If no group is selected, the user is added to General.
            </p>
          </div>
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-gray-700">
              Account setup
            </legend>
            <label className="mt-2 flex gap-2 text-sm">
              <input
                type="radio"
                checked={createForm.creationMode === "activation"}
                onChange={() =>
                  setCreateForm((state) => ({
                    ...state,
                    creationMode: "activation",
                  }))
                }
              />
              Send an activation invitation
            </label>
            <label className="mt-2 flex gap-2 text-sm">
              <input
                type="radio"
                checked={createForm.creationMode === "temporary_password"}
                onChange={() =>
                  setCreateForm((state) => ({
                    ...state,
                    creationMode: "temporary_password",
                  }))
                }
              />
              Set a temporary password
            </label>
          </fieldset>
          {createForm.creationMode === "temporary_password" && (
            <label
              className="mt-4 block text-sm font-semibold text-gray-700"
              htmlFor="temporary-password"
            >
              Temporary password
              <input
                id="temporary-password"
                type="password"
                minLength={8}
                required
                value={createForm.temporaryPassword}
                onChange={(event) =>
                  setCreateForm((state) => ({
                    ...state,
                    temporaryPassword: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </label>
          )}
          <FormActions
            saving={saving}
            submitLabel="Create user"
            onCancel={closeCreate}
          />
        </form>
      )}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              All Users ({total})
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="flex items-center gap-2 text-sm text-gray-700"
                htmlFor="user-records-per-page"
              >
                Records per page
                <select
                  id="user-records-per-page"
                  value={pageSize}
                  onChange={(event) =>
                    updateQuery({
                      name: filters.name,
                      email: filters.email,
                      company: filters.company,
                      page: "1",
                      pageSize: event.target.value,
                    })
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                </select>
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    updateQuery({
                      name: filters.name,
                      email: filters.email,
                      company: filters.company,
                      page: Math.max(page - 1, 1).toString(),
                      pageSize: pageSize.toString(),
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    updateQuery({
                      name: filters.name,
                      email: filters.email,
                      company: filters.company,
                      page: Math.min(page + 1, totalPages).toString(),
                      pageSize: pageSize.toString(),
                    })
                  }
                  className="rounded-md border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Showing {startRecord}-{endRecord} of {total}
          </p>
        </div>
        <div className="sm:hidden" data-testid="user-mobile-list">
          <div className="space-y-3 p-4">
            {visibleUsers.map((user) => (
              <article
                key={user.id}
                className="rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <h3 className="break-words text-base font-semibold text-gray-900">
                  {displayName(user)}
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500">Email</dt>
                    <dd className="break-words text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Company</dt>
                    <dd>{user.company ?? "No company"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Groups</dt>
                    <dd>
                      {user.groups.length
                        ? user.groups.map((group) => group.name).join(", ")
                        : "No groups assigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500">Account status</dt>
                    <dd>
                      <ActivationStatus status={user.activationStatus} />
                    </dd>
                  </div>
                </dl>
                <Actions
                  user={user}
                  disabled={saving}
                  onEdit={startEdit}
                  onDelete={deleteUser}
                  mobile
                />
              </article>
            ))}
          </div>
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-[760px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Company", "Groups", "Account status"].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-sm font-medium">
                    {displayName(user)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.company ?? "No company"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.groups.length
                      ? user.groups.map((group) => group.name).join(", ")
                      : "No groups assigned"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <ActivationStatus status={user.activationStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Actions
                      user={user}
                      disabled={saving}
                      onEdit={startEdit}
                      onDelete={deleteUser}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleUsers.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-gray-500">
            No users were found.
          </p>
        )}
      </div>
      {editing && (
        <form
          className="rounded-lg bg-white p-4 shadow sm:p-5"
          onSubmit={saveUser}
        >
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Edit user
          </h3>
          <FormFields
            prefix="edit"
            state={editForm}
            onChange={setEditForm}
            groupIds={editGroups}
            onGroupsChange={setEditGroups}
            availableGroups={availableGroups}
            disabled={saving}
          />
          <FormActions
            saving={saving}
            submitLabel="Save"
            onCancel={closeEdit}
          />
        </form>
      )}
    </section>
  );
}

interface FormFieldsProps<T extends UserFormState> {
  prefix: string;
  state: T;
  onChange: (value: T) => void;
  groupIds: string[];
  onGroupsChange: (value: string[]) => void;
  availableGroups: AdminUserGroupSummary[];
  disabled: boolean;
}
function FormFields<T extends UserFormState>({
  prefix,
  state,
  onChange,
  groupIds,
  onGroupsChange,
  availableGroups,
  disabled,
}: FormFieldsProps<T>) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label
        className="text-sm font-semibold text-gray-700"
        htmlFor={`${prefix}-name`}
      >
        Name
        <input
          id={`${prefix}-name`}
          required
          value={state.name}
          onChange={(event) => onChange({ ...state, name: event.target.value })}
          disabled={disabled}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label
        className="text-sm font-semibold text-gray-700"
        htmlFor={`${prefix}-email`}
      >
        Email
        <input
          id={`${prefix}-email`}
          type="email"
          required
          value={state.email}
          onChange={(event) =>
            onChange({ ...state, email: event.target.value })
          }
          disabled={disabled}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label
        className="text-sm font-semibold text-gray-700"
        htmlFor={`${prefix}-company`}
      >
        Company
        <input
          id={`${prefix}-company`}
          value={state.company}
          onChange={(event) =>
            onChange({ ...state, company: event.target.value })
          }
          disabled={disabled}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <div>
        <label
          className="text-sm font-semibold text-gray-700"
          htmlFor={`${prefix}-groups`}
        >
          Groups
        </label>
        <GroupsMultiSelect
          id={`${prefix}-groups`}
          availableGroups={availableGroups}
          selectedGroupIds={groupIds}
          onChange={onGroupsChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
function FormActions({
  saving,
  submitLabel,
  onCancel,
}: {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex gap-3">
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-indigo-300"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="min-h-11 rounded-md px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
      >
        Cancel
      </button>
    </div>
  );
}
function ActivationStatus({ status }: { status: AdminUserSummary["activationStatus"] }) {
  const isPending = status === "PENDING";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isPending ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
      }`}
    >
      {isPending ? "Activation pending" : "Active"}
    </span>
  );
}
function Actions({
  user,
  disabled,
  onEdit,
  onDelete,
  mobile = false,
}: {
  user: AdminUserSummary;
  disabled: boolean;
  onEdit: (user: AdminUserSummary) => void;
  onDelete: (user: AdminUserSummary) => void;
  mobile?: boolean;
}) {
  return (
    <div className={mobile ? "mt-4 flex gap-3" : "flex justify-end gap-3"}>
      <button
        type="button"
        aria-label={`Edit ${user.name}`}
        disabled={disabled}
        onClick={() => onEdit(user)}
        className={
          mobile
            ? "min-h-11 flex-1 rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700"
            : "font-semibold text-indigo-600"
        }
      >
        Edit
      </button>
      <button
        type="button"
        aria-label={`Delete ${user.name}`}
        disabled={disabled}
        onClick={() => void onDelete(user)}
        className={
          mobile
            ? "min-h-11 flex-1 rounded-md border border-red-600 px-4 py-2 text-sm font-semibold text-red-700"
            : "font-semibold text-red-600"
        }
      >
        Delete
      </button>
    </div>
  );
}

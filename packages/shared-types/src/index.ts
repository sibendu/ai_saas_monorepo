// User and Authentication types
export interface User {
  id: string;
  username?: string;
  email: string;
  role: "admin" | "user";
  roles?: Role[];
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  modules?: RoleModule[];
}

export interface Module {
  id: string;
  label: string;
  displayOrder?: number;
  icon?: string | null;
  href?: string | null;
  subModules?: SubModule[];
}

export interface SubModule {
  id: string;
  moduleId: string;
  label: string;
  displayOrder?: number;
  icon?: string | null;
  href: string;
}

export interface AllowedSubModule {
  id: string;
  label: string;
  displayOrder?: number;
  icon?: string | null;
  href: string;
}

export interface AllowedModule {
  id: string;
  label: string;
  displayOrder?: number;
  icon?: string | null;
  href?: string | null;
  subModules: AllowedSubModule[];
}

export interface RoleModule {
  id: string;
  roleId: string;
  moduleId: string;
  subModuleId?: string | null;
  module?: Module;
  subModule?: SubModule | null;
}

export interface UserRole {
  customerId: string;
  roleId: string;
  role?: Role;
}

export interface UserRolesRequest {
  email: string;
}

export interface UserRolesResponse {
  success: boolean;
  roles: Role[];
  modules: AllowedModule[];
  error?: string;
}

export interface AdminRoleSummary {
  id: string;
  name: string;
  description?: string | null;
  groupCount: number;
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRolesData {
  roles: AdminRoleSummary[];
}

export interface AdminSubModuleSummary {
  id: string;
  moduleId: string;
  label: string;
  displayOrder: number;
  icon?: string | null;
  href: string;
}

export interface AdminChildModuleSummary {
  id: string;
  parentModuleId: string;
  label: string;
  displayOrder: number;
  icon?: string | null;
  href?: string | null;
}

export interface AdminModuleSummary {
  id: string;
  parentModuleId?: string | null;
  parentModuleLabel?: string | null;
  label: string;
  displayOrder: number;
  icon?: string | null;
  href?: string | null;
  childModuleCount: number;
  childModules: AdminChildModuleSummary[];
  subModules: AdminSubModuleSummary[];
}

export interface AdminModulesData {
  modules: AdminModuleSummary[];
}

export interface AdminModuleMutationRequest {
  label: string;
  parentModuleId?: string | null;
  displayOrder?: number | null;
  icon?: string | null;
  href?: string | null;
}

export interface AdminRoleModuleMappingData {
  roleId: string;
  moduleIds: string[];
  subModuleIds: string[];
}

export interface AdminRoleModuleMappingRequest {
  moduleIds: string[];
  subModuleIds: string[];
}

export interface AdminRoleMutationRequest {
  name: string;
  description?: string | null;
}

export interface AdminUserRoleSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  company?: string | null;
  activationStatus: "ACTIVE" | "PENDING";
  groups: AdminUserGroupMembershipSummary[];
}

export interface AdminUsersData {
  users: AdminUserSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AdminUserSearchFilters;
}

export interface AdminUserSearchFilters {
  name: string;
  email: string;
  company: string;
}

export interface AdminUserGroupMembershipSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface AdminUserGroupSummary {
  id: string;
  name: string;
  description?: string | null;
  memberCount: number;
  roles: AdminUserRoleSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserGroupsData {
  userGroups: AdminUserGroupSummary[];
}

export interface AdminUserGroupMutationRequest {
  name: string;
  description?: string | null;
}

export interface AdminUserGroupUsersData {
  group: AdminUserGroupSummary;
  users: AdminUserSummary[];
}

export interface AdminUserGroupUserAssignmentRequest {
  userId: string;
}

export interface AdminUserGroupRolesData {
  group: AdminUserGroupSummary;
  roles: AdminUserRoleSummary[];
}

export interface AdminUserGroupRoleAssignmentRequest {
  roleIds: string[];
}

export interface AdminUserMutationRequest {
  email: string;
  name: string;
  company?: string | null;
}

export interface AdminUserCreateRequest extends AdminUserMutationRequest {
  groupIds: string[];
  creationMode: "activation" | "temporary_password";
  temporaryPassword?: string;
}

export interface AdminUserGroupAssignmentRequest {
  groupIds: string[];
}

export type AdminAuditAction =
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "USER_UPDATED"
  | "USER_ROLES_UPDATED"
  | "GROUP_ROLES_UPDATED"
  | "ROLE_MODULES_UPDATED";

export type AdminAuditEntityType =
  "ROLE" | "CUSTOMER" | "USER_ROLE" | "GROUP_ROLE" | "ROLE_MODULE";

export interface AdminAuditLogSummary {
  id: string;
  actorCustomerId?: string | null;
  actorEmail: string;
  action: AdminAuditAction;
  entityType: AdminAuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  targetCustomerId?: string | null;
  targetRoleId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminAuditLogsData {
  logs: AdminAuditLogSummary[];
  nextCursor?: string | null;
  totalCount: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: CustomerSearchFilters;
}

export interface CustomerSearchFilters {
  name: string;
  company: string;
  email: string;
}

export interface CustomerMutationRequest {
  name: string;
  email: string;
  company: string;
  phone: string;
  status: Customer["status"];
}

export interface Task {
  taskId: string;
  title: string;
  project: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  date: string;
  owner: string;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}

export interface DashboardKpi {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
}

export interface DashboardChannel {
  label: string;
  value: number;
}

export interface DashboardCampaign {
  name: string;
  spend: string;
  roas: string;
}

export interface DashboardRevenueDetail {
  label: string;
  value: string;
  tone?: "default" | "accent";
}

export interface DashboardRevenueSummary {
  value: string;
  delta: string;
  details: DashboardRevenueDetail[];
}

export interface DashboardData {
  variant: "admin" | "sales" | "crm" | "marketing" | "general";
  welcomeMessage: string;
  summaryMessage: string;
  kpiCards: DashboardKpi[];
  revenueSeries: number[];
  revenueSummary: DashboardRevenueSummary;
  channelBreakdown: DashboardChannel[];
  topCampaigns: DashboardCampaign[];
}

export interface DashboardRequest {
  user: {
    email: string;
    name?: string | null;
    roleNames?: string[];
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

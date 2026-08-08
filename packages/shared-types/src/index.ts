// User and Authentication types
export interface User {
  id: string;
  username?: string;
  email: string;
  role: 'admin' | 'user';
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
  icon?: string | null;
  href?: string | null;
  subModules?: SubModule[];
}

export interface SubModule {
  id: string;
  moduleId: string;
  label: string;
  icon?: string | null;
  href: string;
}

export interface AllowedSubModule {
  id: string;
  label: string;
  icon?: string | null;
  href: string;
}

export interface AllowedModule {
  id: string;
  label: string;
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
  userCount: number;
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
  icon?: string | null;
  href: string;
}

export interface AdminModuleSummary {
  id: string;
  label: string;
  icon?: string | null;
  href?: string | null;
  subModules: AdminSubModuleSummary[];
}

export interface AdminModulesData {
  modules: AdminModuleSummary[];
}

export interface AdminModuleMutationRequest {
  label: string;
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
  company?: string | null;
  roles: AdminUserRoleSummary[];
}

export interface AdminUsersData {
  users: AdminUserSummary[];
}

export interface AdminUserMutationRequest {
  email: string;
  name: string;
  company?: string | null;
}

export interface AdminUserRoleAssignmentRequest {
  roleIds: string[];
}

export type AdminAuditAction =
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'USER_UPDATED'
  | 'USER_ROLES_UPDATED'
  | 'ROLE_MODULES_UPDATED';

export type AdminAuditEntityType = 'ROLE' | 'CUSTOMER' | 'USER_ROLE' | 'ROLE_MODULE';

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
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

export interface CustomersResponse {
  customers: Customer[];
  total: number;
}

export interface Task {
  taskId: string;
  title: string;
  project: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
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
  trend: 'up' | 'down';
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

export interface DashboardData {
  welcomeMessage: string;
  kpiCards: DashboardKpi[];
  revenueSeries: number[];
  channelBreakdown: DashboardChannel[];
  topCampaigns: DashboardCampaign[];
}

export interface DashboardRequest {
  user: {
    email: string;
    name?: string | null;
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

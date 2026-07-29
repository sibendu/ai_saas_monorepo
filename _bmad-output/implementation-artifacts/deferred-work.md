- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-4-2-admin-role-management.md`
  summary: Add a uniqueness guarantee for `Customer.email` before relying on email as a privileged authorization lookup key.
  evidence: Review found `getAdminAuthorization()` authorizes with `customer.findFirst({ where: { email } })`, while `Customer.email` is not unique in `apps/web/prisma/schema.prisma`; duplicate rows could make privileged admin binding ambiguous.

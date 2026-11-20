import { PlatformRoleGuard } from './platform-role-guard'

function AdminGuard() {
  return <PlatformRoleGuard area="admin" />
}

export default AdminGuard

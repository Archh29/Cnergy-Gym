import AdminDashboardClient from "./client-wrapper"

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  return <AdminDashboardClient />
}

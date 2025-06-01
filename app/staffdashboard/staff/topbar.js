import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell } from "lucide-react"

const Topbar = ({ searchQuery, setSearchQuery, userRole }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-md">
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <Button variant="ghost" size="icon">
        <Bell className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{userRole}</span>
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-sm">👤</span>
        </div>
      </div>
    </div>
  )
}

export default Topbar


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell } from "lucide-react"

const Topbar = ({ searchQuery, setSearchQuery, userRole }) => {
  return (
    <div className="flex items-center gap-4">
     
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

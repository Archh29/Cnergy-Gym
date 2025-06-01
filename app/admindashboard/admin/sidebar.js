"use client"

import { useRouter } from "next/navigation"
import {
  FaHome,
  FaUsers,
  FaUserTie,
  FaIdCard,
  FaBullhorn,
  FaDumbbell,
  FaClipboardList,
  FaTasks,
  FaCheckCircle,
  FaChalkboardTeacher,
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaShoppingCart,
} from "react-icons/fa"
import { GiWhistle } from "react-icons/gi"
import { Button } from "@/components/ui/button"

const Sidebar = ({ activeSection, setActiveSection, toggleDarkMode, darkMode }) => {
  const router = useRouter()

  const handleLogout = async () => {
    // Make a request to your logout PHP endpoint to clear session and cookies
    await fetch("http://localhost/cynergy/logout.php", {
      method: "GET",
      credentials: "include", // Ensure that cookies are sent with the request
    })

    // Clear sessionStorage and cookies
    sessionStorage.clear()
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC"

    // Redirect to the login page
    router.push("/login")
  }

  const sections = [
    { name: "Home", icon: <FaHome className="mr-2 h-4 w-4" /> },
    { name: "ViewMembers", icon: <FaUsers className="mr-2 h-4 w-4" /> },
    { name: "ViewStaff", icon: <FaUserTie className="mr-2 h-4 w-4" /> },
    { name: "ViewCoach", icon: <GiWhistle className="mr-2 h-4 w-4" /> },
    { name: "SubscriptionPlans", icon: <FaIdCard className="mr-2 h-4 w-4" /> },
    { name: "MonitorSubscriptions", icon: <FaClipboardList className="mr-2 h-4 w-4" /> },
    { name: "Sales", icon: <FaShoppingCart className="mr-2 h-4 w-4" /> }, // Added Sales section
    { name: "AttendanceTracking", icon: <FaCheckCircle className="mr-2 h-4 w-4" /> },
    { name: "CoachAssignments", icon: <FaTasks className="mr-2 h-4 w-4" /> },
    { name: "Exercises", icon: <FaDumbbell className="mr-2 h-4 w-4" /> },
    { name: "FreePrograms", icon: <FaChalkboardTeacher className="mr-2 h-4 w-4" /> },
    { name: "Announcement", icon: <FaBullhorn className="mr-2 h-4 w-4" /> },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col">
      <div className="p-4 border-b dark:border-gray-800">
        <Button variant="outline" className="w-full justify-start p-2">
          <div className="w-4 h-4 rounded bg-black dark:bg-white mr-2 flex-shrink-0" />
          <span className="text-xl font-extrabold truncate">
            <span className="text-orange-500">C</span>NERGY GYM
          </span>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          {sections.map(({ name, icon }) => (
            <Button
              key={name}
              variant={activeSection === name ? "secondary" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => setActiveSection(name)}
            >
              {icon}
              <span className="text-sm font-medium truncate">{name.replace(/([A-Z])/g, " $1").trim()}</span>
            </Button>
          ))}
        </div>
      </nav>
      <div className="p-4 border-t dark:border-gray-800">
        <Button variant="outline" className="w-full justify-start mb-2" onClick={toggleDarkMode}>
          {darkMode ? (
            <FaSun className="mr-2 h-4 w-4 text-yellow-500" />
          ) : (
            <FaMoon className="mr-2 h-4 w-4 text-gray-500" />
          )}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </Button>
        <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
          <FaSignOutAlt className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar

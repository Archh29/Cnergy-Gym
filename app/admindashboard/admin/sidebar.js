"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
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
  FaUserFriends,
  FaTimes,
  FaGift,
  FaBox,
  FaCog,
} from "react-icons/fa"
import { GiWhistle } from "react-icons/gi"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const Sidebar = ({
  activeSection = "Home",
  setActiveSection = () => { },
  toggleDarkMode = () => { },
  darkMode = false,
  collapsed = false,
  onToggle = () => { }
}) => {
  const router = useRouter()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/logout", { method: "GET", credentials: "include" })
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear()
    } catch {
      // ignore
    }
    try {
      document.cookie = `user_role=;expires=${new Date(0).toUTCString()};path=/;SameSite=Lax`
    } catch {
      // ignore
    }
    window.location.href = "/login"
  }, [router])

  const handleSectionClick = useCallback((name) => {
    if (setActiveSection) {
      setActiveSection(name)
    }
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onToggle) {
      onToggle()
    }
  }, [setActiveSection, onToggle])

  const sections = [
    { name: "Home", icon: <FaHome className="mr-2 h-4 w-4" /> },
    { name: "ViewClients", icon: <FaUsers className="mr-2 h-4 w-4" /> },
    { name: "ViewStaff", icon: <FaUserTie className="mr-2 h-4 w-4" /> },
    { name: "ViewCoach", icon: <GiWhistle className="mr-2 h-4 w-4" /> },
    { name: "StaffMonitoring", icon: <FaClipboardList className="mr-2 h-4 w-4" /> },
    { name: "SubscriptionPlans", icon: <FaIdCard className="mr-2 h-4 w-4" /> },
    { name: "MonitorSubscriptions", icon: <FaClipboardList className="mr-2 h-4 w-4" /> },
    { name: "Sales", icon: <FaShoppingCart className="mr-2 h-4 w-4" /> }, // Added Sales section
    { name: "AttendanceTracking", icon: <FaCheckCircle className="mr-2 h-4 w-4" /> },
    { name: "CoachAssignments", icon: <FaTasks className="mr-2 h-4 w-4" /> },
    { name: "Exercises", icon: <FaDumbbell className="mr-2 h-4 w-4" /> },
    { name: "FreePrograms", icon: <FaChalkboardTeacher className="mr-2 h-4 w-4" /> },
    { name: "Promotions", icon: <FaGift className="mr-2 h-4 w-4" /> },
    { name: "Merchandise", icon: <FaBox className="mr-2 h-4 w-4" /> },
    { name: "Announcement", icon: <FaBullhorn className="mr-2 h-4 w-4" /> },
  ]

  return (
    <aside className={`bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out fixed lg:relative z-50 ${collapsed ? 'w-0 -translate-x-full lg:w-16 lg:translate-x-0' : 'w-64 translate-x-0'
      }`}>
      <div className={`p-4 border-b dark:border-gray-800 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <Button variant="outline" className={`flex-1 justify-start p-2 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="w-4 h-4 rounded bg-black dark:bg-white mr-2 flex-shrink-0" />
            <span className={`text-xl font-extrabold truncate ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="text-orange-500">C</span>NERGY GYM
            </span>
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden ml-2 h-8 w-8"
          >
            <FaTimes className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className={`flex-1 overflow-y-auto p-2 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <div className="mb-4">
          {sections.map(({ name, icon }) => (
            <Button
              key={name}
              variant={activeSection === name ? "secondary" : "ghost"}
              className={`w-full mb-1 ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
              onClick={() => handleSectionClick(name)}
              title={collapsed ? (name === "StaffMonitoring" ? "Activity Logs" : name === "ViewClients" ? "View Client" : name.replace(/([A-Z])/g, " $1").trim()) : ""}
            >
              {icon}
              <span className={`text-sm font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
                {name === "StaffMonitoring" ? "Activity Logs" : name === "ViewClients" ? "View Client" : name.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </Button>
          ))}
        </div>
      </nav>
      <div className={`p-4 border-t dark:border-gray-800 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <Button
          variant="outline"
          className={`w-full mb-2 ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
          onClick={toggleDarkMode}
          title={collapsed ? (darkMode ? "Light Mode" : "Dark Mode") : ""}
        >
          {darkMode ? (
            <FaSun className="mr-2 h-4 w-4 text-yellow-500" />
          ) : (
            <FaMoon className="mr-2 h-4 w-4 text-gray-500" />
          )}
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </Button>
        <Button
          variant="destructive"
          className={`w-full ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
          onClick={() => setLogoutDialogOpen(true)}
          title={collapsed ? "Logout" : ""}
        >
          <FaSignOutAlt className="mr-2 h-4 w-4" />
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>
            Logout
          </span>
        </Button>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="border border-gray-200/70 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-950">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 flex items-center justify-center flex-shrink-0 border border-red-100 dark:border-red-900/60">
                <FaSignOutAlt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">Confirm logout</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  You’re about to end this session and return to the login screen.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="h-10 px-5 border-gray-200 dark:border-gray-800">Stay logged in</AlertDialogCancel>
            <AlertDialogAction
              className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                setLogoutDialogOpen(false)
                await handleLogout()
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

export default Sidebar

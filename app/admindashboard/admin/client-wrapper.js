"use client"

import { useState, useEffect } from "react"
import Sidebar from "./sidebar"
import Home from "./home"
import ViewMembers from "./viewmembers"
import ViewStaff from "./viewstaff"
import ViewCoach from "./viewcoach"
import StaffMonitoring from "./staffmonitoring"
import Topbar from "./topbar"
import Announcement from "./announcement"
import SubscriptionPlans from "./subscriptionplan"
import { Button } from "@/components/ui/button"
import { PanelLeft, AlertCircle, CheckCircle, Clock, X, Menu } from "lucide-react"
import AttendanceTracking from "./attendancetracking"
import MonitorSubscriptions from "./monitorsubscription"
import CoachAssignments from "./coachassignment"
import Exercises from "./exercises"
import FreePrograms from "./freeprograms"
import Sales from "./sales"
import GuestManagement from "./guestmanagement"
import Promotions from "./promotions"
import Merchandise from "./merchandise"
import SupportRequests from "./supportrequests"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function AdminDashboardClient() {
  const [currentSection, setCurrentSection] = useState("Home")
  const [searchQuery, setSearchQuery] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userId, setUserId] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [globalModal, setGlobalModal] = useState({ show: false, title: "", message: "", type: "info" })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("https://api.cnergy.site/session.php", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })
      
      if (response.status === 401) {
        // 401 means unauthorized - session expired or not authenticated
        // This is expected with third-party cookie restrictions
        // Fall back to sessionStorage if available
        const storedUserId = sessionStorage.getItem("user_id")
        if (storedUserId) {
          console.log("Session expired (401), using stored user_id:", storedUserId)
          setUserId(parseInt(storedUserId))
          return parseInt(storedUserId)
        }
        // If no stored user_id, session is truly invalid
        return null
      }
      
      if (!response.ok) {
        // For other errors, try fallback but log the error
        const storedUserId = sessionStorage.getItem("user_id")
        if (storedUserId) {
          console.warn(`Session check failed (${response.status}), using stored user_id as fallback`)
          setUserId(parseInt(storedUserId))
          return parseInt(storedUserId)
        }
        throw new Error(`Session check failed: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.user_id) {
        setUserId(data.user_id)
        sessionStorage.setItem("user_id", data.user_id)
        return data.user_id
      } else if (data.error) {
        console.warn("Session error:", data.error)
        // Try to use stored user_id as fallback
        const storedUserId = sessionStorage.getItem("user_id")
        if (storedUserId) {
          setUserId(parseInt(storedUserId))
          return parseInt(storedUserId)
        }
      }
    } catch (error) {
      // Network errors or other exceptions
      const storedUserId = sessionStorage.getItem("user_id")
      if (storedUserId) {
        console.log("Session API unavailable, using stored user_id:", storedUserId)
        setUserId(parseInt(storedUserId))
        return parseInt(storedUserId)
      }
      // Only log error if we truly have no fallback
      console.error("Error fetching user info and no fallback available:", error)
    }
    return null
  }

  useEffect(() => {
    if (!isClient) return

    const role = sessionStorage.getItem("role") || sessionStorage.getItem("user_role") || "Admin"
    setUserRole(role)

    // Get user ID from session storage first (fastest)
    const storedUserId = sessionStorage.getItem("user_id")
    if (storedUserId) {
      setUserId(parseInt(storedUserId))
      // Still try to refresh from API in background (but don't block)
      // Silently handle failures - we already have user_id from sessionStorage
      fetchUserInfo().catch(() => {
        // Silently fail - we have sessionStorage fallback
      })
    } else {
      // If no user ID in session, try to get it from API
      fetchUserInfo().then(userId => {
        if (!userId) {
          // Only log as warning, not error - user might need to log in again
          console.warn("Could not retrieve user_id. User may need to log in again.")
        }
      }).catch(() => {
        // Silently handle - already logged in fetchUserInfo if needed
      })
    }

    // Load dark mode state (only on client)
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
      setDarkMode(true)
    }

    // Handle responsive sidebar behavior
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setSidebarCollapsed(true)
      }
    }

    // Set initial state based on screen size (only on client)
    handleResize()
    window.addEventListener("resize", handleResize)

    // Listen for global modal events
    const handleGlobalModal = (event) => {
      const { title, message, type, show } = event.detail
      setGlobalModal({ show, title, message, type })
    }

    window.addEventListener("show-global-modal", handleGlobalModal)
    return () => {
      window.removeEventListener("show-global-modal", handleGlobalModal)
      window.removeEventListener("resize", handleResize)
    }
  }, [isClient])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (typeof window !== 'undefined') {
      if (newMode) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("theme", "light")
      }
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const renderSection = () => {
    switch (currentSection) {
      case "Home":
        return <Home />
      case "ViewUsers":
        return <ViewMembers userId={userId} />
      case "ViewStaff":
        return <ViewStaff />
      case "ViewCoach":
        return <ViewCoach />
      case "StaffMonitoring":
        return <StaffMonitoring />
      case "SubscriptionPlans":
        return <SubscriptionPlans />
      case "Announcement":
        return <Announcement />
      case "AttendanceTracking":
        return <AttendanceTracking userId={userId} />
      case "DayPassAccess":
        return <GuestManagement />
      case "MonitorSubscriptions":
        return <MonitorSubscriptions userId={userId} />
      case "Sales":
        return <Sales userId={userId} />
      case "CoachAssignments":
        return <CoachAssignments userId={userId} />
      case "Exercises":
        return <Exercises />
      case "FreePrograms":
        return <FreePrograms />
      case "Promotions":
        return <Promotions />
      case "Merchandise":
        return <Merchandise />
      case "SupportRequests":
        return <SupportRequests />
      default:
        return <Home />
    }
  }

  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 relative`}>
      {/* Mobile backdrop overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <Sidebar
        activeSection={currentSection}
        setActiveSection={setCurrentSection}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ Top bar now supports dark mode */}
        <header className="flex items-center justify-between border-b bg-white dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
              <span className="hidden sm:inline">Dashboard</span>
              <span className="font-medium">{currentSection}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} userRole={userRole} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-6">{renderSection()}</main>
      </div>

      {/* Global Modal for Notifications */}
      <Dialog open={globalModal.show} onOpenChange={(open) => setGlobalModal({ ...globalModal, show: open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {globalModal.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : globalModal.type === "warning" ? (
                <Clock className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {globalModal.title}
            </DialogTitle>
            <DialogDescription className="text-left">
              {globalModal.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setGlobalModal({ ...globalModal, show: false })}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

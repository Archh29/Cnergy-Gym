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
import Promotions from "./promotions"
import Merchandise from "./merchandise"
import AdminChat from "./admin-chat"
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

  // Listen for navigation events from home page cards
  useEffect(() => {
    const handleNavigate = (event) => {
      const section = event.detail?.section
      if (section) {
        setCurrentSection(section)
      }
    }

    window.addEventListener('adminNavigate', handleNavigate)
    return () => {
      window.removeEventListener('adminNavigate', handleNavigate)
    }
  }, [])

  // Listen for toast click → open subscription details for user
  useEffect(() => {
    const handleOpenSubscriptionDetails = () => {
      setCurrentSection('MonitorSubscriptions')
    }
    window.addEventListener('open-subscription-details-for-user', handleOpenSubscriptionDetails)
    return () => window.removeEventListener('open-subscription-details-for-user', handleOpenSubscriptionDetails)
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/session", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })

      // Try to parse response even if status is 401 (expected with third-party cookies)
      // 401 responses can still have a JSON body
      let data = null
      try {
        // Read response as text first to handle 401 responses
        const text = await response.text()
        if (text && text.trim()) {
          data = JSON.parse(text)
        }
      } catch (e) {
        // Response might not be JSON or might be empty
        // This is okay - 401 is expected with third-party cookie restrictions
      }

      // Check if authenticated (even if status was 401, response might have data)
      if (data && data.authenticated === true && data.user_id) {
        // User is authenticated via session
        setUserId(data.user_id)
        sessionStorage.setItem("user_id", data.user_id)
        return data.user_id
      }

      return null
    } catch (error) {
      // Don't log 401 errors or network errors - they're expected
      // Only log unexpected errors
      if (error.name !== 'TypeError' &&
        error.message !== 'Failed to fetch' &&
        !error.message.includes('401') &&
        !error.message.includes('Unauthorized')) {
        console.warn("Error fetching user info:", error.message)
      }
      return null
    }
  }

  const forceLogoutAndRedirect = () => {
    try {
      sessionStorage.removeItem("role")
      sessionStorage.removeItem("user_role")
      sessionStorage.removeItem("user_id")
    } catch {
      // ignore
    }
    document.cookie = `user_role=;expires=${new Date(0).toUTCString()};path=/;SameSite=Lax`
    window.location.href = "/login"
  }

  useEffect(() => {
    if (!isClient) return

    // Authoritative auth check: if session is not valid, force re-login.
    fetch("/api/session", {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (res) => {
        let data = null
        try {
          data = await res.json()
        } catch {
          data = null
        }

        if (data?.authenticated === true && data.user_id && (data.user_role === "admin" || data.user_role === "staff")) {
          setUserRole(data.user_role)
          setUserId(data.user_id)
          sessionStorage.setItem("user_role", data.user_role)
          sessionStorage.setItem("user_id", String(data.user_id))
          document.cookie = `user_role=${data.user_role};path=/;SameSite=Lax`
          return
        }

        forceLogoutAndRedirect()
      })
      .catch(() => {
        // If we can't validate session, do not assume user is logged in.
        forceLogoutAndRedirect()
      })

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
      case "ViewClients":
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
            <Topbar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              userRole={userRole}
              userId={userId}
              onNavigateToSection={setCurrentSection}
            />
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

      {/* Admin Chat - Floating Message Button */}
      <AdminChat userId={userId} />
    </div>
  )
}

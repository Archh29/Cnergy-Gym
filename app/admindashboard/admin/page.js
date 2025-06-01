"use client"

import { useState, useEffect } from "react"
import Sidebar from "./sidebar"
import Home from "./home"
import ViewMembers from "./viewmembers"
import ViewStaff from "./viewstaff"
import ViewCoach from "./viewcoach"
import Topbar from "./topbar"
import Announcement from "./announcement"
import SubscriptionPlans from "./subscriptionplan"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import AttendanceTracking from "./attendancetracking"
import MonitorSubscriptions from "./monitorsubscription"
import CoachAssignments from "./coachassignment"
import Exercises from "./exercises"
import FreePrograms from "./freeprograms"
import Sales from "./sales"


export default function AdminDashboard() {
  const [currentSection, setCurrentSection] = useState("Home")
  const [searchQuery, setSearchQuery] = useState("")
  const [userRole, setUserRole] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const role = sessionStorage.getItem("role") || "Admin"
    setUserRole(role)

    // Load dark mode state
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
      setDarkMode(true)
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const renderSection = () => {
    switch (currentSection) {
      case "Home":
        return <Home />
      case "ViewMembers":
        return <ViewMembers />
      case "ViewStaff":
        return <ViewStaff />
      case "ViewCoach":
        return <ViewCoach />
      case "SubscriptionPlans":
          return <SubscriptionPlans />
      case "Announcement":
        return <Announcement />
      case "AttendanceTracking":
        return <AttendanceTracking />
      case "MonitorSubscriptions":
        return <MonitorSubscriptions />
      case "Sales":
        return <Sales />
      case "CoachAssignments":
        return <CoachAssignments />
      case "Exercises":
        return <Exercises />
        case "FreePrograms":
          return <FreePrograms />
      default:
        return <Home />
    }
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900`}>
      <Sidebar activeSection={currentSection} setActiveSection={setCurrentSection} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ Top bar now supports dark mode */}
        <header className="flex items-center justify-between border-b bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300">
              <span>Dashboard</span>
              <span>{currentSection}</span>
            </div>
          </div>
          <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} userRole={userRole} />
        </header>
        <main className="flex-1 overflow-auto p-6">{renderSection()}</main>
      </div>
    </div>
  )
}

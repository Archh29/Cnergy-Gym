"use client"

import { useState, useEffect } from "react"
import Sidebar from "./sidebar"
import Home from "./home"
import Membership from "./membership"
import Messages from "./messages"
import Renewal from "./renewal"
import Announcement from "./announcement"
import AttendanceTracking from "./attendancetracking"
import MembershipDetails from "./membershipdetails"
import ViewMembers from "./viewmembers"
import MonitorSubscriptions from "./monitorsubscription"
import ViewCoach from "./viewcoach"
import Exercises from "./exercises"
import FreePrograms from "./freeprograms"
import CoachAssignments from "./coachassignments"
import Sales from "./sales"
import GuestManagement from "./guestmanagement"
import Topbar from "./topbar"

export default function StaffDashboardClient() {
  const [currentSection, setCurrentSection] = useState("Home")
  const [searchQuery, setSearchQuery] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userId, setUserId] = useState(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const role = sessionStorage.getItem("role") || "Staff"
    setUserRole(role)
    
    // Get user ID from session storage or API
    const storedUserId = sessionStorage.getItem("user_id")
    if (storedUserId) {
      setUserId(parseInt(storedUserId))
    } else {
      fetchUserInfo()
    }

    // Load dark mode state
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
      setDarkMode(true)
    }
  }, [])

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("https://api.cnergy.site/session.php", {
        credentials: "include"
      })
      const data = await response.json()
      if (data.user_id) {
        setUserId(data.user_id)
        sessionStorage.setItem("user_id", data.user_id)
      }
    } catch (error) {
      console.error("Error fetching user info:", error)
    }
  }

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (newDarkMode) {
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
      case "Membership":
        return <Membership />
      case "Messages":
        return <Messages />
      case "Renewal":
        return <Renewal />
      case "Announcement":
        return <Announcement userId={userId} />
      case "AttendanceTracking":
        return <AttendanceTracking userId={userId} />
      case "MembershipDetails":
        return <MembershipDetails userId={userId} />
      case "ViewMembers":
        return <ViewMembers userId={userId} />
      case "MonitorSubscriptions":
        return <MonitorSubscriptions userId={userId} />
      case "ViewCoach":
        return <ViewCoach userId={userId} />
      case "Exercises":
        return <Exercises userId={userId} />
      case "FreePrograms":
        return <FreePrograms userId={userId} />
      case "CoachAssignments":
        return <CoachAssignments userId={userId} />
      case "Sales":
        return <Sales userId={userId} />
      case "GuestManagement":
        return <GuestManagement userId={userId} />
      default:
        return <Home />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        currentSection={currentSection} 
        setCurrentSection={setCurrentSection}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar 
          currentSection={currentSection}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto">
          {renderSection()}
        </main>
      </div>
    </div>
  )
}

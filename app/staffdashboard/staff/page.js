"use client";

import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Home from "./home";
import Membership from "./membership";
import Messages from "./messages";
import Renewal from "./renewal";
import Announcement from "./announcement";
import AttendanceTracking from "./attendancetracking";
import MembershipDetails from "./membershipdetails";
import ViewMembers from "./viewmembers";
import MonitorSubscriptions from "./monitorsubscription";
import ViewCoach from "./viewcoach";
import Topbar from "./topbar";
import Exercises from "./exercises";
import FreePrograms from "./freeprograms";
import CoachAssignments from "./coachassignments";
import Sales from "./sales";
import GuestManagement from "./guestmanagement";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";


export default function StaffDashboard() {
  const [currentSection, setCurrentSection] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || "Staff";
    setUserRole(role);
    
    // Get user ID from session storage or API
    const storedUserId = sessionStorage.getItem("user_id");
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
    } else {
      // If no user ID in session, try to get it from API
      fetchUserInfo();
    }

    // Load dark mode state
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("https://api.cnergy.site/session.php", {
        credentials: "include"
      });
      const data = await response.json();
      if (data.user_id) {
        setUserId(data.user_id);
        sessionStorage.setItem("user_id", data.user_id);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      // No fallback - let it be null if not found
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case "Home":
        return <Home />;
      case "Membership":
        return <Membership />;
      case "Messages":
        return <Messages />;
      case "Renewal":
        return <Renewal />;
      case "Announcement":
        return <Announcement />;
      case "AttendanceTracking":
        return <AttendanceTracking />;
      case "MembershipDetails":
        return <MembershipDetails />;
        case "ViewMembers":
          return <ViewMembers userId={userId} />;
      case "MonitorSubscriptions":
          return <MonitorSubscriptions userId={userId} />;
      case "ViewCoach":
          return <ViewCoach />
      case "Exercises":
          return <Exercises />;
      case "FreePrograms":
          return <FreePrograms />;
      case "CoachAssignments":
          return <CoachAssignments />;
      case "Sales":
          return <Sales userId={userId} />;
      case "GuestManagement":
          return <GuestManagement />;
      default:
        return <Home />;
    }
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900`}>
      <Sidebar 
        activeSection={currentSection} 
        setActiveSection={setCurrentSection} 
        toggleDarkMode={toggleDarkMode} 
        darkMode={darkMode}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b bg-white dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-300">
              <span className="hidden sm:inline">Dashboard</span>
              <span className="font-medium">{currentSection}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Topbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} userRole={userRole} userId={userId} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-6">{renderSection()}</main>
      </div>
    </div>
  );
}
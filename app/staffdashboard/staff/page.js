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
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";


export default function StaffDashboard() {
  const [currentSection, setCurrentSection] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem("role") || "Staff";
    setUserRole(role);

    // Load dark mode state
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

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
          return <ViewMembers />;
      case "MonitorSubscriptions":
          return <MonitorSubscriptions />;
      case "ViewCoach":
          return <ViewCoach />
      case "Exercises":
          return <Exercises />;
      case "FreePrograms":
          return <FreePrograms />;
      case "CoachAssignments":
          return <CoachAssignments />;
      default:
        return <Home />;
    }
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900`}>
      <Sidebar activeSection={currentSection} setActiveSection={setCurrentSection} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      <div className="flex-1 flex flex-col overflow-hidden">
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
  );
}
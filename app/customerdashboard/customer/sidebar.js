"use client"

import { useRouter } from "next/navigation"
import { FaHome, FaUsers, FaSignOutAlt, FaIdCard, FaBullhorn, FaUserTie, FaUserPlus, FaMoon, FaSun } from "react-icons/fa"

import { Button } from "@/components/ui/button"

const Sidebar = ({ activeSection, setActiveSection, toggleDarkMode, darkMode }) => {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/logout")
    sessionStorage.clear()
    router.push("/login")
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  const sections = [
    { name: "Home", icon: <FaHome className="mr-2 h-4 w-4" /> },
   
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
          <h2 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dashboard</h2>
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
        {/* ✅ Dark Mode Toggle Now Works Across the Whole Dashboard */}
        <Button variant="outline" className="w-full justify-start mb-2" onClick={toggleDarkMode}>
          {darkMode ? <FaSun className="mr-2 h-4 w-4 text-yellow-500" /> : <FaMoon className="mr-2 h-4 w-4 text-gray-500" />}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </Button>
        {/* Logout Button */}
        <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
          <FaSignOutAlt className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar

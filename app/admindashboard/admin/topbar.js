"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import {
  Bell,
  Check,
  X,
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Users,
  CreditCard,
  ShoppingCart,
  Package,
  UserCheck,
  MessageSquare,
  Headphones,
  ArrowRight,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/adminnotification.php"

const Topbar = ({ searchQuery, setSearchQuery, userRole, userId = 6, onNavigateToSection }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [userData, setUserData] = useState({ firstName: 'Admin', role: 'Administrator' })
  const [supportTickets, setSupportTickets] = useState([])
  const [pendingTicketsCount, setPendingTicketsCount] = useState(0)

  const { toast } = useToast()

  useEffect(() => {
    if (userId) {
      fetchUserData()
      fetchNotifications()
      fetchSupportTickets()
      const interval = setInterval(() => {
        fetchNotifications()
        fetchSupportTickets()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const fetchSupportTickets = async () => {
    try {
      const response = await fetch("https://api.cnergy.site/support_requests.php?action=get_all_tickets")
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setSupportTickets(data)
          const pendingCount = data.filter(ticket => ticket.status === 'pending').length
          setPendingTicketsCount(pendingCount)
        }
      }
    } catch (error) {
      console.error("Error fetching support tickets:", error)
    }
  }

  const fetchUserData = async () => {
    try {
      const response = await fetch("https://api.cnergy.site/session.php", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      })

      // Try to parse response even if status is 401 (expected with third-party cookies)
      let data = null
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (e) {
        // Response might not be JSON or might be empty
        // This is okay - 401 is expected with third-party cookie restrictions
      }

      // If we got authenticated data, use it
      if (data && data.authenticated && data.user_id) {
        // Fetch user details from the database
        const userResponse = await fetch(`https://api.cnergy.site/get_user_info.php?user_id=${data.user_id}`, {
          credentials: "include"
        })

        if (userResponse.ok) {
          const userInfo = await userResponse.json()
          if (userInfo.success) {
            setUserData({
              firstName: userInfo.user.fname || 'Admin',
              role: userInfo.user.user_type_name || 'Administrator'
            })
          }
        }
      } else {
        // Not authenticated via session - this is expected with third-party cookies
        // Use userId from props/sessionStorage to fetch user info
        if (userId) {
          const userResponse = await fetch(`https://api.cnergy.site/get_user_info.php?user_id=${userId}`, {
            credentials: "include"
          })

          if (userResponse.ok) {
            const userInfo = await userResponse.json()
            if (userInfo.success) {
              setUserData({
                firstName: userInfo.user.fname || 'Admin',
                role: userInfo.user.user_type_name || 'Administrator'
              })
            }
          }
        }
      }
    } catch (error) {
      // Silently handle errors - 401 is expected with third-party cookie restrictions
      // Only log actual errors (not 401/network errors)
      if (error.name !== 'TypeError' && !error.message.includes('401') && !error.message.includes('Failed to fetch')) {
        console.error("Error fetching user data:", error)
      }
      // Keep default values on error
    }
  }

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}?user_id=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      // Get raw text first to handle malformed JSON
      const rawText = await response.text()

      // Clean the response text (remove trailing characters)
      const cleanedText = rawText.trim().replace(/[^}]*$/, '')

      let data
      try {
        data = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        console.error("Raw response:", rawText)
        // Fallback: try to extract JSON from the response
        const jsonMatch = rawText.match(/\{.*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("Invalid JSON response")
        }
      }

      if (data && data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      // Set empty state on error
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId, action: "mark_read" }),
      })

      const rawText = await response.text()
      const cleanedText = rawText.trim().replace(/[^}]*$/, '')

      let data
      try {
        data = JSON.parse(cleanedText)
      } catch (parseError) {
        const jsonMatch = rawText.match(/\{.*\}/)
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Invalid response" }
      }

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, status_name: "Read" } : notif))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        toast({ title: "Error", description: data.error || "Failed to mark notification as read", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({ title: "Error", description: "Failed to update notification", variant: "destructive" })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: "mark_all_read" }),
      })

      const rawText = await response.text()
      const cleanedText = rawText.trim().replace(/[^}]*$/, '')

      let data
      try {
        data = JSON.parse(cleanedText)
      } catch (parseError) {
        const jsonMatch = rawText.match(/\{.*\}/)
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Invalid response" }
      }

      if (response.ok) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, status_name: "Read" })))
        setUnreadCount(0)
        toast({ title: "Success", description: "All notifications marked as read" })
      } else {
        toast({ title: "Error", description: data.error || "Failed to mark all notifications as read", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({ title: "Error", description: "Failed to update notifications", variant: "destructive" })
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(API_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      })

      const rawText = await response.text()
      const cleanedText = rawText.trim().replace(/[^}]*$/, '')

      let data
      try {
        data = JSON.parse(cleanedText)
      } catch (parseError) {
        const jsonMatch = rawText.match(/\{.*\}/)
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Invalid response" }
      }

      if (response.ok) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId))
        const deletedNotif = notifications.find((n) => n.id === notificationId)
        if (deletedNotif?.status_name === "Unread") setUnreadCount((prev) => Math.max(0, prev - 1))
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete notification", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({ title: "Error", description: "Failed to delete notification", variant: "destructive" })
    }
  }

  const getNotificationIcon = (typeName, message) => {
    const iconClass = "h-4 w-4 flex-shrink-0"

    // Handle undefined/null values
    if (!message) message = ""
    if (!typeName) typeName = ""

    // Use neutral gray for all icons, subtle accent only for important types
    const defaultColor = "text-gray-600 dark:text-gray-400"

    // Support ticket notifications
    if (message.includes("support") || message.includes("ticket") || message.includes("request") || message.toLowerCase().includes("support ticket")) {
      return <Headphones className={`${iconClass} ${defaultColor}`} />
    }

    if (message.includes("registration") || message.includes("joined") || message.includes("new member")) {
      return <Users className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("Payment") || message.includes("paid") || message.includes("payment")) {
      return <CreditCard className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("Sale") || message.includes("sold") || message.includes("purchase")) {
      return <ShoppingCart className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("stock") || message.includes("Stock") || message.includes("inventory")) {
      return <Package className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("Staff") || message.includes("account") || message.includes("employee")) {
      return <UserCheck className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("Product") || message.includes("added") || message.includes("updated") || message.includes("merchandise")) {
      return <Package className={`${iconClass} ${defaultColor}`} />
    }
    if (message.includes("message") || message.includes("chat")) {
      return <MessageSquare className={`${iconClass} ${defaultColor}`} />
    }

    switch (typeName.toLowerCase()) {
      case "info": return <Info className={`${iconClass} ${defaultColor}`} />
      case "warning": return <AlertTriangle className={`${iconClass} text-amber-600 dark:text-amber-500`} />
      case "error": return <AlertCircle className={`${iconClass} text-red-600 dark:text-red-500`} />
      case "success": return <CheckCircle className={`${iconClass} text-green-600 dark:text-green-500`} />
      default: return <Bell className={`${iconClass} ${defaultColor}`} />
    }
  }

  const getNotificationBgColor = (typeName, isUnread, message) => {
    // Read notifications - subtle gray
    if (!isUnread) {
      return "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700"
    }

    // Unread notifications - subtle accent with left border
    return "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-l-2 border-gray-400 dark:border-gray-600 border-r border-t border-b border-gray-200 dark:border-gray-700"
  }

  const formatNotificationMessage = (message) => {
    if (!message) return "No message available"

    // Capitalize first letter
    const formatted = message.charAt(0).toUpperCase() + message.slice(1)

    // Truncate long messages
    if (formatted.length > 100) {
      return formatted.substring(0, 100) + "..."
    }

    return formatted
  }

  const handleNotificationClick = (notification) => {
    const message = notification.message || ""

    // If it's a support ticket notification, navigate to support requests
    if (message.includes("support") || message.includes("ticket") || message.includes("request") || message.toLowerCase().includes("support ticket")) {
      if (onNavigateToSection) {
        onNavigateToSection("SupportRequests")
      }
      setIsOpen(false)
      if (notification.status_name === "Unread") {
        markAsRead(notification.id)
      }
      return
    }

    // Mark as read when clicked
    if (notification.status_name === "Unread") {
      markAsRead(notification.id)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time"
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = (now - date) / 1000
    const diffInMinutes = diffInSeconds / 60
    const diffInHours = diffInMinutes / 60
    const diffInDays = diffInHours / 24

    if (diffInSeconds < 60) return "Just now"
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)} min ago`
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? 's' : ''} ago`
    if (diffInDays < 7) return `${Math.floor(diffInDays)} day${Math.floor(diffInDays) !== 1 ? 's' : ''} ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Combine notifications with support tickets
  const getAllNotifications = () => {
    const allNotifications = [...notifications]

    // Add support ticket notifications if there are pending tickets
    if (pendingTicketsCount > 0) {
      const ticketNotification = {
        id: `support-tickets-${pendingTicketsCount}`,
        type_name: "Info",
        message: `You have ${pendingTicketsCount} pending support ticket${pendingTicketsCount !== 1 ? 's' : ''} requiring attention`,
        status_name: "Unread",
        timestamp: supportTickets.length > 0 ? supportTickets[0].created_at : new Date().toISOString(),
        isSupportTicket: true
      }
      allNotifications.unshift(ticketNotification)
    }

    return allNotifications
  }

  const totalUnreadCount = unreadCount + (pendingTicketsCount > 0 ? 1 : 0)
  const allNotifications = getAllNotifications()

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 rounded-lg h-9 w-9"
          >
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            {totalUnreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[10px] p-0 font-semibold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-2 border-white dark:border-gray-900"
              >
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-[420px] max-h-[600px] p-0 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900"
        >
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-5 py-4 rounded-t-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <Bell className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900 dark:text-white tracking-tight">Notifications</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    {totalUnreadCount > 0
                      ? `${totalUnreadCount} new notification${totalUnreadCount !== 1 ? 's' : ''}`
                      : "All caught up!"}
                  </p>
                </div>
              </div>
              {totalUnreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs h-7 px-3 rounded-md transition-colors"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {pendingTicketsCount > 0 && (
              <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                  <Headphones className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                    {pendingTicketsCount} pending support ticket{pendingTicketsCount !== 1 ? 's' : ''}
                  </span>
                  {onNavigateToSection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onNavigateToSection("SupportRequests")
                        setIsOpen(false)
                      }}
                      className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-7 px-2.5 text-xs rounded-md"
                    >
                      View <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Bell className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold text-base mb-1">No notifications</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">You're all caught up! Check back later for updates.</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {allNotifications.map((notification) => {
                  const isUnread = notification.status_name === "Unread"
                  const isSupportTicket = notification.isSupportTicket || notification.message?.toLowerCase().includes("support") || notification.message?.toLowerCase().includes("ticket")

                  return (
                    <div
                      key={notification.id}
                      className={`${getNotificationBgColor(notification.type_name, isUnread, notification.message)} rounded-lg p-3.5 transition-all duration-200 cursor-pointer group`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                            {getNotificationIcon(notification.type_name, notification.message)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                {isSupportTicket ? 'Support Request' : (notification.type_name || 'Notification')}
                              </span>
                              {isUnread && (
                                <div className="w-1.5 h-1.5 bg-gray-900 dark:bg-gray-100 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed mb-2 font-normal">
                            {formatNotificationMessage(notification.message)}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {isSupportTicket && onNavigateToSection && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onNavigateToSection("SupportRequests")
                                  setIsOpen(false)
                                }}
                                className="h-6 px-2 text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                View <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isUnread && !isSupportTicket && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    markAsRead(notification.id)
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                                </Button>
                              )}
                              {!notification.isSupportTicket && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notification.id)
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                                  title="Delete notification"
                                >
                                  <X className="h-3.5 w-3.5 text-gray-500 dark:text-gray-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {allNotifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-b-xl">
              <Button
                variant="ghost"
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{userData.firstName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{userData.role}</p>
        </div>
        <div className="relative">
          <div className="w-9 h-9 bg-gray-800 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-semibold text-sm">{userData.firstName?.charAt(0) || "A"}</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

export default Topbar

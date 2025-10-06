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
} from "lucide-react"

const API_URL = "https://api.cnergy.site/adminnotification.php"

const Topbar = ({ searchQuery, setSearchQuery, userRole, userId = 6 }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

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
    const iconClass = "h-4 w-4"
    
    // Handle undefined/null values
    if (!message) message = ""
    if (!typeName) typeName = ""
    
    if (message.includes("registration") || message.includes("joined")) return <Users className={`${iconClass} text-blue-500`} />
    if (message.includes("Payment") || message.includes("paid")) return <CreditCard className={`${iconClass} text-green-500`} />
    if (message.includes("Sale") || message.includes("sold")) return <ShoppingCart className={`${iconClass} text-purple-500`} />
    if (message.includes("stock") || message.includes("Stock")) return <Package className={`${iconClass} text-orange-500`} />
    if (message.includes("Staff") || message.includes("account")) return <UserCheck className={`${iconClass} text-indigo-500`} />
    if (message.includes("Product") || message.includes("added") || message.includes("updated")) return <Package className={`${iconClass} text-green-500`} />

    switch (typeName.toLowerCase()) {
      case "info": return <Info className={`${iconClass} text-blue-500`} />
      case "warning": return <AlertTriangle className={`${iconClass} text-yellow-500`} />
      case "error": return <AlertCircle className={`${iconClass} text-red-500`} />
      case "success": return <CheckCircle className={`${iconClass} text-green-500`} />
      default: return <Bell className={`${iconClass} text-gray-500`} />
    }
  }

  const getNotificationBgColor = (typeName, isUnread) => {
    if (!isUnread) return "bg-white hover:bg-gray-50"
    
    // Handle undefined/null values
    if (!typeName) typeName = ""
    
    switch (typeName.toLowerCase()) {
      case "info": return "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400"
      case "warning": return "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400"
      case "error": return "bg-red-50 hover:bg-red-100 border-l-4 border-red-400"
      case "success": return "bg-green-50 hover:bg-green-100 border-l-4 border-green-400"
      default: return "bg-gray-50 hover:bg-gray-100 border-l-4 border-gray-400"
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now - date) / (1000 * 60)
    const diffInHours = diffInMinutes / 60
    const diffInDays = diffInHours / 24
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInDays < 7) return `${Math.floor(diffInDays)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-96 max-h-[500px] p-0 shadow-xl border-0 rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Admin Notifications</h3>
                <p className="text-blue-100 text-sm">{unreadCount > 0 ? `${unreadCount} unread messages` : "All caught up!"}</p>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-white hover:bg-white/20 text-xs">
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notification List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-500">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-gray-400 text-sm">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${getNotificationBgColor(notification.type_name, notification.status_name === "Unread")} rounded-lg p-3 transition-all duration-200 cursor-pointer hover:shadow-sm group border`}
                    onClick={() => { if (notification.status_name === "Unread") markAsRead(notification.id) }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type_name, notification.message)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {notification.type_name || 'Notification'}
                          </span>
                          {notification.status_name === "Unread" && (
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 leading-snug mb-2 line-clamp-2">
                          {notification.message || 'No message'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {notification.status_name === "Unread" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); markAsRead(notification.id) }}
                                className="h-6 w-6 p-0 hover:bg-green-100"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id) }}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                              title="Delete notification"
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t bg-gray-50 p-3 rounded-b-xl">
              <Button
                variant="ghost"
                className="w-full text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userRole}</p>
          <p className="text-xs text-gray-500">Online</p>
        </div>
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-semibold">{userRole?.charAt(0) || "U"}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

export default Topbar

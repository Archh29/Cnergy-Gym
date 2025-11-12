"use client"

import { useState, useEffect } from "react"
import { formatDateToISO, safeDate, formatDateOnlyPH } from "@/lib/dateUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Search,
  Plus,
  Edit,
  User,
  Mail,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Ban,
  CalendarDays,
  PowerOff,
  RotateCw,
} from "lucide-react"

const memberSchema = z.object({
  fname: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  mname: z.string().max(50, "Middle name must be less than 50 characters").optional(),
  lname: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  bday: z.string().min(1, "Date of birth is required"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to set
})

const editMemberSchema = z.object({
  fname: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  mname: z.string().max(50, "Middle name must be less than 50 characters").optional(),
  lname: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val)
    }, "Password must be at least 8 characters with 1 uppercase, 1 number, and 1 special character"),
  bday: z.string().min(1, "Date of birth is required").refine((val) => {
    if (!val || val === "" || val === "0000-00-00") return false
    const date = new Date(val)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900
  }, "Please enter a valid date of birth"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to edit
})

const ViewMembers = ({ userId }) => {
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [monthFilter, setMonthFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [currentView, setCurrentView] = useState("active") // "active" or "archive"

  // Custom date picker states
  const [customDate, setCustomDate] = useState(null)
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "CnergyGym#1",
      bday: "",
      user_type_id: 4,
    },
  })

  const editForm = useForm({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      bday: "",
      user_type_id: 4,
    },
  })

  // Gender mapping
  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
  ]

  // Account status options
  const statusOptions = [
    { value: "pending", label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "approved", label: "Approved", color: "bg-green-50 text-green-700 border-green-200" },
    { value: "rejected", label: "Rejected", color: "bg-red-50 text-red-700 border-red-200" },
    { value: "deactivated", label: "Deactivated", color: "bg-gray-50 text-gray-700 border-gray-200" },
  ]

  const validateEmail = async (email, excludeId = null) => {
    try {
      const response = await fetch("https://api.cnergy.site/member_management.php")
      const existingMembers = await response.json()
      const emailExists = existingMembers.some(
        (member) => member.email.toLowerCase() === email.toLowerCase() && (excludeId ? member.id !== excludeId : true),
      )
      return !emailExists
    } catch (error) {
      console.error("Error validating email:", error)
      return true // Allow if validation fails
    }
  }

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("https://api.cnergy.site/member_management.php")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setMembers(Array.isArray(data) ? data : [])
        setFilteredMembers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error fetching members:", error)
        toast({
          title: "Error",
          description: "Failed to fetch members. Please check your connection and try again.",
          variant: "destructive",
        })
        setMembers([])
        setFilteredMembers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchMembers()
  }, [toast])

  useEffect(() => {
    let filtered = members

    console.log("Filtering members - currentView:", currentView)
    console.log("All members before filtering:", members.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))

    // Filter by current view (active vs archive)
    if (currentView === "active") {
      filtered = filtered.filter((member) => member.account_status !== "deactivated")
      console.log("Active members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
    } else if (currentView === "archive") {
      filtered = filtered.filter((member) => member.account_status === "deactivated")
      console.log("Archived members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (member) =>
          `${member.fname} ${member.lname}`.toLowerCase().includes(lowercaseQuery) ||
          member.email?.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Filter by status (only apply if not using archive view)
    if (statusFilter !== "all" && currentView === "active") {
      filtered = filtered.filter((member) => member.account_status === statusFilter)
    }

    // Filter by custom date (takes priority over month/year filters)
    if (useCustomDate && customDate) {
      const customDateStr = format(customDate, "yyyy-MM-dd")
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberDateStr = format(createdDate, "yyyy-MM-dd")
        return memberDateStr === customDateStr
      })
    } else {
      // Filter by month/year (only if custom date is not used)
      if (monthFilter && monthFilter !== "all" && yearFilter && yearFilter !== "all") {
        filtered = filtered.filter((member) => {
          if (!member.created_at) return false
          const createdDate = safeDate(member.created_at)
          if (!createdDate) return false

          const memberMonth = createdDate.getMonth() + 1 // getMonth() returns 0-11
          const memberYear = createdDate.getFullYear()

          return memberMonth === parseInt(monthFilter) && memberYear === parseInt(yearFilter)
        })
      } else if (monthFilter && monthFilter !== "all") {
        // Filter by month only
        filtered = filtered.filter((member) => {
          if (!member.created_at) return false
          const createdDate = safeDate(member.created_at)
          if (!createdDate) return false

          const memberMonth = createdDate.getMonth() + 1
          return memberMonth === parseInt(monthFilter)
        })
      } else if (yearFilter && yearFilter !== "all") {
        // Filter by year only
        filtered = filtered.filter((member) => {
          if (!member.created_at) return false
          const createdDate = safeDate(member.created_at)
          if (!createdDate) return false

          const memberYear = createdDate.getFullYear()
          return memberYear === parseInt(yearFilter)
        })
      }
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (b.id || 0) - (a.id || 0) // Higher ID first (newest)
        case "oldest":
          return (a.id || 0) - (b.id || 0) // Lower ID first (oldest)
        case "name_asc":
          return `${a.fname} ${a.lname}`.localeCompare(`${b.fname} ${b.lname}`) // A-Z
        case "name_desc":
          return `${b.fname} ${b.lname}`.localeCompare(`${a.fname} ${a.lname}`) // Z-A
        case "email_asc":
          return (a.email || "").localeCompare(b.email || "") // A-Z
        case "email_desc":
          return (b.email || "").localeCompare(a.email || "") // Z-A
        default:
          return (b.id || 0) - (a.id || 0) // Default to newest
      }
    })

    setFilteredMembers(filtered)
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy, monthFilter, yearFilter, members, currentView, customDate, useCustomDate])

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getGenderName = (genderId) => {
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : "Unknown"
  }

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status)
    if (!statusOption) return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>

    return (
      <Badge className={`${statusOption.color} font-medium px-2.5 py-1 border`} variant="outline">
        {status === "pending" && <Clock className="w-3 h-3 mr-1.5" />}
        {status === "approved" && <CheckCircle className="w-3 h-3 mr-1.5" />}
        {status === "rejected" && <XCircle className="w-3 h-3 mr-1.5" />}
        {status === "deactivated" && <Ban className="w-3 h-3 mr-1.5" />}
        {statusOption.label}
      </Badge>
    )
  }

  const isNewMember = (member) => {
    if (!member.created_at) return false
    const createdDate = safeDate(member.created_at)
    if (!createdDate) return false

    // Get today's date at midnight (00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get creation date at midnight (00:00:00)
    const createdDateMidnight = new Date(createdDate)
    createdDateMidnight.setHours(0, 0, 0, 0)

    // Show "NEW" badge only if created on the same calendar day (disappears after midnight)
    return createdDateMidnight.getTime() === today.getTime()
  }

  const handleViewMember = (member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)

    // Handle invalid dates properly
    let safeBday = ""
    if (member.bday && member.bday !== "0000-00-00") {
      const date = safeDate(member.bday)
      if (date) {
        safeBday = formatDateToISO(date)
      }
    }

    editForm.reset({
      fname: member.fname || "",
      mname: member.mname || "",
      lname: member.lname || "",
      email: member.email || "",
      password: "",
      bday: safeBday,
      user_type_id: member.user_type_id || 4,
    })
    setIsEditDialogOpen(true)
  }


  const handleVerifyMember = (member) => {
    setSelectedMember(member)
    setIsVerificationDialogOpen(true)
  }

  const handleUpdateAccountStatus = async (status) => {
    if (!selectedMember) return
    setIsLoading(true)

    try {
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: status,
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        // Refresh the members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsVerificationDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: `Account ${status} successfully!`,
        })
      } else {
        throw new Error(result.message || "Failed to update account status")
      }
    } catch (error) {
      console.error("Error updating account status:", error)
      toast({
        title: "Error",
        description: "Failed to update account status. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleAddMember = async (data) => {
    setIsLoading(true)
    try {
      // Remove client-side email validation - let backend handle it
      console.log("Creating member with data:", data)

      // Always use the standard default password - staff cannot change it
      const password = "CnergyGym#1"

      const formattedData = {
        fname: data.fname.trim(),
        mname: data.mname && data.mname.trim() !== '' ? data.mname.trim() : '',
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        password: password, // Always use standard default password
        bday: data.bday,
        user_type_id: data.user_type_id,
        account_status: "approved", // Admin-added users are always approved
        failed_attempt: 0,
        staff_id: userId,
      }

      console.log("Sending request to backend with data:", formattedData)
      console.log("Password being sent:", formattedData.password)

      const response = await fetch("https://api.cnergy.site/member_management.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      const result = await response.json()
      console.log("Response result:", result)

      if (response.ok) {
        // Format user's full name before closing dialog
        const fullName = `${data.fname}${data.mname ? ` ${data.mname}` : ''} ${data.lname}`.trim()

        // Show success toast first with improved formatting
        toast({
          title: "User Successfully Added",
          description: `${fullName} has been added to the system. Email: ${data.email}. Account is approved and ready to use.`,
        })

        // Then update members list and close dialog
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setFilteredMembers(Array.isArray(updatedMembers) ? updatedMembers : [])

        form.reset({
          fname: "",
          mname: "",
          lname: "",
          email: "",
          password: "CnergyGym#1",
          bday: "",
          user_type_id: 4,
        })
        setIsAddDialogOpen(false)
      } else {
        // Prioritize the detailed message over the generic error
        throw new Error(result.message || result.error || "Failed to add user")
      }
    } catch (error) {
      console.error("Error adding user:", error)
      console.error("Error message:", error.message)
      console.error("Full error object:", error)

      // Check if it's an email-related error
      const errorMessage = error.message || "Failed to add user. Please try again."
      const isEmailError = errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("already exists")

      // Show error message in alert (simple approach)
      alert((isEmailError ? "Email Already Exists: " : "Error: ") + errorMessage)
    }
    setIsLoading(false)
  }

  const handleUpdateMember = async (data) => {
    console.log("handleUpdateMember called with data:", data)
    console.log("selectedMember:", selectedMember)

    if (!selectedMember) {
      console.error("No selected member")
      return
    }

    setIsLoading(true)
    try {
      if (data.email.toLowerCase() !== selectedMember.email.toLowerCase()) {
        const isEmailValid = await validateEmail(data.email, selectedMember.id)
        if (!isEmailValid) {
          toast({
            title: "Error",
            description: "Email address already exists. Please use a different email.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      const updateData = {
        id: selectedMember.id,
        fname: data.fname.trim(),
        mname: data.mname && data.mname.trim() !== '' ? data.mname.trim() : '',
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        bday: data.bday,
        user_type_id: data.user_type_id,
        staff_id: userId,
        // Not updating: gender_id, account_status (user settings only)
      }

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password
      }

      console.log("Sending update request with data:", updateData)

      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      console.log("Update response status:", response.status)
      const result = await response.json()
      console.log("Update response result:", result)

      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setFilteredMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setIsEditDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: "User updated successfully!",
        })
      } else {
        throw new Error(result.error || result.message || "Failed to update user")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleDeactivateMember = (member) => {
    setSelectedMember(member)
    setIsDeactivateDialogOpen(true)
  }

  const handleConfirmDeactivate = async () => {
    if (!selectedMember) return
    setIsLoading(true)
    try {
      const newStatus = selectedMember.account_status === "deactivated" ? "approved" : "deactivated"
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: newStatus,
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsDeactivateDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Success",
          description: `Account ${newStatus === "deactivated" ? "deactivated" : "reactivated"} successfully!`,
        })
      } else {
        throw new Error(result.message || `Failed to ${newStatus === "deactivated" ? "deactivate" : "reactivate"} account`)
      }
    } catch (error) {
      console.error("Error updating account status:", error)
      toast({
        title: "Error",
        description: `Failed to ${selectedMember.account_status === "deactivated" ? "reactivate" : "deactivate"} account. Please try again.`,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleOpenAddDialog = () => {
    form.reset({
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "CnergyGym#1",
      bday: "",
      user_type_id: 4,
    })
    // Ensure password is set in form
    form.setValue("password", "CnergyGym#1")
    setShowPassword(false)
    setIsAddDialogOpen(true)
  }

  // Ensure password is always set when dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      form.setValue("password", "CnergyGym#1", { shouldValidate: true, shouldDirty: true })
    }
  }, [isAddDialogOpen, form])

  return (
    <div className="space-y-6 pb-6">
      {/* Statistics Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-bold text-gray-800">
            <div className="p-2 bg-primary/10 rounded-lg mr-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            User Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("all")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Users className="h-4 w-4 text-blue-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-blue-700 mb-0.5">{filteredMembers.length}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-amber-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("pending")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Clock className="h-4 w-4 text-amber-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-amber-700 mb-0.5">
                    {filteredMembers.filter((m) => m.account_status === "pending").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("approved")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-100 to-green-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-green-700 mb-0.5">
                    {filteredMembers.filter((m) => m.account_status === "approved").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("rejected")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-100 to-red-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <XCircle className="h-4 w-4 text-red-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-red-700 mb-0.5">
                    {filteredMembers.filter((m) => m.account_status === "rejected").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-slate-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("deactivated")
                setCurrentView("archive")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <PowerOff className="h-4 w-4 text-slate-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-slate-700 mb-0.5">
                    {filteredMembers.filter((m) => m.account_status === "deactivated").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deactivated</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center text-xl font-bold text-gray-800 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                User Account Management
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 ml-11">
                Manage and verify user accounts
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                variant={currentView === "archive" ? "default" : "outline"}
                onClick={() => setCurrentView(currentView === "active" ? "archive" : "active")}
                className="h-10 px-4 font-medium"
              >
                {currentView === "active" ? "Archive" : "Active Users"}
              </Button>
              <Button
                onClick={handleOpenAddDialog}
                className="h-10 px-4 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="flex gap-3 flex-wrap items-center bg-gray-50/50 p-4 rounded-lg border border-gray-200/50">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users by name or email..."
                className="pl-10 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-36 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="1">January</SelectItem>
                <SelectItem value="2">February</SelectItem>
                <SelectItem value="3">March</SelectItem>
                <SelectItem value="4">April</SelectItem>
                <SelectItem value="5">May</SelectItem>
                <SelectItem value="6">June</SelectItem>
                <SelectItem value="7">July</SelectItem>
                <SelectItem value="8">August</SelectItem>
                <SelectItem value="9">September</SelectItem>
                <SelectItem value="10">October</SelectItem>
                <SelectItem value="11">November</SelectItem>
                <SelectItem value="12">December</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-28 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2021">2021</SelectItem>
                <SelectItem value="2020">2020</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={useCustomDate ? "default" : "outline"}
                  className={cn(
                    "w-[220px] justify-start text-left font-medium h-11 border-2 transition-all duration-200",
                    useCustomDate
                      ? "bg-primary hover:bg-primary/90 text-white border-primary shadow-md"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-primary/50"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(customDate, "MMM dd, yyyy") : "Pick specific date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-2xl border-gray-200" align="start">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={(date) => {
                    setCustomDate(date)
                    setUseCustomDate(!!date)
                    // Clear month/year filters when custom date is selected
                    if (date) {
                      setMonthFilter("")
                      setYearFilter("")
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {useCustomDate && customDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomDate(null)
                  setUseCustomDate(false)
                }}
                className="h-11 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200 font-medium"
              >
                ✕ Clear Date
              </Button>
            )}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="email_asc">Email A-Z</SelectItem>
                <SelectItem value="email_desc">Email Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">No accounts or user found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {currentView === "archive"
                  ? "No archived accounts or users found."
                  : "Try a different search or add a new user."}
              </p>
              {currentView !== "archive" && (
                <Button onClick={handleOpenAddDialog} variant="outline" className="mt-2">
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Name</h3>
              </div>
              {currentMembers.map((member, index) => {
                const initials = `${member.fname?.[0] || ''}${member.lname?.[0] || ''}`.toUpperCase()
                return (
                  <div
                    key={member.id || `member-${index}`}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  >
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
                      onClick={() => handleViewMember(member)}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20">
                          <span className="text-primary font-semibold text-sm">{initials}</span>
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-gray-900 truncate">
                              {member.fname} {member.mname} {member.lname}
                            </div>
                            {isNewMember(member) && (
                              <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold" variant="default">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.created_at && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CalendarDays className="h-3 w-3" />
                              <span>Created: {formatDateOnlyPH(member.created_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(member.account_status)}
                      <Badge variant="outline" className="border-gray-300 text-gray-700">
                        {getGenderName(member.gender_id)}
                      </Badge>
                      {member.account_status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyMember(member)}
                          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Verify Account"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditMember(member)}
                        className="h-9 w-9 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit Member"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.account_status !== "deactivated" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Deactivate Account"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivate Account"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && filteredMembers.length > membersPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700">
                Showing <span className="text-primary font-semibold">{indexOfFirstMember + 1}</span> to{" "}
                <span className="text-primary font-semibold">{Math.min(indexOfLastMember, filteredMembers.length)}</span> of{" "}
                <span className="text-primary font-semibold">{filteredMembers.length}</span> users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 border-gray-300 hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-md border border-gray-200">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 border-gray-300 hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Verification Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Account Verification
            </DialogTitle>
            <DialogDescription>Review and verify this member's account to allow mobile app access.</DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Gender:</span> {getGenderName(selectedMember.gender_id)}
                  </div>
                  <div>
                    <span className="font-medium">Birthday:</span>{" "}
                    {selectedMember.bday ? formatDateOnlyPH(selectedMember.bday) : "N/A"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Current Status:</span> {getStatusBadge(selectedMember.account_status)}
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Approving this account will allow the user to access the mobile application.
                  Rejecting will prevent access until manually approved.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsVerificationDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleUpdateAccountStatus("rejected")} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button onClick={() => handleUpdateAccountStatus("approved")} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Member Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p>
                    {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p>{selectedMember.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Gender</p>
                  <p>{getGenderName(selectedMember.gender_id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Date of Birth</p>
                  <p>{selectedMember.bday ? new Date(selectedMember.bday).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <div className="mt-1">{getStatusBadge(selectedMember.account_status)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedMember) handleEditMember(selectedMember)
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Add New User
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the basic details for the new user account.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMember)} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Middle Name (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Michael"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  // Ensure field value is always set to default password
                  const displayValue = field.value || "CnergyGym#1"

                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={displayValue}
                            readOnly
                            className="bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed h-11 pr-36 font-mono"
                            onFocus={(e) => e.target.blur()}
                            tabIndex={-1}
                            onChange={(e) => {
                              // Always reset to default password if user tries to change it
                              field.onChange("CnergyGym#1")
                            }}
                            onBlur={() => {
                              // Ensure value is always set on blur
                              field.onChange("CnergyGym#1")
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                              Auto-set
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault()
                                setShowPassword(!showPassword)
                              }}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                        <p className="text-xs text-blue-800 flex items-start gap-2">
                          <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Standard password is automatically set.</strong> The default password meets all security requirements.
                          </span>
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="bday"
                render={({ field }) => {
                  // Get today's date in YYYY-MM-DD format for max date restriction
                  const today = new Date().toISOString().split('T')[0]
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11"
                          max={today}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <User className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Edit User
            </DialogTitle>
            <DialogDescription className="text-base">
              Update the user's information and account details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateMember, (errors) => {
              console.log("Form validation errors:", errors)
              console.log("Form values:", editForm.getValues())
            })} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Middle Name (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      New Password (leave blank to keep current)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="********"
                          className="h-11 pr-12"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
                      <p className="text-xs text-gray-700">
                        <strong>Password Requirements:</strong> If changing password, it must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="bday"
                render={({ field }) => {
                  // Get today's date in YYYY-MM-DD format for max date restriction
                  const today = new Date().toISOString().split('T')[0]
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11" max={today} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    console.log("Update button clicked - manual submission")
                    console.log("Form is valid:", editForm.formState.isValid)
                    console.log("Form errors:", JSON.stringify(editForm.formState.errors, null, 2))
                    console.log("Form values:", JSON.stringify(editForm.getValues(), null, 2))

                    // Try manual form submission
                    const isValid = await editForm.trigger()
                    console.log("Form validation result:", isValid)

                    if (isValid) {
                      const formData = editForm.getValues()
                      console.log("Submitting form data:", formData)
                      await handleUpdateMember(formData)
                    } else {
                      console.log("Form validation failed, errors:", JSON.stringify(editForm.formState.errors, null, 2))
                      // Show user-friendly error message
                      toast({
                        title: "Validation Error",
                        description: "Please check all fields and try again. Check console for details.",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Edit className="mr-2 h-4 w-4" />
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Account Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMember?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="h-5 w-5 text-green-600" />
                  Reactivate Account
                </>
              ) : (
                <>
                  <PowerOff className="h-5 w-5 text-orange-600" />
                  Deactivate Account
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.account_status === "deactivated"
                ? "Are you sure you want to reactivate this account? The user will be able to access the system again."
                : "Are you sure you want to deactivate this account? The user will not be able to access the system until reactivated."}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {selectedMember.fname} {selectedMember.mname} {selectedMember.lname}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Status:</span>
                  </div>
                  <div>{getStatusBadge(selectedMember.account_status)}</div>
                  <div>
                    <span className="font-medium">Gender:</span> {getGenderName(selectedMember.gender_id)}
                  </div>
                </div>
              </div>
              <div className={cn(
                "p-4 rounded-md",
                selectedMember.account_status === "deactivated"
                  ? "bg-green-50 border border-green-200"
                  : "bg-orange-50 border border-orange-200"
              )}>
                <p className={cn(
                  "text-sm",
                  selectedMember.account_status === "deactivated"
                    ? "text-green-800"
                    : "text-orange-800"
                )}>
                  <strong>Note:</strong>{" "}
                  {selectedMember.account_status === "deactivated"
                    ? "Reactivating this account will restore access to the mobile application and all system features."
                    : "Deactivating this account will prevent the user from accessing the mobile application and system features. The account can be reactivated at any time."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeactivate}
              disabled={isLoading}
              className={cn(
                selectedMember?.account_status === "deactivated"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              )}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedMember?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reactivate
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewMembers

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
  RefreshCw,
  AlertTriangle,
  Tag,
  GraduationCap,
  UserCircle,
  X,
  UserPlus,
} from "lucide-react"

// Helper function to generate standard password from user's name
// Format: First2LettersOfFirstName(FirstCap) + First2LettersOfMiddleName(FirstCap, optional) + #2023 + First2LettersOfLastName(lowercase)
// Examples: "Rj Lo Ta" -> "RjLo#2023ta", "John Doe" (no middle name) -> "Jo#2023do"
const generateStandardPassword = (fname, mname, lname) => {
  // Get first 2 letters of first name: first letter uppercase, second lowercase
  const first = (fname || "").trim()
  const firstNamePart = first.length > 0 
    ? (first.substring(0, 1).toUpperCase() + (first.length > 1 ? first.substring(1, 2).toLowerCase() : ""))
    : ""
  
  // Get first 2 letters of middle name ONLY if it exists: first letter uppercase, second lowercase (optional)
  const middle = (mname && mname.trim() !== "") ? mname.trim() : ""
  const middleNamePart = middle.length > 0
    ? (middle.substring(0, 1).toUpperCase() + (middle.length > 1 ? middle.substring(1, 2).toLowerCase() : ""))
    : ""
  
  // Get first 2 letters of last name: all lowercase
  const last = (lname || "").trim()
  const lastNamePart = last.length > 0 
    ? last.substring(0, 2).toLowerCase()
    : ""
  
  // Combine: FirstName2(FirstCap) + MiddleName2(FirstCap, if exists) + #2023 + LastName2(lowercase)
  // If no middle name, middleNamePart will be empty string, so result will be: FirstName2#2023LastName2
  return `${firstNamePart}${middleNamePart}#2023${lastNamePart}`
}

const memberSchema = z.object({
  fname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  mname: z.string().max(50, "Maximum 50 characters").optional(),
  lname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  email: z.string().email("Invalid email format").max(255, "Maximum 255 characters"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include uppercase letter")
    .regex(/[0-9]/, "Must include number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must include special character"),
  bday: z.string().min(1, "Required"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to set
})

const editMemberSchema = z.object({
  fname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  mname: z.string().max(50, "Maximum 50 characters").optional(),
  lname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  email: z.string().email("Invalid email format").max(255, "Maximum 255 characters"),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val)
    }, "Must be 8+ characters with uppercase, number, and special character"),
  bday: z.string().min(1, "Required").refine((val) => {
    if (!val || val === "" || val === "0000-00-00") return false
    const date = new Date(val)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900
  }, "Invalid date format"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to edit
})

const ViewMembers = ({ userId }) => {
  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [discountFilter, setDiscountFilter] = useState("all") // "all", "student", "senior", "both"
  const [sortBy, setSortBy] = useState("newest")
  const [monthFilter, setMonthFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [currentView, setCurrentView] = useState("active") // "active" or "archive"
  const [userRole, setUserRole] = useState("admin") // Default to admin for admin dashboard

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
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorDialogData, setErrorDialogData] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5
  const { toast } = useToast()
  
  // Discount management states
  const [memberDiscounts, setMemberDiscounts] = useState({}) // { userId: [{ discount_type, is_active, ... }] }
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountDialogMember, setDiscountDialogMember] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)
  const [selectedDiscountType, setSelectedDiscountType] = useState(null) // For Add Client form

  const form = useForm({
    resolver: zodResolver(memberSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
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
    { value: "rejected", label: "Expired", color: "bg-red-50 text-red-700 border-red-200" },
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

  // Move fetchMembers outside useEffect so it can be called from the refresh button
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

  // Fetch discount eligibility for a member
  const fetchMemberDiscounts = async (memberId) => {
    try {
      const response = await fetch(`https://api.cnergy.site/user_discount.php?action=get&user_id=${memberId}`)
      if (!response.ok) throw new Error('Failed to fetch discounts')
      const result = await response.json()
      if (result.success) {
        setMemberDiscounts(prev => ({
          ...prev,
          [memberId]: result.data || []
        }))
      }
    } catch (error) {
      console.error('Error fetching member discounts:', error)
    }
  }

  // Fetch discounts for all members
  const fetchAllMemberDiscounts = async () => {
    const memberIds = members.map(m => m.id)
    for (const memberId of memberIds) {
      await fetchMemberDiscounts(memberId)
    }
  }

  // Get active discount for a member (not expired)
  const getActiveDiscount = (memberId) => {
    const discounts = memberDiscounts[memberId] || []
    if (discounts.length === 0) {
      return null
    }
    
    const now = new Date()
    
    const activeDiscount = discounts.find(d => {
      // Check if discount is active (handle both number and string formats)
      const isActive = d.is_active === 1 || d.is_active === true || d.is_active === '1'
      if (!isActive) {
        return false
      }
      
      // If expires_at is null, it's a senior discount (never expires)
      if (!d.expires_at || d.expires_at === null) {
        return true
      }
      
      // Check if expiration date is in the future
      const expiresAt = new Date(d.expires_at)
      return expiresAt >= now
    })
    
    return activeDiscount || null
  }

  // Open discount management dialog
  const handleManageDiscount = async (member) => {
    setDiscountDialogMember(member)
    setIsDiscountDialogOpen(true)
    await fetchMemberDiscounts(member.id)
  }

  // Add discount tag
  const handleAddDiscount = async (discountType, expiresAt = null, notes = null) => {
    if (!discountDialogMember) return
    
    setDiscountLoading(true)
    try {
      const response = await fetch('https://api.cnergy.site/user_discount.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: discountDialogMember.id,
          discount_type: discountType,
          verified_by: userId,
          expires_at: expiresAt,
          notes: notes
        })
      })
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: `Tagged ${discountDialogMember.fname} ${discountDialogMember.lname} as ${discountType === 'student' ? 'Student' : 'Senior (55+)'}`,
        })
        await fetchMemberDiscounts(discountDialogMember.id)
        await fetchAllMemberDiscounts() // Refresh all discounts
      } else {
        throw new Error(result.error || 'Failed to add discount')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add discount tag",
        variant: "destructive",
      })
    } finally {
      setDiscountLoading(false)
    }
  }

  // Remove discount tag
  const handleRemoveDiscount = async (discountId) => {
    if (!discountDialogMember) return
    
    setDiscountLoading(true)
    try {
      const response = await fetch('https://api.cnergy.site/user_discount.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discountId,
          user_id: discountDialogMember.id,
          verified_by: userId
        })
      })
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: "Discount tag removed successfully",
        })
        await fetchMemberDiscounts(discountDialogMember.id)
        await fetchAllMemberDiscounts() // Refresh all discounts
      } else {
        throw new Error(result.error || 'Failed to remove discount')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove discount tag",
        variant: "destructive",
      })
    } finally {
      setDiscountLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
    // Get user role from sessionStorage
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role') || 'admin'
      setUserRole(role)
    }
  }, [toast])

  // Fetch discounts when members are loaded
  useEffect(() => {
    if (members.length > 0) {
      fetchAllMemberDiscounts()
    }
  }, [members.length])

  // Also fetch discounts when members array changes (not just length)
  useEffect(() => {
    if (members.length > 0 && Object.keys(memberDiscounts).length === 0) {
      fetchAllMemberDiscounts()
    }
  }, [members])

  useEffect(() => {
    let filtered = members

    console.log("Filtering members - currentView:", currentView)
    console.log("All members before filtering:", members.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))

    // Filter by current view (active vs archive)
    if (currentView === "active") {
      // In active view, exclude deactivated accounts
      filtered = filtered.filter((member) => member.account_status !== "deactivated")
      
      // By default, exclude rejected accounts unless statusFilter is specifically set to "rejected"
      // This ensures only approved clients are shown in the active view by default
      if (statusFilter === "all" || statusFilter === "") {
        // When showing "all" status, only show approved clients (not rejected)
        filtered = filtered.filter((member) => member.account_status === "approved")
      } else if (statusFilter === "rejected") {
        // Only show rejected when explicitly filtered
        filtered = filtered.filter((member) => member.account_status === "rejected")
      } else if (statusFilter !== "all") {
        // For other status filters (pending, approved), show only that status
        filtered = filtered.filter((member) => member.account_status === statusFilter)
      }
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

    // Filter by discount type
    if (discountFilter !== "all") {
      filtered = filtered.filter((member) => {
        const activeDiscount = getActiveDiscount(member.id)
        if (!activeDiscount) {
          return false // No active discount, exclude
        }
        
        const discountType = activeDiscount.discount_type
        
        if (discountFilter === "student") {
          return discountType === "student"
        } else if (discountFilter === "senior") {
          return discountType === "senior"
        } else if (discountFilter === "both") {
          // "both" means user has either student or senior discount
          return discountType === "student" || discountType === "senior"
        }
        
        return false
      })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, discountFilter, sortBy, monthFilter, yearFilter, members, currentView, customDate, useCustomDate, memberDiscounts])

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getGenderName = (genderId) => {
    if (!genderId || genderId === null || genderId === undefined || genderId === '') {
      return null
    }
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : null
  }

  const formatName = (name) => {
    if (!name) return ""
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status)
    if (!statusOption) return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>

    return (
      <Badge className={`${statusOption.color} font-medium px-2.5 py-1 border`} variant="outline">
        {status === "pending" && <Clock className="w-3 h-3 mr-1.5" />}
        {status === "approved" && <CheckCircle className="w-3 h-3 mr-1.5" />}
        {status === "rejected" && <Clock className="w-3 h-3 mr-1.5" />}
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

  const handleViewMember = async (member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
    // Fetch discount data for this member
    await fetchMemberDiscounts(member.id)
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
        // Format client name before clearing selectedMember
        const clientName = selectedMember 
          ? formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
          : "Client"
        
        // Refresh the members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsVerificationDialogOpen(false)
        setSelectedMember(null)
        
        // Improved toast messages based on status
        if (status === "approved") {
          toast({
            title: "Account Approved",
            description: `${clientName}'s account has been approved and is now active. They can now access the web and mobile application.`,
            duration: 5000,
          })
        } else {
          toast({
            title: "Status Updated",
            description: `${clientName}'s account status has been updated to ${status}.`,
            duration: 5000,
          })
        }
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
    // Validate age before submitting
    if (data.bday) {
      const today = new Date()
      const birthDate = new Date(data.bday)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      
      // Calculate exact age
      let exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }
      
      if (exactAge < 13) {
        setShowAgeRestrictionModal(true)
        setIsLoading(false)
        return
      }
    }
    
    setIsLoading(true)
    try {
      // Remove client-side email validation - let backend handle it
      console.log("Creating member with data:", data)

      // Generate standard password from user's name
      const password = generateStandardPassword(data.fname, data.mname, data.lname)

      const formattedData = {
        fname: data.fname.trim(),
        mname: data.mname && data.mname.trim() !== '' ? data.mname.trim() : '',
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        password: password, // Always use standard default password
        bday: data.bday,
        user_type_id: data.user_type_id,
        account_status: "approved", // Admin-added clients are always approved
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

      if (!response.ok) {
        const result = await response.json()
        console.log("Error response result:", result)

        if (response.status === 409) {
          // Handle duplicate user/name error with proper modal
          setErrorDialogData({
            title: result.error || "Duplicate Entry Detected",
            message: result.message || "This user already exists in the system.",
            duplicateType: result.duplicate_type || "unknown",
            existingUser: result.existing_user || null
          })
          setIsErrorDialogOpen(true)
          setIsLoading(false)
          return
        }
        
        // Other errors
        setErrorDialogData({
          title: result.error || "Error",
          message: result.message || "Failed to add client. Please try again.",
          duplicateType: result.duplicate_type || "unknown",
          existingUser: result.existing_user || null
        })
        setIsErrorDialogOpen(true)
        setIsLoading(false)
        return
      }

      const result = await response.json()
      console.log("Response result:", result)

      if (response.ok) {
        // Format user's full name before closing dialog
        const fullName = `${data.fname}${data.mname ? ` ${data.mname}` : ''} ${data.lname}`.trim()

        // Get the newly created member ID from the response
        const newMemberId = result.member?.id || result.data?.id || null

        // Add discount tag if one was selected - use the member ID from response
        if (selectedDiscountType && newMemberId) {
          try {
            console.log("Adding discount tag for member ID:", newMemberId, "Type:", selectedDiscountType)
            console.log("Verified by (userId):", userId, "Type:", typeof userId)
            
            // Ensure userId is a number
            const verifiedById = userId ? Number(userId) : null
            if (!verifiedById || isNaN(verifiedById)) {
              throw new Error("Invalid admin/staff ID. Please refresh the page and try again.")
            }
            
            const discountResponse = await fetch('https://api.cnergy.site/user_discount.php?action=add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: newMemberId,
                discount_type: selectedDiscountType,
                verified_by: verifiedById,
                expires_at: null,
                notes: 'Applied during account creation'
              })
            })
            
            if (!discountResponse.ok) {
              const errorText = await discountResponse.text()
              console.error("Discount API error response:", errorText)
              throw new Error(`HTTP ${discountResponse.status}: ${errorText}`)
            }
            
            const discountResult = await discountResponse.json()
            console.log("Discount API response:", discountResult)
            
            if (discountResult.success) {
              // Show success toast with discount info
              toast({
                title: "Client Added Successfully",
                description: `${fullName} has been added and tagged as ${selectedDiscountType === 'student' ? 'Student' : 'Senior (55+)'} discount eligible.`,
                duration: 5000,
              })
            } else {
              throw new Error(discountResult.error || 'Failed to add discount tag')
            }
          } catch (discountError) {
            console.error("Error adding discount tag:", discountError)
            // Show success for account creation but warning for discount
            toast({
              title: "Client Added Successfully",
              description: `${fullName} has been added to the system. However, the discount tag could not be applied.`,
              duration: 5000,
            })
            toast({
              title: "Discount Tag Error",
              description: discountError.message || "Please add the discount tag manually from the member's profile.",
              variant: "destructive",
              duration: 6000,
            })
          }
        } else {
          // Show success toast without discount info
          toast({
            title: "Client Added Successfully",
            description: `${fullName} has been added to the system and can now access the mobile application.`,
            duration: 5000,
          })
        }

        // Then update members list and close dialog
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        const membersArray = Array.isArray(updatedMembers) ? updatedMembers : []
        setMembers(membersArray)
        setFilteredMembers(membersArray)
        
        // Refresh discounts after member list is updated
        if (selectedDiscountType && newMemberId) {
          await fetchAllMemberDiscounts()
        }

        form.reset({
          fname: "",
          mname: "",
          lname: "",
          email: "",
          password: "",
          bday: "",
          user_type_id: 4,
        })
        setSelectedDiscountType(null) // Reset discount selection
        setIsAddDialogOpen(false)
      } else {
        // Prioritize the detailed message over the generic error
        throw new Error(result.message || result.error || "Failed to add client")
      }
    } catch (error) {
      console.error("Error adding user:", error)
      console.error("Error message:", error.message)
      console.error("Full error object:", error)

      // Generic error fallback
      setErrorDialogData({
        title: "Error",
        message: error.message || "Failed to add client. Please try again.",
        duplicateType: "unknown",
        existingUser: null
      })
      setIsErrorDialogOpen(true)
    }
    setIsLoading(false)
  }

  const handleUpdateMember = async (data) => {
    console.log("handleUpdateMember called with data:", data)
    
    // Validate age before submitting
    if (data.bday) {
      const today = new Date()
      const birthDate = new Date(data.bday)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      
      // Calculate exact age
      let exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }
      
      if (exactAge < 13) {
        setShowAgeRestrictionModal(true)
        return
      }
    }
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
          description: "Client updated successfully!",
        })
      } else {
        throw new Error(result.error || result.message || "Failed to update client")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update client. Please try again.",
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

  const handleRestoreMember = (member) => {
    setSelectedMember(member)
    setIsRestoreDialogOpen(true)
  }

  const handleConfirmRestore = async () => {
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
          account_status: "approved",
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        // Format client name before clearing selectedMember
        const clientName = selectedMember 
          ? formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
          : "Client"
        
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsRestoreDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Account Restored",
          description: `${clientName}'s account has been restored and is now active. They can now access the web and mobile application.`,
          duration: 5000,
        })
      } else {
        throw new Error(result.message || "Failed to restore account")
      }
    } catch (error) {
      console.error("Error restoring member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to restore account. Please try again.",
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
      password: "",
      bday: "",
      user_type_id: 4,
    })
    setShowPassword(false)
    setIsAddDialogOpen(true)
  }

  // Generate and update password when form values change
  useEffect(() => {
    if (isAddDialogOpen) {
      const currentValues = form.getValues()
      if (currentValues.fname || currentValues.lname) {
        const generatedPassword = generateStandardPassword(
          currentValues.fname || "",
          currentValues.mname || "",
          currentValues.lname || ""
        )
        // Don't trigger validation when auto-updating password - only validate on submit
        form.setValue("password", generatedPassword, { shouldValidate: false, shouldDirty: false })
      }
    }
  }, [isAddDialogOpen, form.watch("fname"), form.watch("mname"), form.watch("lname")])

  return (
    <div className="space-y-6 pb-6">
      {/* Statistics Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-bold text-gray-800">
            <div className="p-2 bg-primary/10 rounded-lg mr-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Client Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("all")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gray-200 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">
                    {members.filter((m) => m.account_status === "approved").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("pending")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Clock className="h-4 w-4 text-orange-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-orange-600 mb-0.5">
                    {members.filter((m) => m.account_status === "pending").length}
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
                    {members.filter((m) => m.account_status === "approved").length}
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
                    {members.filter((m) => m.account_status === "rejected").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</p>
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
                    {members.filter((m) => m.account_status === "deactivated").length}
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
                Client Account Management
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 ml-11">
                Manage and verify client accounts
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={fetchMembers}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentView(currentView === "active" ? "archive" : "active")}
                className={`h-10 px-4 font-medium transition-all ${
                  currentView === "active" 
                    ? "bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 shadow-sm" 
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {currentView === "active" ? "Active" : "Deactivated"}
              </Button>
              <Button
                onClick={handleOpenAddDialog}
                className="h-10 px-4 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Client
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
                placeholder="Search clients by name or email..."
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
                <SelectItem value="rejected">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={discountFilter} onValueChange={setDiscountFilter}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Filter by discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Discounts</SelectItem>
                <SelectItem value="student">🎓 Student Discount</SelectItem>
                <SelectItem value="senior">👤 Senior (55+) Discount</SelectItem>
                <SelectItem value="both">Both Discounts</SelectItem>
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
              <p className="text-sm text-muted-foreground">Loading clients...</p>
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {currentView === "archive"
                  ? "No deactivated clients found"
                  : statusFilter === "pending"
                  ? "No pending client requests"
                  : statusFilter === "approved"
                  ? "No approved clients found"
                  : statusFilter === "rejected"
                  ? "No rejected clients found"
                  : statusFilter === "all"
                  ? "No clients found"
                  : "No clients found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentView === "archive"
                  ? "There are no deactivated client accounts in the system."
                  : statusFilter === "pending"
                  ? "All client verification requests have been processed. New requests will appear here when clients register."
                  : statusFilter === "approved"
                  ? searchQuery.trim() !== ""
                  ? "No approved clients match your search. Try a different search term."
                  : "There are no approved clients in the system."
                  : statusFilter === "rejected"
                  ? searchQuery.trim() !== ""
                  ? "No expired clients match your search. Try a different search term."
                  : "There are no expired client requests in the system."
                  : statusFilter === "all"
                  ? searchQuery.trim() !== ""
                  ? "No clients match your search. Try a different search term or filter."
                  : "There are no clients in the system."
                  : searchQuery.trim() !== ""
                  ? "No clients match your search. Try a different search term."
                  : "There are no clients in the system."}
              </p>
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="font-semibold text-gray-900 truncate">
                              {member.fname} {member.mname} {member.lname}
                            </div>
                            {isNewMember(member) && (
                              <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold" variant="default">
                                NEW
                              </Badge>
                            )}
                            {(() => {
                              const activeDiscount = getActiveDiscount(member.id)
                              if (activeDiscount) {
                                return (
                                  <Badge 
                                    className={`text-xs px-2 py-1 font-semibold border ${
                                      activeDiscount.discount_type === 'student' 
                                        ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                        : 'bg-purple-100 text-purple-700 border-purple-300'
                                    }`}
                                    variant="outline"
                                  >
                                    {activeDiscount.discount_type === 'student' ? (
                                      <>
                                        <GraduationCap className="h-3 w-3 mr-1 inline" />
                                        Student
                                      </>
                                    ) : (
                                      <>
                                        <UserCircle className="h-3 w-3 mr-1 inline" />
                                        55+
                                      </>
                                    )}
                                  </Badge>
                                )
                              }
                              return null
                            })()}
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
                      {/* Only show Edit button for approved accounts in the Approved tab */}
                      {member.account_status === "approved" && statusFilter === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit Client"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Restore button for expired (rejected) accounts in the Expired tab */}
                      {member.account_status === "rejected" && statusFilter === "rejected" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestoreMember(member)}
                          className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restore Account"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Deactivate button only for approved accounts */}
                      {member.account_status === "approved" && statusFilter === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Deactivate Account"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Reactivate button for deactivated accounts */}
                      {member.account_status === "deactivated" && (
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
                      {/* Show Discount Management button for approved accounts */}
                      {member.account_status === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageDiscount(member)}
                          className="h-9 w-9 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage Discount Tags"
                        >
                          <Tag className="h-4 w-4" />
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
                <span className="text-primary font-semibold">{filteredMembers.length}</span> clients
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

      {/* Account Creation Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mr-3">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              Account Creation
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Review the account details before creating this member's account.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Member Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {getGenderName(selectedMember.gender_id) && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</span>
                      <p className="text-sm font-medium text-gray-900">{getGenderName(selectedMember.gender_id)}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Birthday</span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMember.bday ? formatDateOnlyPH(selectedMember.bday) : "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedMember.account_status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsVerificationDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleUpdateAccountStatus("approved")} 
              disabled={isLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-3">
                <User className="h-5 w-5 text-primary" />
              </div>
              Client Details
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              View comprehensive information about this client's account.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {getGenderName(selectedMember.gender_id) && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</span>
                      <p className="text-sm font-medium text-gray-900">{getGenderName(selectedMember.gender_id)}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMember.bday ? formatDateOnlyPH(selectedMember.bday) : "Not provided"}
                    </p>
                  </div>
                  {selectedMember.created_at && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Created</span>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateOnlyPH(selectedMember.created_at)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedMember.account_status)}
                    </div>
                  </div>
                  {/* Discount Duration */}
                  {(() => {
                    const activeDiscount = getActiveDiscount(selectedMember.id)
                    if (activeDiscount) {
                      const discountType = activeDiscount.discount_type
                      const expiresAt = activeDiscount.expires_at
                      
                      return (
                        <div className="col-span-2 space-y-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount Duration</span>
                          <div className="mt-1 flex items-center gap-2">
                            {discountType === 'student' ? (
                              <Badge className="bg-blue-100 text-blue-700 border border-blue-300 px-3 py-1">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Student Discount
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-700 border border-purple-300 px-3 py-1">
                                <UserCircle className="h-3 w-3 mr-1" />
                                Senior (55+) Discount
                              </Badge>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {expiresAt 
                                ? `Expires: ${formatDateOnlyPH(expiresAt)}`
                                : 'Permanent (Never expires)'
                              }
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedMember) handleEditMember(selectedMember)
              }}
              disabled={!selectedMember || selectedMember.account_status !== "approved"}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Client
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
              Add New Client
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the basic details for the new client account.
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
                  // Generate password from form values
                  const formValues = form.watch()
                  const displayValue = field.value || generateStandardPassword(
                    formValues.fname || "",
                    formValues.mname || "",
                    formValues.lname || ""
                  )

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
                              // Always reset to generated password if user tries to change it
                              const generatedPwd = generateStandardPassword(
                                formValues.fname || "",
                                formValues.mname || "",
                                formValues.lname || ""
                              )
                              field.onChange(generatedPwd)
                            }}
                            onBlur={() => {
                              // Ensure value is always set on blur
                              const generatedPwd = generateStandardPassword(
                                formValues.fname || "",
                                formValues.mname || "",
                                formValues.lname || ""
                              )
                              field.onChange(generatedPwd)
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
                  // Calculate maximum date for minimum age of 13 years
                  const today = new Date()
                  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
                  const maxDateStr = maxDate.toISOString().split('T')[0]
                  
                  const handleDateChange = (e) => {
                    const selectedDate = e.target.value
                    if (selectedDate) {
                      const birthDate = new Date(selectedDate)
                      const age = today.getFullYear() - birthDate.getFullYear()
                      const monthDiff = today.getMonth() - birthDate.getMonth()
                      const dayDiff = today.getDate() - birthDate.getDate()
                      
                      // Calculate exact age
                      let exactAge = age
                      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        exactAge--
                      }
                      
                      if (exactAge < 13) {
                        setShowAgeRestrictionModal(true)
                        // Reset the field to empty
                        field.onChange("")
                        return
                      }
                    }
                    field.onChange(selectedDate)
                  }
                  
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
                          max={maxDateStr}
                          value={field.value}
                          onChange={handleDateChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              
              {/* Discount Tag Selection */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-base">Discount Eligibility</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Verify the client's ID and select a discount tag if they are eligible. This can be done during account creation.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDiscountType(selectedDiscountType === 'student' ? null : 'student')}
                    className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      selectedDiscountType === 'student'
                        ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 shadow-md'
                        : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <GraduationCap className={`h-6 w-6 ${selectedDiscountType === 'student' ? 'text-blue-700' : 'text-blue-600'}`} />
                    <span className={`font-semibold ${selectedDiscountType === 'student' ? 'text-blue-800' : 'text-blue-700'}`}>Student</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedDiscountType(selectedDiscountType === 'senior' ? null : 'senior')}
                    className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      selectedDiscountType === 'senior'
                        ? 'border-purple-400 bg-purple-50 hover:bg-purple-100 shadow-md'
                        : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <UserCircle className={`h-6 w-6 ${selectedDiscountType === 'senior' ? 'text-purple-700' : 'text-purple-600'}`} />
                    <span className={`font-semibold ${selectedDiscountType === 'senior' ? 'text-purple-800' : 'text-purple-700'}`}>55+</span>
                  </Button>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong className="font-semibold">Important:</strong> Only tag members after verifying their ID and eligibility. ID verification must be done outside the system before applying discount tags.
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setSelectedDiscountType(null)
                  }}
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
                  Add
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Edit Client
            </DialogTitle>
            <DialogDescription className="text-base">
              Update the client's information and account details.
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
                  // Calculate maximum date for minimum age of 13 years
                  const today = new Date()
                  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
                  const maxDateStr = maxDate.toISOString().split('T')[0]
                  
                  const handleDateChange = (e) => {
                    const selectedDate = e.target.value
                    if (selectedDate) {
                      const birthDate = new Date(selectedDate)
                      const age = today.getFullYear() - birthDate.getFullYear()
                      const monthDiff = today.getMonth() - birthDate.getMonth()
                      const dayDiff = today.getDate() - birthDate.getDate()
                      
                      // Calculate exact age
                      let exactAge = age
                      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        exactAge--
                      }
                      
                      if (exactAge < 13) {
                        setShowAgeRestrictionModal(true)
                        // Reset the field to its previous value
                        field.onChange(field.value)
                        return
                      }
                    }
                    field.onChange(selectedDate)
                  }
                  
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
                          max={maxDateStr}
                          value={field.value}
                          onChange={handleDateChange}
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
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Account Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              {selectedMember?.account_status === "deactivated" ? (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mr-3">
                    <RotateCw className="h-5 w-5 text-green-600" />
                  </div>
                  Reactivate Account
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mr-3">
                    <PowerOff className="h-5 w-5 text-orange-600" />
                  </div>
                  Deactivate Account
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {selectedMember?.account_status === "deactivated"
                ? "Restore access to this client's account and allow them to use the system again."
                : "Temporarily disable this client's account access. They will not be able to use the system until you reactivate the account."}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</span>
                    <div>{getStatusBadge(selectedMember.account_status)}</div>
                  </div>
                </div>
              </div>
              
              {/* Warning/Info Note */}
              <div className={cn(
                "border-l-4 rounded-r-lg p-4",
                selectedMember.account_status === "deactivated"
                  ? "bg-green-50 border-green-400"
                  : "bg-orange-50 border-orange-400"
              )}>
                <p className={cn(
                  "text-sm leading-relaxed",
                  selectedMember.account_status === "deactivated"
                    ? "text-green-900"
                    : "text-orange-900"
                )}>
                  <strong className="font-semibold">Important:</strong>{" "}
                  {selectedMember.account_status === "deactivated"
                    ? "Reactivating this account will restore full access to the mobile application and all system features. The client will be able to log in and use all services immediately."
                    : "Deactivating this account will immediately prevent the client from accessing the mobile application and all system features. The client will not be able to log in or use any services. You can reactivate this account at any time from the client list."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsDeactivateDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeactivate}
              disabled={isLoading}
              className={cn(
                "shadow-md hover:shadow-lg transition-all duration-200 px-6 text-white",
                selectedMember?.account_status === "deactivated"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : selectedMember?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reactivate Account
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Account Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mr-3">
                <RotateCw className="h-5 w-5 text-green-600" />
              </div>
              Restore Account
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Restore this expired client account and grant immediate access to the web and mobile application.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</span>
                    <div>{getStatusBadge(selectedMember.account_status)}</div>
                  </div>
                </div>
              </div>
              
              {/* Info Note */}
              <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4">
                <p className="text-sm text-green-900 leading-relaxed">
                  <strong className="font-semibold">Account Recovery:</strong>{" "}
                  Restoring this account will immediately approve the client and grant access to the web and mobile application. 
                  The client will be able to log in and use the system. This action is typically used when a client 
                  requests account recovery after their pending request has expired.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsRestoreDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restore Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog for Duplicate User/Name */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="sm:max-w-2xl" hideClose={true}>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  {errorDialogData?.title || "Duplicate Name Combination"}
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  Cannot Create Client Account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-l-4 border-red-500 rounded-r-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Why This Error Occurred
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {errorDialogData?.message || "A client with this information already exists in the system. Please use a different name combination or email address to create a new account."}
              </p>
            </div>
            
            {errorDialogData?.existingUser && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-600" />
                  Existing Client Information
                </h4>
                <div className="space-y-2.5 text-sm text-slate-700 bg-white rounded-md p-4 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Name:</span>
                    <span className="text-slate-700">
                      {errorDialogData.existingUser.fname} {errorDialogData.existingUser.mname || ""} {errorDialogData.existingUser.lname}
                    </span>
                  </div>
                  {errorDialogData.existingUser.email && (
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-slate-900 min-w-[60px]">Email:</span>
                      <span className="text-slate-700 break-all">{errorDialogData.existingUser.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                What You Can Do
              </p>
              <ul className="space-y-2 text-sm text-slate-700 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1.5">•</span>
                  <span>Use a different first name or last name combination</span>
                </li>
                {errorDialogData?.duplicateType === 'email' && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1.5">•</span>
                    <span>Use a different email address if creating a new account</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1.5">•</span>
                  <span>Verify if this is the same person and update their existing account instead</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button 
              onClick={() => setIsErrorDialogOpen(false)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Age Restriction Modal */}
      <Dialog open={showAgeRestrictionModal} onOpenChange={setShowAgeRestrictionModal}>
        <DialogContent className="sm:max-w-lg" hideClose={true}>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-200">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  Age Requirement Not Met
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  We cannot create this client account at this time.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/50 border-l-4 border-orange-500 rounded-r-lg p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Minimum Age Requirement
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Clients must be at least <span className="font-bold text-orange-600 text-base">13 years old</span> to create an account in our system.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Why is this required?
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Safety and liability protection for all clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Compliance with platform usage policies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Insurance and legal requirements</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                Please select a different date of birth that meets our minimum age requirement to continue with account creation.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              onClick={() => setShowAgeRestrictionModal(false)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Management Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mr-3">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              Manage Discount Tags
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Tag this member for discounted pricing. ID verification is done outside the system.
            </DialogDescription>
          </DialogHeader>
          {discountDialogMember && (
            <div className="space-y-5 py-4">
              {/* Member Information */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {discountDialogMember.fname} {discountDialogMember.mname || ''} {discountDialogMember.lname}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {discountDialogMember.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Discount Tags */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Current Discount Tags</h3>
                {(() => {
                  const activeDiscount = getActiveDiscount(discountDialogMember.id)
                  
                  if (!activeDiscount) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">No active discount tags</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          activeDiscount.discount_type === 'student'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {activeDiscount.discount_type === 'student' ? (
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                          ) : (
                            <UserCircle className="h-5 w-5 text-purple-600" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {activeDiscount.discount_type === 'student' ? 'Student Discount' : 'Senior (55+) Discount'}
                            </p>
                            {activeDiscount.verified_at && (
                              <p className="text-xs text-gray-600">
                                Verified: {formatDateOnlyPH(activeDiscount.verified_at)}
                              </p>
                            )}
                            {activeDiscount.expires_at ? (
                              <p className="text-xs text-gray-600">
                                Expires: {formatDateOnlyPH(activeDiscount.expires_at)}
                              </p>
                            ) : (
                              <p className="text-xs text-green-600 font-medium">
                                Permanent (Never expires)
                              </p>
                            )}
                          </div>
                        </div>
                        {userRole === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDiscount(activeDiscount.id)}
                            disabled={discountLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {userRole === 'staff' && (
                          <div className="text-xs text-gray-500 italic px-2">
                            Only admins can remove
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Add Discount Tags */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-gray-900">Add Discount Tag</h3>
                {(() => {
                  const activeDiscount = getActiveDiscount(discountDialogMember.id)
                  const hasActiveDiscount = !!activeDiscount
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleAddDiscount('student')}
                          disabled={discountLoading || hasActiveDiscount}
                          className={`h-auto py-4 flex flex-col items-center gap-2 border-2 ${
                            hasActiveDiscount
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          <GraduationCap className={`h-6 w-6 ${hasActiveDiscount ? 'text-gray-400' : 'text-blue-600'}`} />
                          <span className={`font-semibold ${hasActiveDiscount ? 'text-gray-500' : 'text-blue-700'}`}>Student</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAddDiscount('senior')}
                          disabled={discountLoading || hasActiveDiscount}
                          className={`h-auto py-4 flex flex-col items-center gap-2 border-2 ${
                            hasActiveDiscount
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                          }`}
                        >
                          <UserCircle className={`h-6 w-6 ${hasActiveDiscount ? 'text-gray-400' : 'text-purple-600'}`} />
                          <span className={`font-semibold ${hasActiveDiscount ? 'text-gray-500' : 'text-purple-700'}`}>55+</span>
                        </Button>
                      </div>
                      {hasActiveDiscount && (
                        <p className="text-xs text-orange-600 text-center font-medium">
                          Remove the current discount tag before adding a new one. Members can only have one active discount at a time.
                        </p>
                      )}
                    </>
                  )
                })()}
                <p className="text-xs text-gray-500 text-center">
                  Note: ID verification is done outside the system. Only tag members after verifying their eligibility.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDiscountDialogOpen(false)}
              disabled={discountLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewMembers

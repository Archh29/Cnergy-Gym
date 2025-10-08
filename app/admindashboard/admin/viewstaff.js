"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://api.cnergy.site/addstaff.php"

const validatePassword = (password) => {
  const errors = []
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }
  return errors
}

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const ViewStaff = () => {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [userInfoOpen, setUserInfoOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    user_type_id: 2, // Always Staff
    gender_id: 1,
    fname: "",
    mname: "",
    lname: "",
    bday: "",
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  useEffect(() => {
    fetchStaffData()
  }, [])

  const fetchStaffData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}`)
      setStaffList(response.data.staff || [])
    } catch (error) {
      console.error("Error fetching staff data:", error)
      toast({
        title: "Error",
        description: "Failed to load staff data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (data, isEdit = false) => {
    const errors = {}

    // Name validations
    if (!data.fname.trim()) errors.fname = "First name is required"
    if (!data.lname.trim()) errors.lname = "Last name is required"

    // Email validation
    if (!data.email.trim()) {
      errors.email = "Email is required"
    } else if (!validateEmail(data.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Password validation (only for new staff or when password is provided in edit)
    if (!isEdit || (isEdit && data.password && data.password.trim())) {
      if (!data.password || !data.password.trim()) {
        errors.password = "Password is required"
      } else {
        const passwordErrors = validatePassword(data.password)
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors[0]
        }
      }
    }

    // Date validation
    if (!data.bday) errors.bday = "Date of birth is required"

    return errors
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUserClick = (staff) => {
    setSelectedStaff(staff)
    setUserInfoOpen(true)
  }

  const handleEditClick = (staff) => {
    setSelectedStaff(staff)
    setFormData({
      id: staff.id,
      email: staff.email,
      password: "", // Clear password field for editing
      user_type_id: 2, // Always Staff
      gender_id: staff.gender === "Male" ? 1 : 2,
      fname: staff.fname,
      mname: staff.mname || "",
      lname: staff.lname,
      bday: staff.bday,
    })
    setValidationErrors({}) // Clear validation errors
    setEditOpen(true)
  }

  const handleDeleteClick = (staffId) => {
    setStaffToDelete(staffId)
    setDeleteConfirmOpen(true)
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const response = await axios.post(`${API_BASE_URL}`, formData)

      toast({
        title: "Success",
        description: "Staff member added successfully",
      })
      setOpen(false)
      resetForm()
      fetchStaffData()
    } catch (error) {
      console.error("Error adding staff:", error)
      console.error("Error response data:", error.response?.data)
      console.error("Error response status:", error.response?.status)
      
      // Check if it's an email-related error (case insensitive)
      const errorText = (error.response?.data?.error || "").toLowerCase()
      if (errorText.includes("email") || errorText.includes("already exists")) {
        // Show the detailed error message from backend
        const errorMessage = error.response?.data?.message || error.response?.data?.error || "Email address already exists"
        setValidationErrors({ email: errorMessage })
        toast({
          title: "Email Already Exists",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        // Try to get the error message from different possible locations
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           "Failed to add staff member"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStaff = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData, true)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)

    try {
      const response = await axios.put(`${API_BASE_URL}`, formData)

      toast({
        title: "Success",
        description: "Staff member updated successfully",
      })
      setEditOpen(false)
      resetForm()
      fetchStaffData()
    } catch (error) {
      console.error("Error updating staff:", error)
      if (error.response?.data?.error?.includes("email")) {
        // Show the detailed error message from backend
        const errorMessage = error.response?.data?.message || "Email address already exists"
        setValidationErrors({ email: errorMessage })
        toast({
          title: "Email Already Exists",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.response?.data?.error || "Failed to update staff member",
          variant: "destructive",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return

    setSubmitting(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}`, {
        data: { id: staffToDelete },
      })

      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      })
      setDeleteConfirmOpen(false)
      fetchStaffData()
    } catch (error) {
      console.error("Error deleting staff:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      user_type_id: 2, // Always Staff
      gender_id: 1,
      fname: "",
      mname: "",
      lname: "",
      bday: "",
    })
    setValidationErrors({}) // Clear validation errors
  }

  const filteredStaff = staffList.filter((staff) => {
    const fullName = `${staff.fname} ${staff.mname || ""} ${staff.lname}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Staff List</CardTitle>
            <CardDescription>Manage your gym staff</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Staff</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStaff}>
                <Card className="border-0 shadow-none">
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lname">Last name</Label>
                        <Input
                          id="lname"
                          name="lname"
                          value={formData.lname}
                          onChange={handleInputChange}
                          required
                          className={validationErrors.lname ? "border-red-500" : ""}
                        />
                        {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fname">First name</Label>
                        <Input
                          id="fname"
                          name="fname"
                          value={formData.fname}
                          onChange={handleInputChange}
                          required
                          className={validationErrors.fname ? "border-red-500" : ""}
                        />
                        {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mname">Middle name</Label>
                        <Input id="mname" name="mname" value={formData.mname || ""} onChange={handleInputChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className={validationErrors.email ? "border-red-500" : ""}
                        />
                        {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password || ""}
                            onChange={handleInputChange}
                            required
                            className={validationErrors.password ? "border-red-500 pr-10" : "pr-10"}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {validationErrors.password && (
                          <p className="text-sm text-red-500">{validationErrors.password}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Password must be 8+ characters with uppercase, number, and special character
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bday">Date of Birth</Label>
                      <Input
                        type="date"
                        id="bday"
                        name="bday"
                        value={formData.bday}
                        onChange={handleInputChange}
                        required
                        className={validationErrors.bday ? "border-red-500" : ""}
                      />
                      {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <RadioGroup
                        value={formData.gender_id.toString()}
                        onValueChange={(value) => handleSelectChange("gender_id", value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="male" />
                          <Label htmlFor="male">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="2" id="female" />
                          <Label htmlFor="female">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                      </Button>
                    </DialogFooter>
                  </CardContent>
                </Card>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search staff..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading staff data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <button className="hover:underline text-left font-medium" onClick={() => handleUserClick(staff)}>
                      {`${staff.fname} ${staff.mname ? staff.mname + " " : ""}${staff.lname}`}
                    </button>
                  </TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleEditClick(staff)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(staff.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* User Info Modal */}
      <Dialog open={userInfoOpen} onOpenChange={setUserInfoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Staff Information</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{`${selectedStaff.fname} ${selectedStaff.mname ? selectedStaff.mname + " " : ""}${selectedStaff.lname}`}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{selectedStaff.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p>{selectedStaff.gender}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p>{new Date(selectedStaff.bday).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setUserInfoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStaff}>
            <Card className="border-0 shadow-none">
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-lname">Last name</Label>
                    <Input
                      id="edit-lname"
                      name="lname"
                      value={formData.lname}
                      onChange={handleInputChange}
                      required
                      className={validationErrors.lname ? "border-red-500" : ""}
                    />
                    {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fname">First name</Label>
                    <Input
                      id="edit-fname"
                      name="fname"
                      value={formData.fname}
                      onChange={handleInputChange}
                      required
                      className={validationErrors.fname ? "border-red-500" : ""}
                    />
                    {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mname">Middle name</Label>
                    <Input id="edit-mname" name="mname" value={formData.mname || ""} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    type="email"
                    id="edit-email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={validationErrors.email ? "border-red-500" : ""}
                  />
                  {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <div className="relative">
                    <Input
                      type={showEditPassword ? "text" : "password"}
                      id="edit-password"
                      name="password"
                      value={formData.password || ""}
                      onChange={handleInputChange}
                      className={validationErrors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
                  <p className="text-xs text-gray-500">
                    If changing password: 8+ characters with uppercase, number, and special character
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bday">Date of Birth</Label>
                  <Input
                    type="date"
                    id="edit-bday"
                    name="bday"
                    value={formData.bday}
                    onChange={handleInputChange}
                    required
                    className={validationErrors.bday ? "border-red-500" : ""}
                  />
                  {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup
                    value={formData.gender_id.toString()}
                    onValueChange={(value) => handleSelectChange("gender_id", value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="edit-male" />
                      <Label htmlFor="edit-male">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="edit-female" />
                      <Label htmlFor="edit-female">Female</Label>
                    </div>
                  </RadioGroup>
                </div>
                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </CardContent>
            </Card>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this staff member? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStaff} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default ViewStaff

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
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "http://localhost/cynergy/addstaff.php" // Update this to the correct URL of your PHP backend

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
    user_type_id: 2, // Assuming 2 is for Staff
    gender_id: 1, // Default to Male (1)
    fname: "",
    mname: "",
    lname: "",
    bday: "",
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch staff data
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
    // Populate form data for editing
    setFormData({
      id: staff.id,
      email: staff.email,
      user_type_id: staff.user_type === "Staff" ? 2 : 1, // Adjust based on your user types
      gender_id: staff.gender === "Male" ? 1 : 2, // Adjust based on your gender types
      fname: staff.fname,
      mname: staff.mname || "",
      lname: staff.lname,
      bday: staff.bday,
    })
    setEditOpen(true)
  }

  const handleDeleteClick = (staffId) => {
    setStaffToDelete(staffId)
    setDeleteConfirmOpen(true)
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
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
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add staff member",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStaff = async (e) => {
    e.preventDefault()
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
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update staff member",
        variant: "destructive",
      })
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
      user_type_id: 2,
      gender_id: 1,
      fname: "",
      mname: "",
      lname: "",
      bday: "",
    })
  }

  // Filter staff based on search query
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
                        <Input id="lname" name="lname" value={formData.lname} onChange={handleInputChange} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fname">First name</Label>
                        <Input id="fname" name="fname" value={formData.fname} onChange={handleInputChange} required />
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password || ""}
                          onChange={handleInputChange}
                          required
                        />
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
                      />
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
                    <div className="space-y-2">
                      <Label htmlFor="user_type">Position</Label>
                      <Select
                        value={formData.user_type_id.toString()}
                        onValueChange={(value) => handleSelectChange("user_type_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">Staff</SelectItem>
                          <SelectItem value="3">Trainer</SelectItem>
                          <SelectItem value="4">Manager</SelectItem>
                          <SelectItem value="5">Receptionist</SelectItem>
                        </SelectContent>
                      </Select>
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
              <TableHead>Position</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading staff data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
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
                  <TableCell>{staff.user_type}</TableCell>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{`${selectedStaff.fname} ${selectedStaff.mname ? selectedStaff.mname + " " : ""}${selectedStaff.lname}`}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Position</p>
                  <p>{selectedStaff.user_type}</p>
                </div>
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
                    <Input id="edit-lname" name="lname" value={formData.lname} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-fname">First name</Label>
                    <Input id="edit-fname" name="fname" value={formData.fname} onChange={handleInputChange} required />
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
                  />
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
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="edit-user-type">Position</Label>
                  <Select
                    value={formData.user_type_id.toString()}
                    onValueChange={(value) => handleSelectChange("user_type_id", value)}
                  >
                    <SelectTrigger id="edit-user-type">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Staff</SelectItem>
                      <SelectItem value="3">Trainer</SelectItem>
                      <SelectItem value="4">Manager</SelectItem>
                      <SelectItem value="5">Receptionist</SelectItem>
                    </SelectContent>
                  </Select>
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

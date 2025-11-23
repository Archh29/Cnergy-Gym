"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff, User, Lock, Upload, Loader2, Camera } from "lucide-react"
import axios from "axios"

const API_URL = "https://api.cnergy.site/user_settings.php"

const Settings = ({ userId }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  
  // Profile state
  const [fname, setFname] = useState("")
  const [mname, setMname] = useState("")
  const [lname, setLname] = useState("")
  const [email, setEmail] = useState("")
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null)
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Helper function to normalize profile photo URLs
  const normalizeProfilePhotoUrl = (url) => {
    if (!url || typeof url !== 'string') return undefined

    try {
      // If it's already a full URL with serve_image.php, return as is
      if (url.includes('serve_image.php')) {
        return url
      }

      // If it's already a full HTTP/HTTPS URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }

      // If it's a relative path (uploads/profile/... or uploads%2Fprofile%2F...)
      if (url.startsWith('uploads/') || url.startsWith('uploads%2F')) {
        // Normalize the path - replace / with %2F
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      return undefined
    } catch (error) {
      console.error("Error normalizing profile photo URL:", error)
      return undefined
    }
  }

  // Fetch user data
  const fetchUserData = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}?user_id=${userId}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const data = await response.json()
      if (data.success && data.user) {
        setUser(data.user)
        setFname(data.user.fname || "")
        setMname(data.user.mname || "")
        setLname(data.user.lname || "")
        setEmail(data.user.email || "")
        setProfilePhotoPreview(normalizeProfilePhotoUrl(data.user.profile_photo_url))
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load user data. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [userId])

  // Handle profile photo change
  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        })
        e.target.value = ""
        return
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, or GIF)",
          variant: "destructive",
        })
        e.target.value = ""
        return
      }

      setProfilePhotoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Upload profile photo
  const uploadProfilePhoto = async (file) => {
    const formData = new FormData()
    formData.append("profile_photo", file)
    formData.append("user_id", userId)

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success && response.data.profile_photo_url) {
        return response.data.profile_photo_url
      } else {
        throw new Error(response.data.error || response.data.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!userId) return

    try {
      setSaving(true)

      let profilePhotoUrl = user?.profile_photo_url || null

      // Upload profile photo if a new one was selected
      if (profilePhotoFile) {
        try {
          profilePhotoUrl = await uploadProfilePhoto(profilePhotoFile)
        } catch (error) {
          toast({
            title: "Upload Error",
            description: "Failed to upload profile photo. Please try again.",
            variant: "destructive",
          })
          setSaving(false)
          return
        }
      }

      // Update profile
      const updateData = {
        user_id: userId,
        fname: fname.trim(),
        mname: mname.trim(),
        lname: lname.trim(),
        email: email.trim().toLowerCase(),
      }

      if (profilePhotoUrl) {
        updateData.profile_photo_url = profilePhotoUrl
      }

      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        await fetchUserData()
        setProfilePhotoFile(null)
      } else {
        throw new Error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle change password
  const handleChangePassword = async () => {
    if (!userId) return

    // Validation
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      })
      return
    }

    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      })
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one uppercase letter",
        variant: "destructive",
      })
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one number",
        variant: "destructive",
      })
      return
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast({
        title: "Error",
        description: "Password must contain at least one special character",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      const response = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Password changed successfully",
        })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        throw new Error(data.error || "Failed to change password")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Get user initials
  const getUserInitials = () => {
    if (!user) return "U"
    const f = (user.fname || "").charAt(0).toUpperCase()
    const l = (user.lname || "").charAt(0).toUpperCase()
    return f + l || "U"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your profile information and photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={profilePhotoPreview} 
                  alt={`${fname} ${lname}`}
                />
                <AvatarFallback className="text-2xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center space-y-2">
                <Label htmlFor="profile-photo" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </span>
                  </Button>
                </Label>
                <Input
                  id="profile-photo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleProfilePhotoChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 text-center">
                  JPG, PNG or GIF. Max size 5MB
                </p>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fname">First Name</Label>
                <Input
                  id="fname"
                  value={fname}
                  onChange={(e) => setFname(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lname">Last Name</Label>
                <Input
                  id="lname"
                  value={lname}
                  onChange={(e) => setLname(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mname">Middle Name (Optional)</Label>
              <Input
                id="mname"
                value={mname}
                onChange={(e) => setMname(e.target.value)}
                placeholder="Middle name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Password Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <strong>Password Requirements:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>At least 8 characters long</li>
                  <li>At least one uppercase letter</li>
                  <li>At least one number</li>
                  <li>At least one special character</li>
                </ul>
              </p>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings




"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Eye, EyeOff, User, Lock, Upload, Loader2, Camera, Trash2 } from "lucide-react"
import axios from "axios"

const API_URL = "https://api.cnergy.site/user_settings.php"

const Settings = ({ userId, open, onOpenChange }) => {
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

  const [photoCropOpen, setPhotoCropOpen] = useState(false)
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null)
  const [pendingPhotoSrc, setPendingPhotoSrc] = useState(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const cropContainerRef = useRef(null)
  const cropImgRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 })

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
    // Get userId from props or sessionStorage
    const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)

    if (!currentUserId) {
      toast({
        title: "Error",
        description: "User ID not found. Please log in again.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}?user_id=${currentUserId}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        // Try to extract JSON from response if there's trailing text
        const jsonMatch = text.match(/\{.*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("Invalid JSON response")
        }
      }

      if (data.success && data.user) {
        setUser(data.user)
        setFname(data.user.fname || "")
        setMname(data.user.mname || "")
        setLname(data.user.lname || "")
        setEmail(data.user.email || "")
        setProfilePhotoPreview(normalizeProfilePhotoUrl(data.user.profile_photo_url))
      } else {
        throw new Error(data.error || "Failed to fetch user data")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load user data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && userId) {
      // Only fetch if we don't have user data loaded yet
      const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)
      if (currentUserId && !user) {
        console.log('[Settings] Fetching user data on dialog open')
        fetchUserData()
      } else if (user) {
        // User data already loaded, just ensure loading is false
        console.log('[Settings] User data already loaded, skipping fetch')
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

      setPendingPhotoFile(file)
      setCropZoom(1)
      setCropPos({ x: 0, y: 0 })

      const reader = new FileReader()
      reader.onloadend = () => {
        setPendingPhotoSrc(reader.result)
        setPhotoCropOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const clampCropPos = (pos, zoomValue) => {
    const container = cropContainerRef.current
    const img = cropImgRef.current
    if (!container || !img) return pos

    const size = container.clientWidth || 320
    const naturalW = img.naturalWidth || 1
    const naturalH = img.naturalHeight || 1
    const baseScale = Math.max(size / naturalW, size / naturalH)

    const displayW = naturalW * baseScale * zoomValue
    const displayH = naturalH * baseScale * zoomValue

    const maxX = Math.max(0, (displayW - size) / 2)
    const maxY = Math.max(0, (displayH - size) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, pos.x)),
      y: Math.min(maxY, Math.max(-maxY, pos.y)),
    }
  }

  const handleCropImgLoad = () => {
    setCropPos((p) => clampCropPos(p, cropZoom))
  }

  const handleCropPointerDown = (e) => {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: cropPos.x,
      baseY: cropPos.y,
    }
  }

  const handleCropPointerMove = (e) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const next = { x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy }
    setCropPos(clampCropPos(next, cropZoom))
  }

  const handleCropPointerUp = () => {
    dragRef.current.dragging = false
  }

  const handleCropZoomChange = (value) => {
    const z = Number(value) || 1
    setCropZoom(z)
    setCropPos((p) => clampCropPos(p, z))
  }

  const applyCroppedPhoto = async () => {
    const file = pendingPhotoFile
    const container = cropContainerRef.current
    const img = cropImgRef.current
    if (!file || !container || !img) {
      setPhotoCropOpen(false)
      return
    }

    const size = container.clientWidth || 320
    const naturalW = img.naturalWidth || 1
    const naturalH = img.naturalHeight || 1
    const baseScale = Math.max(size / naturalW, size / naturalH)

    const scale = baseScale * cropZoom
    const visibleX = (naturalW * scale - size) / 2 - cropPos.x
    const visibleY = (naturalH * scale - size) / 2 - cropPos.y

    const sx = visibleX / scale
    const sy = visibleY / scale
    const sSize = size / scale

    const outputSize = 512
    const canvas = document.createElement("canvas")
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setPhotoCropOpen(false)
      return
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.92))
    if (!blob) {
      setPhotoCropOpen(false)
      return
    }

    const croppedFile = new File([blob], `profile_${Date.now()}.png`, { type: "image/png" })
    setProfilePhotoFile(croppedFile)
    setProfilePhotoPreview(URL.createObjectURL(croppedFile))
    setPendingPhotoFile(null)
    setPendingPhotoSrc(null)
    setPhotoCropOpen(false)
  }

  // Upload profile photo
  const uploadProfilePhoto = async (file) => {
    // Get userId from props or sessionStorage
    const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)

    if (!currentUserId) {
      throw new Error("User ID not found")
    }

    const formData = new FormData()
    formData.append("profile_photo", file)
    formData.append("user_id", currentUserId)

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
    // Get userId from props or sessionStorage
    const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)

    if (!currentUserId) {
      toast({
        title: "Error",
        description: "User ID not found. Please log in again.",
        variant: "destructive",
      })
      return
    }

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

      // Update profile (email is readonly, don't send it)
      const updateData = {
        user_id: currentUserId,
        fname: fname.trim(),
        mname: mname.trim(),
        lname: lname.trim(),
        // Email is readonly - not included in update
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

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonMatch = text.match(/\{.*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("Invalid JSON response")
        }
      }

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        })
        // Refresh user data with the updated info from response
        if (data.user) {
          console.log('[Settings] Updating state with saved user data:', data.user)
          const updatedUser = data.user
          setUser(updatedUser)
          setFname(updatedUser.fname || "")
          setMname(updatedUser.mname || "")
          setLname(updatedUser.lname || "")
          setEmail(updatedUser.email || "")
          const photoUrl = normalizeProfilePhotoUrl(updatedUser.profile_photo_url)
          console.log('[Settings] Profile photo URL from response:', updatedUser.profile_photo_url)
          console.log('[Settings] Normalized photo URL:', photoUrl)
          setProfilePhotoPreview(photoUrl)
          // Clear the file input but keep the preview
          setProfilePhotoFile(null)

          // Force a small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          // Fallback: refetch from API
          console.log('[Settings] No user data in response, refetching...')
          await fetchUserData()
        }

        // Dispatch event to notify topbar to refresh - add a small delay to ensure DB is updated
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            console.log('[Settings] Dispatching profileUpdated event')
            window.dispatchEvent(new CustomEvent('profileUpdated'))
          }
        }, 500)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account settings and preferences</DialogDescription>
        </DialogHeader>

        <Dialog open={photoCropOpen} onOpenChange={setPhotoCropOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Crop Profile Photo</DialogTitle>
              <DialogDescription>Drag to reposition and use the slider to zoom.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div
                ref={cropContainerRef}
                className="relative mx-auto w-[320px] h-[320px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 select-none"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
                onPointerLeave={handleCropPointerUp}
              >
                {pendingPhotoSrc && (
                  <img
                    ref={cropImgRef}
                    src={pendingPhotoSrc}
                    alt="Crop"
                    draggable={false}
                    onLoad={handleCropImgLoad}
                    className="absolute left-1/2 top-1/2 will-change-transform"
                    style={{
                      transform: `translate(calc(-50% + ${cropPos.x}px), calc(-50% + ${cropPos.y}px)) scale(${cropZoom})`,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10" />
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm text-slate-600 whitespace-nowrap">Zoom</Label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={cropZoom}
                  onChange={(e) => handleCropZoomChange(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingPhotoFile(null)
                    setPendingPhotoSrc(null)
                    setPhotoCropOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={applyCroppedPhoto}>
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
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
                  <div className="relative group">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={profilePhotoPreview}
                        alt={`${fname} ${lname}`}
                      />
                      <AvatarFallback className="text-2xl">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {(profilePhotoPreview || profilePhotoFile) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePhotoFile(null)
                          setProfilePhotoPreview(null)
                        }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/45"
                        title="Remove photo"
                      >
                        <Trash2 className="h-6 w-6 text-white drop-shadow" />
                      </button>
                    )}
                  </div>
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
                    readOnly
                    disabled
                    className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
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
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Password Requirements:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>At least 8 characters long</li>
                      <li>At least one uppercase letter</li>
                      <li>At least one number</li>
                      <li>At least one special character</li>
                    </ul>
                  </div>
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
        )}
      </DialogContent>
    </Dialog>
  )
}

export default Settings


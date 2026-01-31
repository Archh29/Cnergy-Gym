"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Settings,
} from "lucide-react"
import SettingsDialog from "./settings"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const SETTINGS_API_URL = "https://api.cnergy.site/user_settings.php"

const Topbar = ({ searchQuery, setSearchQuery, userRole, userId = 6, onNavigateToSection }) => {
  const [userData, setUserData] = useState({ firstName: 'Admin', role: 'Administrator', profilePhoto: null })
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Helper function to normalize profile photo URLs
  const normalizeProfilePhotoUrl = (url) => {
    if (!url || typeof url !== 'string') {
      console.log('[Topbar] No profile photo URL provided')
      return null
    }

    try {
      console.log('[Topbar] Normalizing profile photo URL:', url)

      // If it's already a full URL with serve_image.php, return as is
      if (url.includes('serve_image.php')) {
        console.log('[Topbar] Already a serve_image.php URL, returning as is')
        return url
      }

      // If it's already a full HTTP/HTTPS URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('[Topbar] Already a full URL, returning as is')
        return url
      }

      // If it's a relative path (uploads/profile/... or uploads%2Fprofile%2F...)
      if (url.startsWith('uploads/') || url.startsWith('uploads%2F')) {
        // Normalize the path - replace / with %2F
        const normalizedPath = url.replace(/\//g, '%2F')
        const finalUrl = `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
        console.log('[Topbar] Normalized URL:', finalUrl)
        return finalUrl
      }

      // If it's just a filename, assume it's in uploads/profile/
      if (url.match(/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp)$/i)) {
        const encodedPath = `uploads%2Fprofile%2F${encodeURIComponent(url)}`
        const finalUrl = `https://api.cnergy.site/serve_image.php?path=${encodedPath}`
        console.log('[Topbar] Constructed URL from filename:', finalUrl)
        return finalUrl
      }

      // Handle paths that might not start with uploads/ (edge case)
      if (url.includes('profile_')) {
        // Try to construct the proper path
        let path = url
        if (!path.startsWith('uploads/')) {
          path = `uploads/profile/${url}`
        }
        const normalizedPath = path.replace(/\//g, '%2F')
        const finalUrl = `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
        console.log('[Topbar] Constructed URL from partial path:', finalUrl)
        return finalUrl
      }

      console.log('[Topbar] Could not normalize URL, returning null')
      return null
    } catch (error) {
      console.error("[Topbar] Error normalizing profile photo URL:", error)
      return null
    }
  }

  const fetchProfilePhoto = async (userIdToFetch) => {
    // Get userId from parameter or fallback to sessionStorage
    const currentUserId = userIdToFetch || userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)

    if (!currentUserId) {
      console.log('[Topbar] No user ID available for fetching profile photo')
      return null
    }

    try {
      console.log('[Topbar] Fetching profile photo for user ID:', currentUserId)
      const response = await fetch(`${SETTINGS_API_URL}?user_id=${currentUserId}`, {
        credentials: "include"
      })

      if (!response.ok) {
        console.log('[Topbar] Profile photo fetch failed:', response.status, response.statusText)
        return null
      }

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonMatch = text.match(/\{.*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0])
        } else {
          console.log('[Topbar] Could not parse profile photo response')
          return null
        }
      }

      if (data.success && data.user) {
        console.log('[Topbar] User data received:', data.user)
        if (data.user.profile_photo_url) {
          console.log('[Topbar] Profile photo URL from API:', data.user.profile_photo_url)
          const normalizedUrl = normalizeProfilePhotoUrl(data.user.profile_photo_url)
          console.log('[Topbar] Normalized profile photo URL:', normalizedUrl)
          return normalizedUrl
        } else {
          console.log('[Topbar] No profile_photo_url in user data')
        }
      } else {
        console.log('[Topbar] Profile photo fetch unsuccessful:', data)
      }
    } catch (error) {
      console.error("[Topbar] Error fetching profile photo:", error)
    }
    return null
  }

  useEffect(() => {
    if (userId) {
      fetchUserData()

      // Fetch profile photo immediately
      const loadProfilePhoto = async () => {
        const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)
        if (currentUserId) {
          console.log('[Topbar] Fetching profile photo for user:', currentUserId)
          const photoUrl = await fetchProfilePhoto(currentUserId)
          console.log('[Topbar] Photo URL result:', photoUrl)
          if (photoUrl) {
            console.log('[Topbar] Setting profile photo:', photoUrl)
            setUserData(prev => {
              const updated = { ...prev, profilePhoto: photoUrl }
              console.log('[Topbar] Updated userData:', updated)
              return updated
            })
          } else {
            console.log('[Topbar] No profile photo found, keeping fallback')
            setUserData(prev => ({ ...prev, profilePhoto: null }))
          }
        }
      }

      loadProfilePhoto()

      // Listen for profile update events
      const handleProfileUpdate = async () => {
        console.log('[Topbar] Profile updated event received, refreshing...')
        fetchUserData()
        const currentUserId = userId || (typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null)
        if (currentUserId) {
          const photoUrl = await fetchProfilePhoto(currentUserId)
          if (photoUrl) {
            console.log('[Topbar] Updated profile photo after save:', photoUrl)
            setUserData(prev => ({ ...prev, profilePhoto: photoUrl }))
          }
        }
      }

      window.addEventListener('profileUpdated', handleProfileUpdate)

      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate)
      }
    }
  }, [userId])

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
            // Get profile photo URL from API response or preserve existing one
            const profilePhotoUrl = userInfo.user.profile_photo_url
              ? normalizeProfilePhotoUrl(userInfo.user.profile_photo_url)
              : null
            setUserData(prev => ({
              ...prev,
              firstName: userInfo.user.fname || 'Admin',
              role: userInfo.user.user_type_name || 'Administrator',
              // Use profile photo from API, or preserve existing one if API doesn't have it
              profilePhoto: profilePhotoUrl || prev.profilePhoto
            }))
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
              // Get profile photo URL from API response or preserve existing one
              const profilePhotoUrl = userInfo.user.profile_photo_url
                ? normalizeProfilePhotoUrl(userInfo.user.profile_photo_url)
                : null
              setUserData(prev => ({
                ...prev,
                firstName: userInfo.user.fname || 'Admin',
                role: userInfo.user.user_type_name || 'Administrator',
                // Use profile photo from API, or preserve existing one if API doesn't have it
                profilePhoto: profilePhotoUrl || prev.profilePhoto
              }))
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

  return (
    <div className="flex items-center gap-4">
      {/* User Avatar with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{userData.firstName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userData.role}</p>
            </div>
            <div className="relative w-9 h-9">
              {!userData.profilePhoto ? (
                <div className="absolute inset-0 w-9 h-9 bg-gray-800 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-900">
                  <span className="text-white font-semibold text-sm">{userData.firstName?.charAt(0) || "A"}</span>
                </div>
              ) : (
                <>
                  <div
                    className="absolute inset-0 w-9 h-9 bg-gray-800 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-900"
                    id="profile-fallback"
                  >
                    <span className="text-white font-semibold text-sm">{userData.firstName?.charAt(0) || "A"}</span>
                  </div>
                  <img
                    src={userData.profilePhoto}
                    alt={userData.firstName}
                    className="absolute inset-0 w-9 h-9 rounded-lg border-2 border-white dark:border-gray-900 object-cover z-10"
                    onError={(e) => {
                      console.error('[Topbar] ❌ Failed to load profile image')
                      console.error('[Topbar] Attempted URL:', userData.profilePhoto)
                      e.target.style.display = 'none'
                      const fallback = document.getElementById('profile-fallback')
                      if (fallback) fallback.style.display = 'flex'
                    }}
                    onLoad={(e) => {
                      console.log('[Topbar] ✅ Profile image loaded successfully!')
                      console.log('[Topbar] Image URL:', userData.profilePhoto)
                      const fallback = document.getElementById('profile-fallback')
                      if (fallback) fallback.style.display = 'none'
                    }}
                  />
                </>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full z-20"></div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => setSettingsOpen(true)}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Dialog */}
      <SettingsDialog userId={userId} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

export default Topbar

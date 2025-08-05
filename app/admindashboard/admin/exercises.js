"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Edit, Trash2, Loader2, X, Play, ImageIcon, Dumbbell, Target } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const ExerciseMuscleManager = () => {
  // Common states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Exercise states
  const [exercises, setExercises] = useState([])
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("")
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [exerciseName, setExerciseName] = useState("")
  const [exerciseDescription, setExerciseDescription] = useState("")
  const [selectedMuscles, setSelectedMuscles] = useState([])
  const [exerciseImageFile, setExerciseImageFile] = useState(null)
  const [exerciseVideoFile, setExerciseVideoFile] = useState(null)
  const [exerciseImagePreview, setExerciseImagePreview] = useState("")
  const [exerciseVideoPreview, setExerciseVideoPreview] = useState("")

  // Muscle states
  const [muscles, setMuscles] = useState([])
  const [muscleSearchQuery, setMuscleSearchQuery] = useState("")
  const [muscleDialogOpen, setMuscleDialogOpen] = useState(false)
  const [selectedMuscle, setSelectedMuscle] = useState(null)
  const [muscleName, setMuscleName] = useState("")
  const [muscleImageFile, setMuscleImageFile] = useState(null)
  const [muscleImagePreview, setMuscleImagePreview] = useState("")

  // API base URL
  const API_URL = "http://localhost/cynergy/exercises.php"

  useEffect(() => {
    fetchExercises()
    fetchMuscles()
  }, [])

  // Exercise functions
  const fetchExercises = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_URL}?action=get_exercises`)
      if (response.data.success) {
        setExercises(response.data.data)
        setError("")
      } else {
        setError(response.data.message || "Failed to fetch exercises")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMuscles = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=get_muscles`)
      if (response.data.success) {
        setMuscles(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching muscles:", error)
    }
  }

  const handleApiError = (error) => {
    if (error.response) {
      setError(error.response.data.message || "Server error occurred")
    } else if (error.request) {
      setError("Unable to connect to server")
    } else {
      setError("An unexpected error occurred")
    }
    console.error("API Error:", error)
  }

  const handleFileUpload = async (file, type) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("action", "upload_file")
    formData.append("type", type)

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        return response.data.file_url
      } else {
        throw new Error(response.data.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      throw error
    }
  }

  // Exercise handlers
  const handleExerciseImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setExerciseImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setExerciseImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleExerciseVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setExerciseVideoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setExerciseVideoPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleMuscleToggle = (muscleId) => {
    setSelectedMuscles((prev) => (prev.includes(muscleId) ? prev.filter((id) => id !== muscleId) : [...prev, muscleId]))
  }

  const handleSaveExercise = async () => {
    if (!exerciseName.trim()) {
      setError("Exercise name is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      let imageUrl = selectedExercise?.image_url || ""
      let videoUrl = selectedExercise?.video_url || ""

      // Upload image if new file selected
      if (exerciseImageFile) {
        imageUrl = await handleFileUpload(exerciseImageFile, "image")
      }

      // Upload video if new file selected
      if (exerciseVideoFile) {
        videoUrl = await handleFileUpload(exerciseVideoFile, "video")
      }

      const exerciseData = {
        action: selectedExercise ? "update_exercise" : "create_exercise",
        name: exerciseName.trim(),
        description: exerciseDescription.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
        target_muscles: selectedMuscles,
      }

      if (selectedExercise) {
        exerciseData.id = selectedExercise.id
      }

      const response = await axios.post(API_URL, exerciseData)

      if (response.data.success) {
        await fetchExercises()
        handleCloseExerciseDialog()
      } else {
        setError(response.data.message || "Failed to save exercise")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExercise = async (id) => {
    if (!confirm("Are you sure you want to delete this exercise?")) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await axios.post(API_URL, {
        action: "delete_exercise",
        id: id,
      })

      if (response.data.success) {
        await fetchExercises()
      } else {
        setError(response.data.message || "Failed to delete exercise")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditExercise = (exercise) => {
    setSelectedExercise(exercise)
    setExerciseName(exercise.name)
    setExerciseDescription(exercise.description || "")
    setSelectedMuscles(exercise.target_muscles?.map((m) => m.id) || [])
    setExerciseImagePreview(exercise.image_url || "")
    setExerciseVideoPreview(exercise.video_url || "")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
    setExerciseDialogOpen(true)
  }

  const handleAddExercise = () => {
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setSelectedMuscles([])
    setExerciseImagePreview("")
    setExerciseVideoPreview("")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
    setExerciseDialogOpen(true)
  }

  const handleCloseExerciseDialog = () => {
    setExerciseDialogOpen(false)
    setSelectedExercise(null)
    setExerciseName("")
    setExerciseDescription("")
    setSelectedMuscles([])
    setExerciseImagePreview("")
    setExerciseVideoPreview("")
    setExerciseImageFile(null)
    setExerciseVideoFile(null)
    setError("")
  }

  // Muscle handlers
  const handleMuscleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setMuscleImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setMuscleImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveMuscle = async () => {
    if (!muscleName.trim()) {
      setError("Muscle name is required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      let imageUrl = selectedMuscle?.image_url || ""

      // Upload image if new file selected
      if (muscleImageFile) {
        imageUrl = await handleFileUpload(muscleImageFile, "image")
      }

      const muscleData = {
        action: selectedMuscle ? "update_muscle" : "create_muscle",
        name: muscleName.trim(),
        image_url: imageUrl,
      }

      if (selectedMuscle) {
        muscleData.id = selectedMuscle.id
      }

      const response = await axios.post(API_URL, muscleData)

      if (response.data.success) {
        await fetchMuscles()
        handleCloseMuscleDialog()
      } else {
        setError(response.data.message || "Failed to save muscle")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteMuscle = async (id) => {
    if (!confirm("Are you sure you want to delete this muscle group?")) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await axios.post(API_URL, {
        action: "delete_muscle",
        id: id,
      })

      if (response.data.success) {
        await fetchMuscles()
      } else {
        setError(response.data.message || "Failed to delete muscle")
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditMuscle = (muscle) => {
    setSelectedMuscle(muscle)
    setMuscleName(muscle.name)
    setMuscleImagePreview(muscle.image_url || "")
    setMuscleImageFile(null)
    setMuscleDialogOpen(true)
  }

  const handleAddMuscle = () => {
    setSelectedMuscle(null)
    setMuscleName("")
    setMuscleImagePreview("")
    setMuscleImageFile(null)
    setMuscleDialogOpen(true)
  }

  const handleCloseMuscleDialog = () => {
    setMuscleDialogOpen(false)
    setSelectedMuscle(null)
    setMuscleName("")
    setMuscleImagePreview("")
    setMuscleImageFile(null)
    setError("")
  }

  // Filter functions
  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
      (exercise.description && exercise.description.toLowerCase().includes(exerciseSearchQuery.toLowerCase())),
  )

  const filteredMuscles = muscles.filter((muscle) =>
    muscle.name.toLowerCase().includes(muscleSearchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="exercises" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercises
          </TabsTrigger>
          <TabsTrigger value="muscles" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Muscle Groups
          </TabsTrigger>
        </TabsList>

        {/* Exercises Tab */}
        <TabsContent value="exercises">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manage Exercises
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Add, edit, or remove exercises with target muscles and media</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search exercises..."
                    className="pl-8"
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddExercise} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Target Muscles</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExercises.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {isLoading
                            ? "Loading exercises..."
                            : exerciseSearchQuery
                              ? "No exercises found matching your search"
                              : "No exercises found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExercises.map((exercise) => (
                        <TableRow key={exercise.id}>
                          <TableCell className="font-medium">{exercise.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {exercise.target_muscles?.map((muscle) => (
                                <Badge key={muscle.id} variant="secondary" className="text-xs">
                                  {muscle.name}
                                </Badge>
                              )) || <span className="text-muted-foreground text-sm">No muscles</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {exercise.image_url && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ImageIcon className="h-3 w-3" />
                                  Image
                                </div>
                              )}
                              {exercise.video_url && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Play className="h-3 w-3" />
                                  Video
                                </div>
                              )}
                              {!exercise.image_url && !exercise.video_url && (
                                <span className="text-xs text-muted-foreground">No media</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={exercise.description}>
                              {exercise.description || "No description"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditExercise(exercise)}
                                disabled={isLoading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteExercise(exercise.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Muscles Tab */}
        <TabsContent value="muscles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manage Muscle Groups
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Add, edit, or remove muscle groups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search muscle groups..."
                    className="pl-8"
                    value={muscleSearchQuery}
                    onChange={(e) => setMuscleSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddMuscle} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Muscle Group
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMuscles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          {isLoading
                            ? "Loading muscle groups..."
                            : muscleSearchQuery
                              ? "No muscle groups found matching your search"
                              : "No muscle groups found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMuscles.map((muscle) => (
                        <TableRow key={muscle.id}>
                          <TableCell className="font-medium">{muscle.name}</TableCell>
                          <TableCell>
                            {muscle.image_url ? (
                              <img
                                src={muscle.image_url || "/placeholder.svg"}
                                alt={muscle.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            ) : (
                              <span className="text-muted-foreground text-sm">No image</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditMuscle(muscle)}
                                disabled={isLoading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMuscle(muscle.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Exercise Name *</Label>
              <Input
                id="exercise-name"
                placeholder="Enter exercise name"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exercise-description">Description</Label>
              <Textarea
                id="exercise-description"
                placeholder="Enter exercise description (optional)"
                value={exerciseDescription}
                onChange={(e) => setExerciseDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {/* Target Muscles Selection */}
            <div className="space-y-3">
              <Label>Target Muscles</Label>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                {muscles.map((muscle) => (
                  <div key={muscle.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`muscle-${muscle.id}`}
                      checked={selectedMuscles.includes(muscle.id)}
                      onCheckedChange={() => handleMuscleToggle(muscle.id)}
                      disabled={isLoading}
                    />
                    <div className="flex items-center space-x-2">
                      {muscle.image_url && (
                        <img
                          src={muscle.image_url || "/placeholder.svg"}
                          alt={muscle.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <Label htmlFor={`muscle-${muscle.id}`} className="text-sm font-normal cursor-pointer">
                        {muscle.name}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Exercise Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleExerciseImageChange}
                  disabled={isLoading}
                  className="flex-1"
                />
                {exerciseImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExerciseImagePreview("")
                      setExerciseImageFile(null)
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {exerciseImagePreview && (
                <div className="mt-2">
                  <img
                    src={exerciseImagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div className="space-y-3">
              <Label>Exercise Video</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleExerciseVideoChange}
                  disabled={isLoading}
                  className="flex-1"
                />
                {exerciseVideoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExerciseVideoPreview("")
                      setExerciseVideoFile(null)
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {exerciseVideoPreview && (
                <div className="mt-2">
                  <video src={exerciseVideoPreview} controls className="w-64 h-36 object-cover rounded border" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseExerciseDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveExercise} disabled={!exerciseName.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedExercise ? (
                "Update Exercise"
              ) : (
                "Add Exercise"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Muscle Dialog */}
      <Dialog open={muscleDialogOpen} onOpenChange={setMuscleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMuscle ? "Edit Muscle Group" : "Add Muscle Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="muscle-name">Muscle Group Name *</Label>
              <Input
                id="muscle-name"
                placeholder="Enter muscle group name"
                value={muscleName}
                onChange={(e) => setMuscleName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Muscle Group Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleMuscleImageChange}
                  disabled={isLoading}
                  className="flex-1"
                />
                {muscleImagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMuscleImagePreview("")
                      setMuscleImageFile(null)
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {muscleImagePreview && (
                <div className="mt-2">
                  <img
                    src={muscleImagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseMuscleDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveMuscle} disabled={!muscleName.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedMuscle ? (
                "Update Muscle Group"
              ) : (
                "Add Muscle Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExerciseMuscleManager

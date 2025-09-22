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
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Plus, Edit, Trash2, Loader2, Eye } from "lucide-react"
import { Label } from "@/components/ui/label"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const FreePrograms = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [programs, setPrograms] = useState([])
  const [exercises, setExercises] = useState([])
  const [programWorkouts, setProgramWorkouts] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [programName, setProgramName] = useState("")
  const [programDescription, setProgramDescription] = useState("")
  const [selectedExercises, setSelectedExercises] = useState([])
  const [exerciseDetails, setExerciseDetails] = useState({}) // Store weight, reps, sets, color for each exercise
  const [error, setError] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    fetchingPrograms: false,
    savingProgram: false,
    deletingProgram: false,
  })

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // API URLs - using your existing file structure
  const PROGRAMS_API = "https://api.cnergy.site/programs.php"
  const EXERCISES_API = "https://api.cnergy.site/exercises.php?action=get_exercises"

  useEffect(() => {
    fetchPrograms()
    fetchExercises()
  }, [])

  const fetchPrograms = async () => {
    setLoadingState("fetchingPrograms", true)
    try {
      const response = await axios.get(PROGRAMS_API)
      if (response.data.success && Array.isArray(response.data.programs)) {
        setPrograms(response.data.programs)
        setError("")
      } else {
        setPrograms([])
        setError(response.data.message || "Failed to fetch programs")
      }
    } catch (error) {
      setPrograms([])
      handleAxiosError(error, "Error fetching programs")
    } finally {
      setLoadingState("fetchingPrograms", false)
    }
  }

  const fetchExercises = async () => {
    try {
      const response = await axios.get(EXERCISES_API)
      if (response.data.success && Array.isArray(response.data.data)) {
        setExercises(response.data.data)
      } else {
        setExercises([])
      }
    } catch (error) {
      setExercises([])
      console.error("Error fetching exercises:", error)
    }
  }

  const handleAxiosError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response) {
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`
    } else if (error.request) {
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout - please try again"
      } else {
        errorMessage = "Unable to connect to server - check your connection"
      }
    } else {
      errorMessage = error.message || defaultMessage
    }

    setError(errorMessage)
    console.error(defaultMessage, error)
  }

  const handleSaveProgram = async () => {
    if (!programName.trim()) {
      setError("Program name is required")
      return
    }

    if (selectedExercises.length === 0) {
      setError("Please select at least one exercise")
      return
    }

    setLoadingState("savingProgram", true)
    setError("")

    try {
      // Prepare exercises data for the program
      const exercisesData = selectedExercises.map((exerciseId) => {
        const exercise = exercises.find((ex) => ex.id === exerciseId)
        const details = exerciseDetails[exerciseId] || {}
        return {
          exercise_id: exerciseId,
          exercise_name: exercise ? exercise.name : "Unknown Exercise",
          weight: details.weight || "",
          reps: details.reps || "",
          sets: details.sets || "",
          color: details.color || "#3B82F6"
        }
      })

      const programData = {
        name: programName.trim(),
        description: programDescription.trim(),
        exercises: exercisesData, // Send exercises with the program
      }

      let response
      if (selectedProgram) {
        // Update existing program
        response = await axios.put(PROGRAMS_API, {
          id: selectedProgram.id,
          ...programData,
        })
      } else {
        // Create new program
        response = await axios.post(PROGRAMS_API, programData)
      }

      if (response.data.success) {
        await fetchPrograms()
        handleCloseDialog()
      } else {
        setError(response.data.message || "Failed to save program")
      }
    } catch (error) {
      handleAxiosError(error, "Error saving program")
    } finally {
      setLoadingState("savingProgram", false)
    }
  }

  const handleDeleteProgram = async (id) => {
    if (!confirm("Are you sure you want to delete this program? This will also delete all associated exercises.")) {
      return
    }

    setLoadingState("deletingProgram", true)
    setError("")

    try {
      const response = await axios.delete(PROGRAMS_API, {
        data: { id },
      })

      if (response.data.success) {
        await fetchPrograms()
      } else {
        setError(response.data.message || "Failed to delete program")
      }
    } catch (error) {
      handleAxiosError(error, "Error deleting program")
    } finally {
      setLoadingState("deletingProgram", false)
    }
  }

  const handleEditProgram = (program) => {
    setSelectedProgram(program)
    setProgramName(program.name)
    setProgramDescription(program.description || "")

    // If program has exercises data, pre-select them and load details
    if (program.exercises && Array.isArray(program.exercises)) {
      const exerciseIds = program.exercises.map((ex) => ex.exercise_id).filter(Boolean)
      setSelectedExercises(exerciseIds)
      
      // Load exercise details
      const details = {}
      program.exercises.forEach((ex) => {
        if (ex.exercise_id) {
          details[ex.exercise_id] = {
            weight: ex.weight || "",
            reps: ex.reps || "",
            sets: ex.sets || "",
            color: ex.color || "#3B82F6"
          }
        }
      })
      setExerciseDetails(details)
    } else {
      setSelectedExercises([])
      setExerciseDetails({})
    }

    setDialogOpen(true)
  }

  const handleAddProgram = () => {
    setSelectedProgram(null)
    setProgramName("")
    setProgramDescription("")
    setSelectedExercises([])
    setExerciseDetails({})
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedProgram(null)
    setProgramName("")
    setProgramDescription("")
    setSelectedExercises([])
    setExerciseDetails({})
    setError("")
  }

  const handleViewProgram = (program) => {
    setSelectedProgram(program)
    setViewDialogOpen(true)
  }

  const handleExerciseToggle = (exerciseId) => {
    setSelectedExercises((prev) => {
      if (prev.includes(exerciseId)) {
        // Remove exercise details when unselecting
        setExerciseDetails((details) => {
          const newDetails = { ...details }
          delete newDetails[exerciseId]
          return newDetails
        })
        return prev.filter((id) => id !== exerciseId)
      } else {
        // Initialize exercise details when selecting
        setExerciseDetails((details) => ({
          ...details,
          [exerciseId]: {
            weight: "",
            reps: "",
            sets: "",
            color: "#3B82F6"
          }
        }))
        return [...prev, exerciseId]
      }
    })
  }

  const handleExerciseDetailChange = (exerciseId, field, value) => {
    setExerciseDetails((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        [field]: value
      }
    }))
  }

  const getProgramExerciseCount = (program) => {
    if (program.exercises && Array.isArray(program.exercises)) {
      return program.exercises.length
    }
    return 0
  }

  const filteredPrograms = (programs || []).filter((program) =>
    program?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Free Programs
                {loadingStates.fetchingPrograms && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>Create and manage free workout programs available to all users</CardDescription>
            </div>
            <Button onClick={handleAddProgram} disabled={loadingStates.savingProgram || loadingStates.deletingProgram}>
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search programs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loadingStates.fetchingPrograms
                        ? "Loading programs..."
                        : searchQuery
                          ? "No programs found matching your search"
                          : "No programs found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrograms.map((program) => {
                    const exerciseCount = getProgramExerciseCount(program)
                    return (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={program.description}>
                            {program.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            System
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProgram(program)}
                              disabled={loadingStates.savingProgram || loadingStates.deletingProgram}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProgram(program)}
                              disabled={loadingStates.savingProgram || loadingStates.deletingProgram}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteProgram(program.id)}
                              disabled={loadingStates.savingProgram || loadingStates.deletingProgram}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Program Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProgram ? "Edit Program" : "Add New Program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Program Title *</Label>
              <Input
                id="name"
                placeholder="Enter program title"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                disabled={loadingStates.savingProgram}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter program description (optional)"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                disabled={loadingStates.savingProgram}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <Label>Select Exercises *</Label>
              {exercises.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No exercises found in your database. Please add exercises first before creating programs.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={`exercise-${exercise.id}`}
                          checked={selectedExercises.includes(exercise.id)}
                          onCheckedChange={() => handleExerciseToggle(exercise.id)}
                          disabled={loadingStates.savingProgram}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`exercise-${exercise.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {exercise.name}
                          </label>
                          {exercise.description && (
                            <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Exercise Details - only show if exercise is selected */}
                      {selectedExercises.includes(exercise.id) && (
                        <div className="ml-6 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label htmlFor={`weight-${exercise.id}`} className="text-xs">Weight (kg)</Label>
                            <Input
                              id={`weight-${exercise.id}`}
                              type="number"
                              placeholder="0"
                              value={exerciseDetails[exercise.id]?.weight || ""}
                              onChange={(e) => handleExerciseDetailChange(exercise.id, 'weight', e.target.value)}
                              disabled={loadingStates.savingProgram}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`reps-${exercise.id}`} className="text-xs">Reps</Label>
                            <Input
                              id={`reps-${exercise.id}`}
                              type="number"
                              placeholder="0"
                              value={exerciseDetails[exercise.id]?.reps || ""}
                              onChange={(e) => handleExerciseDetailChange(exercise.id, 'reps', e.target.value)}
                              disabled={loadingStates.savingProgram}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`sets-${exercise.id}`} className="text-xs">Sets</Label>
                            <Input
                              id={`sets-${exercise.id}`}
                              type="number"
                              placeholder="0"
                              value={exerciseDetails[exercise.id]?.sets || ""}
                              onChange={(e) => handleExerciseDetailChange(exercise.id, 'sets', e.target.value)}
                              disabled={loadingStates.savingProgram}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`color-${exercise.id}`} className="text-xs">Color</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                id={`color-${exercise.id}`}
                                type="color"
                                value={exerciseDetails[exercise.id]?.color || "#3B82F6"}
                                onChange={(e) => handleExerciseDetailChange(exercise.id, 'color', e.target.value)}
                                disabled={loadingStates.savingProgram}
                                className="h-8 w-12 p-1"
                              />
                              <span className="text-xs text-muted-foreground">
                                {exerciseDetails[exercise.id]?.color || "#3B82F6"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedExercises.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedExercises.length} exercise{selectedExercises.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loadingStates.savingProgram}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProgram}
              disabled={
                !programName.trim() ||
                selectedExercises.length === 0 ||
                loadingStates.savingProgram ||
                exercises.length === 0
              }
            >
              {loadingStates.savingProgram ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedProgram ? (
                "Update Program"
              ) : (
                "Create Program"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Program Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedProgram?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedProgram?.description || "No description available"}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Exercises</h4>
              <div className="space-y-2">
                {selectedProgram && selectedProgram.exercises && selectedProgram.exercises.length > 0 ? (
                  selectedProgram.exercises.map((exercise, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium mb-2">{exercise.exercise_name || "Unknown Exercise"}</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weight:</span>
                          <span className="font-medium">{exercise.weight || "N/A"} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reps:</span>
                          <span className="font-medium">{exercise.reps || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sets:</span>
                          <span className="font-medium">{exercise.sets || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Color:</span>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: exercise.color || "#3B82F6" }}
                            ></div>
                            <span className="font-medium text-xs">{exercise.color || "#3B82F6"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No exercises added yet</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FreePrograms
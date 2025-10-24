"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState(props.selected)

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        const days = []

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day))
        }

        return days
    }

    const isToday = (date) => {
        if (!date) return false
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const isSelected = (date) => {
        if (!date || !selectedDate) return false
        return date.toDateString() === selectedDate.toDateString()
    }

    const handleDateClick = (date) => {
        if (!date) return
        setSelectedDate(date)
        if (props.onSelect) {
            props.onSelect(date)
        }
    }

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const days = getDaysInMonth(currentMonth)

    return (
        <div className={cn("p-4 bg-white rounded-lg shadow-lg border w-80", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 w-8 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 p-0 rounded-md transition-colors"
                    )}
                >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>

                <h2 className="text-lg font-semibold text-gray-900">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>

                <button
                    onClick={goToNextMonth}
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 w-8 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 p-0 rounded-md transition-colors"
                    )}
                >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                    <div
                        key={day}
                        className="text-gray-500 font-medium text-sm h-8 flex items-center justify-center"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => (
                    <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        className={cn(
                            "h-10 w-10 text-sm rounded-md transition-colors flex items-center justify-center",
                            !date && "invisible",
                            date && !isSelected(date) && !isToday(date) && "text-gray-700 hover:bg-gray-100",
                            isToday(date) && !isSelected(date) && "bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200",
                            isSelected(date) && "bg-blue-500 text-white hover:bg-blue-600 font-semibold"
                        )}
                    >
                        {date && date.getDate()}
                    </button>
                ))}
            </div>
        </div>
    )
}

Calendar.displayName = "Calendar"

export { Calendar }
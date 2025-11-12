"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    disabled,
    ...props
}) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())
    const [selectedDate, setSelectedDate] = React.useState(props.selected)

    React.useEffect(() => {
        setSelectedDate(props.selected)
    }, [props.selected])

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
        today.setHours(0, 0, 0, 0)
        const dateToCheck = new Date(date)
        dateToCheck.setHours(0, 0, 0, 0)
        return dateToCheck.getTime() === today.getTime()
    }

    const isSelected = (date) => {
        if (!date || !selectedDate) return false
        const dateToCheck = new Date(date)
        dateToCheck.setHours(0, 0, 0, 0)
        const selected = new Date(selectedDate)
        selected.setHours(0, 0, 0, 0)
        return dateToCheck.getTime() === selected.getTime()
    }

    const isDisabled = (date) => {
        if (!date) return false
        if (disabled && typeof disabled === 'function') {
            return disabled(date)
        }
        return false
    }

    const isFutureDate = (date) => {
        if (!date) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dateToCheck = new Date(date)
        dateToCheck.setHours(0, 0, 0, 0)
        return dateToCheck.getTime() > today.getTime()
    }

    const handleDateClick = (date) => {
        if (!date) return
        if (isDisabled(date) || isFutureDate(date)) return
        setSelectedDate(date)
        if (props.onSelect) {
            props.onSelect(date)
        }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const canGoNextMonth = () => {
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        nextMonth.setHours(0, 0, 0, 0)
        return nextMonth.getTime() <= today.getTime()
    }

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const goToNextMonth = () => {
        if (!canGoNextMonth()) return
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const days = getDaysInMonth(currentMonth)

    return (
        <div className={cn("p-4 bg-white rounded-lg shadow-lg border w-80", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        goToPreviousMonth()
                    }}
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
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (canGoNextMonth()) {
                            goToNextMonth()
                        }
                    }}
                    disabled={!canGoNextMonth()}
                    className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 w-8 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 p-0 rounded-md transition-colors",
                        !canGoNextMonth() && "opacity-40 cursor-not-allowed"
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
                {days.map((date, index) => {
                    if (!date) {
                        return (
                            <div key={index} className="h-10 w-10 invisible" />
                        )
                    }
                    const isFuture = isFutureDate(date)
                    const disabled = isFuture || isDisabled(date)
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={(e) => {
                                if (!disabled) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDateClick(date)
                                }
                            }}
                            disabled={disabled}
                            className={cn(
                                "h-10 w-10 text-sm rounded-md transition-colors flex items-center justify-center",
                                disabled && "opacity-40 cursor-not-allowed",
                                !disabled && !isSelected(date) && !isToday(date) && "text-gray-700 hover:bg-gray-100 cursor-pointer",
                                isToday(date) && !isSelected(date) && !disabled && "bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 cursor-pointer",
                                isSelected(date) && !disabled && "bg-blue-500 text-white hover:bg-blue-600 font-semibold cursor-pointer",
                                isFuture && "text-gray-400"
                            )}
                        >
                            {date.getDate()}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

Calendar.displayName = "Calendar"

export { Calendar }
'use client'

import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { AdminUserGroupSummary } from '@saas/shared-types'

interface GroupsMultiSelectProps {
  id: string
  availableGroups: AdminUserGroupSummary[]
  selectedGroupIds: string[]
  onChange: (groupIds: string[]) => void
  disabled?: boolean
}

function getTriggerLabel(
  selectedGroupIds: string[],
  availableGroups: AdminUserGroupSummary[]
): string {
  if (selectedGroupIds.length === 0) {
    return 'No groups selected'
  }

  const names = availableGroups
    .filter((group) => selectedGroupIds.includes(group.id))
    .map((group) => group.name)

  if (names.length <= 3) {
    return names.join(', ')
  }

  return `${names.length} groups selected`
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function GroupsMultiSelect({
  id,
  availableGroups,
  selectedGroupIds,
  onChange,
  disabled = false,
}: GroupsMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const triggerLabel = getTriggerLabel(selectedGroupIds, availableGroups)

  useEffect(() => {
    function handleMouseDown(event: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown)
      return () => {
        document.removeEventListener('mousedown', handleMouseDown)
      }
    }

    return undefined
  }, [isOpen])

  function toggleGroup(groupId: string) {
    const newSelected = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((id) => id !== groupId)
      : [...selectedGroupIds, groupId]

    onChange(newSelected)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (isOpen && focusedIndex >= 0 && focusedIndex < availableGroups.length) {
          toggleGroup(availableGroups[focusedIndex].id)
        } else {
          setIsOpen(!isOpen)
        }
        break
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          setFocusedIndex(0)
        } else {
          setFocusedIndex((prev) => (prev < availableGroups.length - 1 ? prev + 1 : 0))
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : availableGroups.length - 1))
        }
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
      case 'Tab':
        setIsOpen(false)
        setFocusedIndex(-1)
        break
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLLIElement>, groupId: string) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        toggleGroup(groupId)
        break
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((prev) => (prev < availableGroups.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : availableGroups.length - 1))
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        triggerRef.current?.focus()
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label ${id}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen)
            if (!isOpen) {
              setTimeout(() => setFocusedIndex(-1), 0)
            }
          }
        }}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className="truncate">{triggerLabel}</span>
        <span
          className={`ml-2 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <ChevronUpIcon />
        </span>
      </button>

      {isOpen && availableGroups.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Select groups"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {availableGroups.map((group, index) => {
            const isSelected = selectedGroupIds.includes(group.id)
            const isFocused = focusedIndex === index

            return (
              <li
                key={group.id}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => toggleGroup(group.id)}
                onKeyDown={(event) => handleOptionKeyDown(event, group.id)}
                onFocus={() => setFocusedIndex(index)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm focus:outline-none ${
                  isFocused ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <CheckIcon className="h-3 w-3" />}
                </span>
                <span className={isSelected ? 'text-gray-900' : 'text-gray-700'}>
                  {group.name}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {isOpen && availableGroups.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-3 text-center text-sm text-gray-500 shadow-lg">
          No groups available
        </div>
      )}
    </div>
  )
}

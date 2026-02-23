import { useState, useEffect, useRef } from 'react'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchBarProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => void
}

export function SearchBar({ isOpen, onClose, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query)
      setQuery('')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/90 backdrop-blur-sm flex items-start justify-center pt-32 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl px-4"
          >
            <form onSubmit={handleSubmit} className="glassmorphic rounded-2xl p-2 flex items-center gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search YouTube Music..."
                className="flex-1 border-0 bg-transparent text-lg placeholder:text-muted-foreground focus-visible:ring-0"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 hover:bg-accent/20 hover:text-accent"
              >
                <X size={20} weight="bold" />
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Press <kbd className="px-2 py-1 bg-muted rounded text-foreground">Enter</kbd> to search or <kbd className="px-2 py-1 bg-muted rounded text-foreground">Esc</kbd> to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

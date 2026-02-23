import React, { useEffect, useRef, useState } from 'react'

interface MarqueeTextProps {
  text: string
  className?: string
  speed?: number
}

export function MarqueeText({ text, className = '', speed = 0.8 }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [text])

  return (
    <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div
        ref={textRef}
        className={`inline-block ${isOverflowing ? 'animate-marquee' : ''}`}
        style={{
          animationDuration: isOverflowing ? `${text.length * speed}s` : '0s',
        }}
      >
        {text}
        {isOverflowing && (
          <span className="ml-8">{text}</span>
        )}
      </div>
    </div>
  )
}

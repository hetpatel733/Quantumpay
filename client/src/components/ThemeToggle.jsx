import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-16 h-16 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-gray-700 overflow-hidden group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      {/* Sun Icon */}
      <motion.div
        initial={false}
        animate={{
          scale: isDarkMode ? 0 : 1,
          rotate: isDarkMode ? 180 : 0,
          opacity: isDarkMode ? 0 : 1
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <svg
          className="w-7 h-7 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      </motion.div>

      {/* Moon Icon */}
      <motion.div
        initial={false}
        animate={{
          scale: isDarkMode ? 1 : 0,
          rotate: isDarkMode ? 0 : -180,
          opacity: isDarkMode ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <svg
          className="w-7 h-7 text-blue-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </motion.div>

      {/* Sparkle effect on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-blue-300 opacity-0 group-hover:opacity-20 transition-opacity"
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </motion.button>
  )
}

export default ThemeToggle

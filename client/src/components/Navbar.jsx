import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from './ThemeToggle'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActiveRoute = (path) => {
    return location.pathname === path
  }

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/cryptocurrencies', label: 'Supported Cryptocurrencies' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/login', label: 'Login', icon: 'bi-chevron-right' },
    { path: '/signup', label: 'Sign up', icon: 'bi-chevron-right', highlight: true },
  ]

  return (
    <header 
      className={`fixed top-0 w-full z-50 font-raleway transition-all duration-300 ${
        scrolled 
          ? 'bg-[#b5f4f6]/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border-b-2 border-secondary-300 dark:border-gray-700' 
          : 'bg-[#b5f4f6] dark:bg-gray-900 border-b-2 border-secondary-300 dark:border-gray-700'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" onClick={closeMenu} className="no-underline group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <img
                src="/images/logoimg.webp"
                alt="QuantumPay Logo"
                className="h-12 w-12 rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
              />
              <span className="text-2xl font-bold text-black dark:text-white">QuantumPay</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            <ul className="flex space-x-2 text-black dark:text-white font-medium">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`block no-underline text-black dark:text-white px-4 py-2 rounded-2xl transition-all duration-200 ${
                      isActiveRoute(link.path)
                        ? 'bg-[#97e5e9] dark:bg-primary-700 shadow-md'
                        : 'hover:bg-[#97e5e9]/70 dark:hover:bg-primary-700/70 hover:shadow-sm'
                    } ${link.highlight ? 'font-semibold' : ''}`}
                  >
                    {link.label}
                    {link.icon && <i className={`bi ${link.icon} ml-1`}></i>}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Theme Toggle */}
            <div className="ml-4">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={toggleMenu}
              className="flex flex-col justify-center items-center w-10 h-10 space-y-1.5 border-none bg-transparent focus:outline-none z-50 relative"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={isMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                className="w-7 h-0.5 bg-black dark:bg-white transition-all duration-300"
              />
              <motion.span
                animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                className="w-7 h-0.5 bg-black dark:bg-white transition-all duration-300"
              />
              <motion.span
                animate={isMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                className="w-7 h-0.5 bg-black dark:bg-white transition-all duration-300"
              />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden"
            >
              <ul className="py-4 space-y-2">
                {navLinks.map((link, index) => (
                  <motion.li
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.path}
                      onClick={closeMenu}
                      className={`block no-underline text-black dark:text-white px-4 py-3 rounded-2xl transition-all ${
                        isActiveRoute(link.path)
                          ? 'bg-[#97e5e9] dark:bg-primary-700 shadow-md font-semibold'
                          : 'hover:bg-[#97e5e9]/70 dark:hover:bg-primary-700/70'
                      }`}
                    >
                      {link.label}
                      {link.icon && <i className={`bi ${link.icon} ml-1`}></i>}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default Navbar

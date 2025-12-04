import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'

const Home = () => {
  const layout3Ref = useRef(null)

  const scrollToLayout3 = () => {
    layout3Ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ marginTop: '80px' }}>
        {/* HERO SECTION - LAYOUT 1 */}
        <section className="relative min-h-screen flex items-center py-20 px-4 overflow-hidden dark:bg-gray-900 transition-colors duration-300">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-background to-accent-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 opacity-50"></div>
          
          <div className="max-w-7xl mx-auto w-full relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left - Image */}
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-primary/20 dark:bg-teal-500/10 rounded-full blur-3xl"></div>
                  <img 
                    src="/images/Charlie.webp" 
                    alt="Cryptocurrency Payment Gateway"
                    className="relative w-full h-auto max-h-[600px] object-contain"
                  />
                </motion.div>
              </motion.div>

              {/* Right - Content */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary dark:text-white leading-tight">
                  CRYPTOCURRENCY PAYMENTS FOR BUSINESS
                </h1>
                
                <p className="text-xl md:text-2xl text-primary-700 dark:text-teal-400 font-medium">
                  Discover the superpowers of cryptocurrencies by unlocking their full potential.
                </p>

                <motion.ul
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-4 listremove"
                >
                  {[
                    { title: 'Fast', desc: 'Get started in minutes with our self-managed product.' },
                    { title: 'Flexible', desc: 'Accept a growing number of cryptocurrencies and convert to cash or stablecoins.' },
                    { title: 'Global', desc: 'Open your business up to customers around the world.' }
                  ].map((feature, index) => (
                    <motion.li
                      key={index}
                      variants={fadeInUp}
                      className="flex items-start space-x-3"
                    >
                      <i className="bi bi-check-circle-fill text-2xl text-success dark:text-teal-400 mt-1"></i>
                      <p className="text-lg text-text-primary dark:text-gray-300">
                        <span className="font-bold dark:text-white">{feature.title}</span> - {feature.desc}
                      </p>
                    </motion.li>
                  ))}
                </motion.ul>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="pt-4"
                >
                  <AppButton to="/signup" variant="hero" size="xl">
                    <span>Get Started</span>
                    <i className="bi bi-arrow-right"></i>
                  </AppButton>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION - LAYOUT 2 */}
        <section className="py-20 px-4 dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-[#59ddd6] to-[#1ec1c7] dark:from-teal-600 dark:to-teal-700 rounded-[30px] shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left - Image */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="order-2 md:order-1 p-8 md:pl-0"
                >
                  <img 
                    src="/images/layout2img.webp" 
                    alt="Payment Dashboard Preview"
                    className="w-full h-auto max-w-md mx-auto md:ml-0"
                  />
                </motion.div>

                {/* Right - Content */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="order-1 md:order-2 p-8 md:p-12 lg:p-16 relative z-10"
                >
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

                  <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8">
                      More than just a Crypto Payment Processor
                    </h2>

                    <ul className="space-y-6 listremove mb-10">
                      {[
                        'Accept crypto payments with 0 fees',
                        'Spend crypto on gift cards & at online stores',
                        'Buy, sell & swap more than 100 cryptocurrencies'
                      ].map((feature, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 text-white text-lg md:text-xl"
                        >
                          <i className="bi bi-dash-lg text-2xl"></i>
                          <span>{feature}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <AppButton variant="inverse" size="md" to="/cryptocurrencies">Explore Now</AppButton>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* BUSINESS & PERSONAL - LAYOUT 3 */}
        <section ref={layout3Ref} className="py-20 px-4 dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Business Card */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-[#01a5a5] to-[#0ea5a8] dark:from-teal-700 dark:to-teal-800 text-white rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl lg:text-5xl font-bold mb-4">Business</h2>
                  <h3 className="text-xl lg:text-2xl mb-8 text-white/90">
                    Serving 100,000+ merchants globally
                  </h3>
                  
                  <ul className="space-y-4 mb-10 listremove">
                    {[
                      'Real-time Cross-Border payments',
                      'Providing 0 processing fees over industry',
                      'Reduced fraud risk with no chargebacks',
                      'Wide range of conversion options'
                    ].map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <i className="bi bi-check2-circle text-2xl mt-1"></i>
                        <span className="text-lg">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <AppButton variant="inverse" size="md" to="/signup">Accept Crypto Now</AppButton>
                </div>
              </motion.div>

              {/* Personal Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-[#20263B] to-[#334155] text-white rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
                <div className="relative z-10">
                  <div className="mb-4">
                    <i className="bi bi-wallet2 text-6xl text-primary"></i>
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-bold mb-4">Personal</h2>
                  <h3 className="text-xl lg:text-2xl mb-8 text-white/90">
                    1,000,000+ Wallet users love these features
                  </h3>
                  
                  <ul className="space-y-4 mb-10 listremove">
                    {[
                      'Hold 2,310+ cryptocurrencies on one platform',
                      'Convert your crypto instantly',
                      'Purchase gift cards with crypto',
                      'Secure vault storage for your assets'
                    ].map((feature, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <i className="bi bi-check2-circle text-2xl mt-1 text-primary"></i>
                        <span className="text-lg">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <AppButton variant="primary" size="md" to="/signup">Set Up Your Free Wallet Now</AppButton>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID - LAYOUT 4 */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-primary-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-center text-text-primary dark:text-white mb-16"
            >
              Manage Crypto Like a Pro
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: 'bi-wallet2',
                  title: 'Multi-Coin Wallet',
                  desc: 'One wallet. 2,310+ coins. Countless features on the go.',
                  color: 'from-blue-500 to-blue-600'
                },
                {
                  icon: 'bi-arrow-repeat',
                  title: 'Auto Coin Conversion',
                  desc: 'Avoid volatility by automatically converting coins.',
                  color: 'from-purple-500 to-purple-600'
                },
                {
                  icon: 'bi-globe',
                  title: 'Global Payments',
                  desc: 'Grow your business globally with borderless, instant and low-cost crypto transactions.',
                  color: 'from-green-500 to-green-600'
                },
                {
                  icon: 'bi-shield-lock',
                  title: 'Cryptocurrency Vault',
                  desc: 'Safeguard your Crypto in our vault and lock them for as long as you want.',
                  color: 'from-red-500 to-red-600'
                },
                {
                  icon: 'bi-shop',
                  title: 'Point of Sale (POS)',
                  desc: 'Enhance in-person transactions with crypto payments.',
                  color: 'from-yellow-500 to-yellow-600'
                },
                {
                  icon: 'bi-arrow-right-circle',
                  title: 'Auto Forward',
                  desc: 'Automatically send payments to any crypto wallet you want.',
                  color: 'from-pink-500 to-pink-600'
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="bg-surface dark:bg-gray-800 rounded-2xl p-8 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all duration-300 group"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <i className={`bi ${feature.icon} text-3xl text-white`}></i>
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNERSHIPS - LAYOUT 5 */}
        <section className="py-20 px-4 dark:bg-gray-900 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-bold text-center text-text-primary dark:text-white mb-16"
            >
              Strong Partnerships
            </motion.h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center">
              {[
                { img: '/images/partner1.webp', name: 'Partner 1' },
                { img: '/images/partner2.webp', name: 'Partner 2' },
                { img: '/images/partner3.webp', name: 'Partner 3' },
                { img: '/images/partner4.webp', name: 'Partner 4' },
                { img: '/images/partner5.webp', name: 'Partner 5' }
              ].map((partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all flex items-center justify-center h-32"
                >
                  <img 
                    src={partner.img} 
                    alt={partner.name}
                    className="max-w-full max-h-20 object-contain dark:brightness-150 dark:contrast-125"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default Home

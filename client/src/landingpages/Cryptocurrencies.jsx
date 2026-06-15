import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AppButton from '../components/ui/AppButton'

const Cryptocurrencies = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const cryptocurrencies = [
    { name: 'Bitcoin', symbol: 'BTC', category: 'layer1', image: '/images/Coins/BTC.webp', color: 'from-orange-400 to-orange-600', network: 'Bitcoin', txTime: '10-60 min' },
    { name: 'Ethereum', symbol: 'ETH', category: 'layer1', image: '/images/Coins/ETH.webp', color: 'from-purple-400 to-purple-600', network: 'Ethereum', txTime: '1-5 min' },
    { name: 'Tether', symbol: 'USDT', category: 'stablecoin', image: '/images/Coins/USDT.webp', color: 'from-green-400 to-green-600', network: 'Multi-chain', txTime: '1-5 min' },
    { name: 'USD Coin', symbol: 'USDC', category: 'stablecoin', image: '/images/Coins/USDC.png', color: 'from-blue-400 to-blue-600', network: 'Multi-chain', txTime: '1-5 min' },
    { name: 'BNB', symbol: 'BNB', category: 'layer1', image: '/images/Coins/bnb.webp', color: 'from-yellow-400 to-yellow-600', network: 'BNB Chain', txTime: '3 sec' },
    { name: 'Solana', symbol: 'SOL', category: 'layer1', image: '/images/Coins/SOL.webp', color: 'from-indigo-400 to-indigo-600', network: 'Solana', txTime: '400 ms' },
    { name: 'Polygon', symbol: 'MATIC', category: 'layer2', image: '/images/Coins/MATIC.webp', color: 'from-purple-500 to-purple-700', network: 'Polygon', txTime: '2 sec' },
    { name: 'Tron', symbol: 'TRX', category: 'layer1', image: '/images/Coins/TRX.webp', color: 'from-red-400 to-red-600', network: 'Tron', txTime: '3 sec' },
    { name: 'DAI', symbol: 'DAI', category: 'stablecoin', image: '/images/Coins/DAI.png', color: 'from-yellow-500 to-yellow-700', network: 'Ethereum', txTime: '1-5 min' },
    { name: 'Binance USD', symbol: 'BUSD', category: 'stablecoin', image: '/images/Coins/BUSD.webp', color: 'from-green-500 to-green-700', network: 'BNB Chain', txTime: '3 sec' },
    { name: 'Cardano', symbol: 'ADA', category: 'layer1', icon: 'bi-heart', color: 'from-blue-500 to-blue-700', network: 'Cardano', txTime: '5-10 min' },
    { name: 'Avalanche', symbol: 'AVAX', category: 'layer1', icon: 'bi-snow', color: 'from-red-500 to-red-700', network: 'Avalanche', txTime: '1-2 sec' },
    { name: 'Polkadot', symbol: 'DOT', category: 'layer1', icon: 'bi-circle', color: 'from-pink-500 to-pink-700', network: 'Polkadot', txTime: '6 sec' },
    { name: 'Litecoin', symbol: 'LTC', category: 'layer1', icon: 'bi-currency-exchange', color: 'from-gray-400 to-gray-600', network: 'Litecoin', txTime: '2.5 min' },
    { name: 'Chainlink', symbol: 'LINK', category: 'defi', icon: 'bi-link-45deg', color: 'from-blue-600 to-blue-800', network: 'Ethereum', txTime: '1-5 min' },
    { name: 'Uniswap', symbol: 'UNI', category: 'defi', icon: 'bi-arrow-left-right', color: 'from-pink-600 to-pink-800', network: 'Ethereum', txTime: '1-5 min' },
  ]

  const categories = [
    { id: 'all', name: 'All Cryptocurrencies', icon: 'bi-grid-3x3' },
    { id: 'layer1', name: 'Layer 1', icon: 'bi-layers' },
    { id: 'layer2', name: 'Layer 2', icon: 'bi-stack' },
    { id: 'stablecoin', name: 'Stablecoins', icon: 'bi-shield-check' },
    { id: 'defi', name: 'DeFi', icon: 'bi-bank' },
  ]

  const filteredCryptos = cryptocurrencies.filter(crypto => {
    const matchesSearch = crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || crypto.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const stats = [
    { value: '100+', label: 'Cryptocurrencies', icon: 'bi-currency-bitcoin' },
    { value: '10+', label: 'Blockchains', icon: 'bi-diagram-3' },
    { value: '0%', label: 'Processing Fees', icon: 'bi-percent' },
    { value: '<5min', label: 'Avg Settlement', icon: 'bi-clock' },
  ]

  return (
    <>
      <Navbar />
      <main style={{ marginTop: '80px' }} className="py-20 px-4 dark:bg-gray-900 transition-colors duration-300">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary dark:text-white mb-6">
              Supported Cryptocurrencies
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary dark:text-gray-400 mb-12 max-w-3xl mx-auto">
              Accept payments in over 100 cryptocurrencies across multiple blockchains. 
              Fast, secure, and with zero processing fees.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card dark:shadow-teal-500/10"
                >
                  <i className={`bi ${stat.icon} text-4xl text-primary dark:text-teal-400 mb-3 block`}></i>
                  <div className="text-4xl font-bold text-text-primary dark:text-white mb-2">{stat.value}</div>
                  <div className="text-text-secondary dark:text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Search and Filter Section */}
        <section className="max-w-7xl mx-auto mb-12">
          <div className="bg-surface dark:bg-gray-800 rounded-3xl shadow-card dark:shadow-teal-500/10 p-8">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <i className="bi bi-search absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-text-secondary dark:text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search cryptocurrencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-secondary-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-primary dark:focus:border-teal-400 focus:outline-none text-lg"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <AppButton
                  key={category.id}
                  variant="chip"
                  size="md"
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="rounded-full flex items-center space-x-2"
                >
                  <span className="flex items-center gap-2">
                    <i className={`bi ${category.icon}`}></i>
                    <span>{category.name}</span>
                  </span>
                </AppButton>
              ))}
            </div>
          </div>
        </section>

        {/* Cryptocurrencies Grid */}
        <section className="max-w-7xl mx-auto mb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCryptos.map((crypto, index) => (
              <motion.div
                key={crypto.symbol}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -10, scale: 1.03 }}
                className="bg-surface dark:bg-gray-800 rounded-2xl p-6 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all group cursor-pointer"
              >
                {/* Icon and Symbol */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${crypto.color} flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden`}>
                    {crypto.image ? (
                      <img 
                        src={crypto.image} 
                        alt={crypto.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className={`bi ${crypto.icon} text-3xl text-white`}></i>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-text-primary dark:text-white">{crypto.symbol}</div>
                    <div className="text-sm text-text-secondary dark:text-gray-400">{crypto.category}</div>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-xl font-bold text-text-primary dark:text-white mb-4">
                  {crypto.name}
                </h3>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary dark:text-gray-400">Network:</span>
                    <span className="font-semibold text-text-primary dark:text-white">{crypto.network}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary dark:text-gray-400">Avg. Time:</span>
                    <span className="font-semibold text-text-primary dark:text-white">{crypto.txTime}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-4 pt-4 border-t border-secondary-100 dark:border-gray-700">
                  <div className="flex items-center justify-center space-x-2 text-success dark:text-teal-400">
                    <i className="bi bi-check-circle-fill"></i>
                    <span className="font-semibold">Supported</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredCryptos.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <i className="bi bi-search text-6xl text-text-secondary mb-4 block"></i>
              <h3 className="text-2xl font-bold text-text-primary mb-2">No cryptocurrencies found</h3>
              <p className="text-text-secondary">Try adjusting your search or filters</p>
            </motion.div>
          )}
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-text-primary dark:text-white mb-4">
              Why Accept Multiple Cryptocurrencies?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: 'bi-globe',
                title: 'Global Reach',
                description: 'Accept payments from customers worldwide without currency conversion hassles.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: 'bi-lightning-charge',
                title: 'Fast Settlements',
                description: 'Get paid faster with blockchain technology. Most transactions settle within minutes.',
                color: 'from-yellow-500 to-yellow-600'
              },
              {
                icon: 'bi-shield-check',
                title: 'Lower Fees',
                description: 'Save on transaction fees compared to traditional payment processors. We charge 0%.',
                color: 'from-green-500 to-green-600'
              },
              {
                icon: 'bi-arrow-repeat',
                title: 'Auto Conversion',
                description: 'Automatically convert received crypto to your preferred currency or stablecoin.',
                color: 'from-purple-500 to-purple-600'
              },
              {
                icon: 'bi-graph-up',
                title: 'Increase Sales',
                description: 'Attract crypto-native customers and tap into the growing digital economy.',
                color: 'from-pink-500 to-pink-600'
              },
              {
                icon: 'bi-lock',
                title: 'Secure',
                description: 'Leverage blockchain security. No chargebacks, reduced fraud risk.',
                color: 'from-red-500 to-red-600'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-surface dark:bg-gray-800 rounded-2xl p-8 shadow-card hover:shadow-elevated dark:shadow-teal-500/10 transition-all"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                  <i className={`bi ${feature.icon} text-3xl text-white`}></i>
                </div>
                <h3 className="text-2xl font-bold text-text-primary dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-text-secondary dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary to-primary-700 rounded-3xl p-12 text-center text-white shadow-2xl"
          >
            <i className="bi bi-rocket-takeoff text-6xl mb-6 block"></i>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Accept Crypto Payments?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Start accepting 100+ cryptocurrencies today with zero setup fees
            </p>
            <AppButton variant="hero" size="xl" to="/signup">
              <span>Get Started Free</span>
              <i className="bi bi-arrow-right"></i>
            </AppButton>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  )
}

export default Cryptocurrencies

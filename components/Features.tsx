export default function Features() {
  const features = [
    {
      icon: '⚡',
      title: '3x Faster',
      description: 'Jetton 2.0 transactions are up to 3 times faster than Jetton 1.0.',
    },
    {
      icon: '✅',
      title: 'Official Standard',
      description: 'Built on the official Jetton 2.0 contract from TON Core team.',
    },
    {
      icon: '💰',
      title: 'Low Cost',
      description: 'Deploy for just 1 TON including all fees.',
    },
    {
      icon: '🔗',
      title: 'Full Compatibility',
      description: 'Works with DeDust, STON.fi, and all TON wallets.',
    },
    {
      icon: '🎨',
      title: 'Customizable',
      description: 'Set your token name, symbol, decimals, and supply.',
    },
    {
      icon: '⚙️',
      title: 'Admin Panel',
      description: 'Manage minting, transfers, and admin rights.',
    },
  ]

  const stats = [
    { value: '3x', label: 'Faster' },
    { value: '<1s', label: 'Deploy Time' },
    { value: '1 TON', label: 'Total Cost' },
    { value: '100%', label: 'Compatible' },
  ]

  return (
    <div className="mt-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Why Jetton 2.0?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          The latest standard for fungible tokens on TON, designed for maximum performance, security, and compatibility.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-ton-blue to-blue-600 rounded-xl p-6 text-center text-white"
          >
            <p className="text-4xl font-bold mb-2">{stat.value}</p>
            <p className="text-lg opacity-90">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}


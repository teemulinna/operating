/**
 * Demo Showcase Page
 * Demonstrates all Phase 1 UI components with beautiful design
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Shield, Download, User, Sparkles, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import VisualSchedule from '../components/schedule/VisualSchedule';
import OverAllocationWarning from '../components/allocation/OverAllocationWarning';
import DataExport from '../components/export/DataExport';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import { cn } from '../lib/utils';

const DemoShowcase: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('schedule');
  const [showAuthForm, setShowAuthForm] = useState<'login' | 'signup' | null>(null);

  const demoSections = [
    {
      id: 'schedule',
      title: 'Visual Schedule Management',
      description: 'Drag-and-drop weekly calendar with beautiful animations',
      icon: Calendar,
      color: 'from-blue-500 to-purple-600',
      component: <VisualSchedule className="w-full" />
    },
    {
      id: 'allocation',
      title: 'Over-allocation Protection',
      description: 'Real-time capacity warnings with visual indicators',
      icon: Shield,
      color: 'from-red-500 to-orange-600',
      component: <OverAllocationWarning className="w-full" realTimeUpdates={true} />
    },
    {
      id: 'export',
      title: 'Data Export & Sharing',
      description: 'Multi-format export with beautiful modal interface',
      icon: Download,
      color: 'from-green-500 to-teal-600',
      component: (
        <div className="flex justify-center p-8">
          <DataExport 
            trigger={
              <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-3 text-lg">
                <Download className="h-5 w-5 mr-2" />
                Try Data Export
              </Button>
            }
          />
        </div>
      )
    },
    {
      id: 'auth',
      title: 'JWT Authentication',
      description: 'Beautiful login and signup forms with validation',
      icon: User,
      color: 'from-purple-500 to-pink-600',
      component: (
        <div className="space-y-6">
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => setShowAuthForm('login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <User className="h-4 w-4 mr-2" />
              Show Login Form
            </Button>
            <Button 
              onClick={() => setShowAuthForm('signup')}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Show Signup Form
            </Button>
          </div>
          
          {showAuthForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              {showAuthForm === 'login' ? (
                <LoginForm />
              ) : (
                <SignupForm />
              )}
              <div className="text-center mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowAuthForm(null)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Close Demo
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )
    }
  ];

  const features = [
    {
      title: 'Drag & Drop',
      description: 'Smooth drag-and-drop interactions with visual feedback',
      icon: '🎯'
    },
    {
      title: 'Real-time Updates',
      description: 'WebSocket integration for live data synchronization',
      icon: '⚡'
    },
    {
      title: 'Beautiful Animations',
      description: 'Framer Motion powered smooth transitions',
      icon: '✨'
    },
    {
      title: 'Responsive Design',
      description: 'Mobile-first approach with perfect scaling',
      icon: '📱'
    },
    {
      title: 'Dark Mode',
      description: 'Complete dark mode support throughout',
      icon: '🌙'
    },
    {
      title: 'Accessibility',
      description: 'WCAG compliant with keyboard navigation',
      icon: '♿'
    },
    {
      title: 'Type Safety',
      description: 'Full TypeScript implementation with strict types',
      icon: '🛡️'
    },
    {
      title: 'Testing',
      description: 'Comprehensive Playwright E2E test coverage',
      icon: '🧪'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-8"
            >
              <Sparkles className="h-10 w-10 text-white" />
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Phase 1 UI Showcase
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Beautiful, accessible, and responsive UI components built with modern React, TypeScript, and comprehensive E2E testing.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Eye className="h-4 w-4 mr-2" />
                TDD Approach
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                ✨ Framer Motion
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                🎨 Tailwind CSS
              </Badge>
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                🧪 Playwright Testing
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Key Features
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Every component is built with attention to detail and user experience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Component Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Interactive Components
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Click on any component below to see it in action
          </p>
        </motion.div>

        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            {demoSections.map((section) => (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex items-center space-x-2 px-4 py-3"
              >
                <section.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{section.title.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {demoSections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-6">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                        section.color
                      )}>
                        <section.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">
                          {section.title}
                        </CardTitle>
                        <CardDescription className="text-lg">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {section.component}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Technical Implementation
            </h2>
            <p className="text-lg text-gray-400">
              Built with modern technologies and best practices
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Frontend Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li>• React 18 with TypeScript</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Framer Motion for animations</li>
                  <li>• Radix UI for accessibility</li>
                  <li>• @dnd-kit for drag-and-drop</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li>• Playwright E2E testing</li>
                  <li>• Custom test helpers</li>
                  <li>• Accessibility testing</li>
                  <li>• Visual regression tests</li>
                  <li>• Mobile responsiveness</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-300">
                  <li>• JWT Authentication</li>
                  <li>• Real-time updates</li>
                  <li>• Data export/sharing</li>
                  <li>• Responsive design</li>
                  <li>• Dark mode support</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white"
          >
            <h3 className="text-2xl font-bold mb-4">
              Ready for Production
            </h3>
            <p className="text-lg text-blue-100 mb-8">
              All components are thoroughly tested, accessible, and ready for integration
            </p>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-6 py-2 text-lg">
              Team Epsilon • Phase 1 Complete ✅
            </Badge>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DemoShowcase;
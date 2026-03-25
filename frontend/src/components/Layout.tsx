import React, { useState, useEffect, createContext, useContext } from 'react'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Heart,
  Box,
  Users,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Bird,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Theme context
type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

// Navigation items with Ukrainian labels
type NavSection = {
  items: NavItem[]
}

type NavItem = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navSections: NavSection[] = [
  {
    items: [
      { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
      { id: 'inventory', label: 'Інвентар', icon: Package },
      { id: 'operations', label: 'Операції', icon: ArrowLeftRight },
      { id: 'donors', label: 'Донори', icon: Heart },
      { id: 'kits', label: 'Комплекти', icon: Box },
    ],
  },
  {
    items: [
      { id: 'users', label: 'Користувачі', icon: Users },
      { id: 'settings', label: 'Налаштування', icon: Settings },
    ],
  },
]

// Sidebar component
interface SidebarProps {
  activeItem: string
  onNavigate: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function Sidebar({ activeItem, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-14 px-3 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary shrink-0">
            <Bird className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-sidebar-foreground">Black Falcon</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Інвентаризація</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="space-y-0.5">
            {sectionIdx > 0 && (
              <div className="mx-2 my-2 border-t border-sidebar-border" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="shrink-0 p-2 border-t border-sidebar-border space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
          )}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Світла тема' : 'Темна тема'}</span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Розгорнути панель' : 'Згорнути панель'}
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Згорнути</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

// Page header titles map
const pageTitles: Record<string, string> = {
  dashboard: 'Дашборд',
  inventory: 'Інвентар',
  operations: 'Операції',
  donors: 'Донори',
  kits: 'Комплекти',
  users: 'Користувачі',
  settings: 'Налаштування',
}

// Layout props
export interface LayoutProps {
  children: React.ReactNode
  activePage?: string
  onNavigate?: (page: string) => void
}

export function Layout({ children, activePage, onNavigate }: LayoutProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('bf-theme') as Theme | null
    return stored ?? 'dark'
  })
  const [collapsed, setCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState(activePage ?? 'dashboard')

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('bf-theme', theme)
  }, [theme])

  // Sync activePage prop
  useEffect(() => {
    if (activePage) setCurrentPage(activePage)
  }, [activePage])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const handleNavigate = (id: string) => {
    setCurrentPage(id)
    onNavigate?.(id)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar
          activeItem={currentPage}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top header */}
          <header className="flex items-center h-14 px-6 border-b border-border bg-background shrink-0">
            <h1 className="text-base font-semibold">
              {pageTitles[currentPage] ?? currentPage}
            </h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  )
}

export default Layout

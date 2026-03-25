import { useState, useEffect, useCallback } from 'react'
import { itemService, type Item, type ItemStatus } from '@renderer/services/itemService'
import { useAuthStore } from '@renderer/store/authStore'

const PAGE_SIZE = 50

export interface UseItemsResult {
  allItems: Item[]
  filteredItems: Item[]
  paginatedItems: Item[]
  isLoading: boolean
  error: string | null
  search: string
  statusFilter: ItemStatus | ''
  page: number
  totalPages: number
  setSearch: (value: string) => void
  setStatusFilter: (value: ItemStatus | '') => void
  setPage: (page: number) => void
  refresh: () => void
}

export function useItems(): UseItemsResult {
  const { token } = useAuthStore()
  const [allItems, setAllItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearchState] = useState('')
  const [statusFilter, setStatusFilterState] = useState<ItemStatus | ''>('')
  const [page, setPageState] = useState(1)

  const fetchItems = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await itemService.getItems(token)
      setAllItems(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження даних')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const setSearch = (value: string) => {
    setSearchState(value)
    setPageState(1)
  }

  const setStatusFilter = (value: ItemStatus | '') => {
    setStatusFilterState(value)
    setPageState(1)
  }

  const filteredItems = allItems.filter((item) => {
    const matchesSearch = search === '' || item.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === '' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return {
    allItems,
    filteredItems,
    paginatedItems,
    isLoading,
    error,
    search,
    statusFilter,
    page: safePage,
    totalPages,
    setSearch,
    setStatusFilter,
    setPage: setPageState,
    refresh: fetchItems
  }
}

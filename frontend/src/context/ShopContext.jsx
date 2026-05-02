import React, { createContext, useContext, useState } from 'react'

const ShopContext = createContext(null)

export function ShopProvider({ children }) {
  const [selectedShop, setSelectedShop] = useState('all')
  return (
    <ShopContext.Provider value={{ selectedShop, setSelectedShop }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}

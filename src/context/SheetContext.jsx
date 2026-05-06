import { createContext, useContext, useState } from 'react';

const SheetContext = createContext(null);

export function SheetProvider({ children }) {
  const [addShirtOpen, setAddShirtOpen] = useState(false);
  return (
    <SheetContext.Provider
      value={{
        addShirtOpen,
        openAddShirt:  () => setAddShirtOpen(true),
        closeAddShirt: () => setAddShirtOpen(false),
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export const useSheet = () => useContext(SheetContext);

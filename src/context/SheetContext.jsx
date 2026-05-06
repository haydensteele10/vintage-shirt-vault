import { createContext, useContext, useState } from 'react';

const SheetContext = createContext(null);

export function SheetProvider({ children }) {
  const [addShirtOpen, setAddShirtOpen] = useState(false);
  const [prefillData,  setPrefillData]  = useState(null);

  return (
    <SheetContext.Provider
      value={{
        addShirtOpen,
        prefillData,
        openAddShirt: (data = null) => {
          setPrefillData(data);
          setAddShirtOpen(true);
        },
        closeAddShirt: () => {
          setAddShirtOpen(false);
          setPrefillData(null);
        },
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export const useSheet = () => useContext(SheetContext);

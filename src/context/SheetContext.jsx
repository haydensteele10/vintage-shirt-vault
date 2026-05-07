import { createContext, useContext, useState } from 'react';

const SheetContext = createContext(null);

export function SheetProvider({ children }) {
  const [addShirtOpen, setAddShirtOpen] = useState(false);
  const [prefillData,  setPrefillData]  = useState(null);
  const [openKey,      setOpenKey]      = useState(0);

  return (
    <SheetContext.Provider
      value={{
        addShirtOpen,
        prefillData,
        openKey,
        openAddShirt: (data = null) => {
          setPrefillData(data);
          setOpenKey((k) => k + 1);
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

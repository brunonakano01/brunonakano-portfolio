import { createContext, useContext, useState, ReactNode } from 'react';

type ExperienceMode = 'folders' | 'physics';

interface ExperienceContextType {
  experience: ExperienceMode;
  setExperience: (mode: ExperienceMode) => void;
}

const ExperienceContext = createContext<ExperienceContextType>({
  experience: 'physics',
  setExperience: () => {},
});

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [experience, setExperience] = useState<ExperienceMode>('physics');
  return (
    <ExperienceContext.Provider value={{ experience, setExperience }}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  return useContext(ExperienceContext);
}

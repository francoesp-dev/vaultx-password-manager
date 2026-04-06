import { createContext } from 'react';

export const AuthContext = createContext({
  masterKey: '',
  setMasterKey: (key: string) => {},
});
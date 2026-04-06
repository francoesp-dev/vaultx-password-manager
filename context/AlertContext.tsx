import React, { createContext, useState, useContext, ReactNode } from 'react';
import VaultAlert, { AlertButton } from '../components/VaultXAlert';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertContextProps {
  showAlert: (title: string, message: string, type?: AlertType, buttons?: AlertButton[]) => void;
}

export const AlertContext = createContext<AlertContextProps>({
  showAlert: () => {},
});

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    type: 'info' as AlertType,
    buttons: [] as AlertButton[],
  });

  const showAlert = (title: string, message: string, type: AlertType = 'info', buttons?: AlertButton[]) => {
    setConfig({ title, message, type, buttons: buttons || [] });
    setVisible(true);
  };

  const closeAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {/* The modal is rendered on top of everything else */}
      <VaultAlert
        visible={visible}
        title={config.title}
        message={config.message}
        type={config.type}
        buttons={config.buttons}
        onClose={closeAlert}
      />
    </AlertContext.Provider>
  );
};
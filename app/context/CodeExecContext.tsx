import { createContext, useContext } from 'react';

interface CodeExecContextValue {
  enablePythonExec: boolean;
  enableSQLExec: boolean;
}

export const CodeExecContext = createContext<CodeExecContextValue>({
  enablePythonExec: false,
  enableSQLExec: false,
});

export function useCodeExec() {
  return useContext(CodeExecContext);
}

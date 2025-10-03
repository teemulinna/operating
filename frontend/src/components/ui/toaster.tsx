import { useToast } from './toast';

export function Toaster() {
  const { ToastComponent } = useToast();
  return <ToastComponent />;
}

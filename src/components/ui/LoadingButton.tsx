import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText = "Loading...", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-500 disabled:hover:bg-blue-600"
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? loadingText : children}
      </button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";

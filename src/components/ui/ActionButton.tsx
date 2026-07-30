import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "edit" | "delete" | "default" | "activate" | "deactivate";
  disabled?: boolean;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}: ActionButtonProps) {
  const variantStyles = {
    edit: "text-blue-700 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-800 dark:hover:text-blue-200",
    delete: "text-red-700 hover:bg-red-50 hover:text-red-900 dark:text-red-400 dark:hover:bg-slate-800 dark:hover:text-red-300",
    default: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
    activate: "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300",
    deactivate: "text-amber-800 hover:bg-amber-50 hover:text-amber-950 dark:text-amber-400 dark:hover:bg-slate-800 dark:hover:text-amber-300",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${variantStyles[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

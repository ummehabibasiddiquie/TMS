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
    edit: "text-blue-300 hover:text-blue-200 hover:bg-slate-800",
    delete: "text-red-400 hover:text-red-300 hover:bg-slate-800",
    default: "text-slate-400 hover:text-white hover:bg-slate-800",
    activate: "text-emerald-400 hover:text-emerald-300 hover:bg-slate-800",
    deactivate: "text-amber-400 hover:text-amber-300 hover:bg-slate-800",
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

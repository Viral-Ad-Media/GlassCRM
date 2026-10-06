import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-md tracking-tight";

  const variants = {
    primary:
      "bg-gray-900 text-white hover:bg-gray-800 shadow-sm focus:ring-gray-500 border border-transparent",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm focus:ring-gray-200",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    danger:
      "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 focus:ring-red-500",
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5 gap-2",
    md: "text-base px-5 py-2.5 gap-2.5",
    lg: "text-lg px-8 py-3.5 gap-3",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="opacity-70">{icon}</span>}
      {children}
    </button>
  );
};

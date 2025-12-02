import React from "react";
import { motion } from "framer-motion";

function useFocus() {
  const [focused, setFocused] = React.useState(false);
  const bind = {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  return { focused, bind };
}

export const AnimatedField = ({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) => {
  return (
    <div>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="mt-1">{children}</div>
    </div>
  );
};

// INPUT (sin children)
export const AnimatedInput: React.FC<
  { label?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "children">
> = ({ label, ...props }) => {
  const { focused, bind } = useFocus();
  return (
    <AnimatedField label={label}>
      <motion.div
        animate={{
          scale: focused ? 1.01 : 1,
          boxShadow: focused ? "0 0 0 4px rgba(17,24,39,0.08)" : "0 0 0 0px rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.5 }}
        className="rounded-lg"
      >
        <input
          {...props}
          {...bind}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border px-3 py-2 outline-none transition-[background-color,border-color] duration-150 focus:border-gray-900"
        />
      </motion.div>
    </AnimatedField>
  );
};

// TEXTAREA (sin children)
export const AnimatedTextArea: React.FC<
  { label?: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "children">
> = ({ label, rows = 3, ...props }) => {
  const { focused, bind } = useFocus();
  return (
    <AnimatedField label={label}>
      <motion.div
        animate={{
          scale: focused ? 1.01 : 1,
          boxShadow: focused ? "0 0 0 4px rgba(17,24,39,0.08)" : "0 0 0 0px rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.5 }}
        className="rounded-lg"
      >
        <textarea
          {...props}
          {...bind}
          rows={rows}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border px-3 py-2 outline-none transition-[background-color,border-color] duration-150 focus:border-gray-900"
        />
      </motion.div>
    </AnimatedField>
  );
};

// SELECT (ACEPTA children)
export const AnimatedSelect: React.FC<
  { label?: string; children?: React.ReactNode } &
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className">
> = ({ label, children, ...props }) => {
  const { focused, bind } = useFocus();
  return (
    <AnimatedField label={label}>
      <motion.div
        animate={{
          scale: focused ? 1.01 : 1,
          boxShadow: focused ? "0 0 0 4px rgba(17,24,39,0.08)" : "0 0 0 0px rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.5 }}
        className="rounded-lg"
      >
        <select
          {...props}
          {...bind}
          className="w-full rounded-lg border bg-white px-3 py-2 outline-none transition-[background-color,border-color] duration-150 focus:border-gray-900"
        >
          {children}
        </select>
      </motion.div>
    </AnimatedField>
  );
};

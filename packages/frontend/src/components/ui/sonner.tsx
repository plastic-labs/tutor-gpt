import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useUIStore } from "@/stores/uiStore"

const Toaster = ({ ...props }: ToasterProps) => {
  const darkMode = useUIStore((s) => s.darkMode)
  const theme = darkMode ? "dark" : "light"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

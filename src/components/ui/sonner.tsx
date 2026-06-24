"use client"

import { useTheme } from "next-themes"
import { GooeyToaster } from "goey-toast"
import "goey-toast/styles.css"

const Toaster = ({ ...props }: any) => {
  const { theme = "system" } = useTheme()
  const themeClean = theme === "system" ? "light" : (theme as "light" | "dark")

  return (
    <GooeyToaster
      theme={themeClean}
      position="top-right"
      closeButton={true}
      preset="bouncy"
      {...props}
    />
  )
}

export { Toaster }

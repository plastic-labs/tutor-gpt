"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/utils/helpers"
import { buttonVariants } from "@/components/ui/button"

/**
 * Provides the root component for an alert dialog, managing its open and close state.
 *
 * Wraps the Radix UI AlertDialog root primitive and adds a `data-slot` attribute for identification.
 */
function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

/**
 * Renders a trigger element that opens the alert dialog when activated.
 *
 * Forwards all props to the underlying trigger primitive and adds a `data-slot` attribute for identification.
 */
function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

/**
 * Renders the portal container for the alert dialog, enabling dialog content to be rendered outside the DOM hierarchy of the parent component.
 *
 * Forwards all props to the underlying Radix UI AlertDialog portal and adds a `data-slot` attribute for identification.
 */
function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

/**
 * Renders a full-screen, semi-transparent overlay behind the alert dialog.
 *
 * The overlay dims the background and applies fade-in and fade-out animations based on the dialog's open state.
 */
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

/**
 * Renders the main content area of the alert dialog, centered on the screen with overlay and portal support.
 *
 * Applies styling for background, border, shadow, padding, rounded corners, and open/close animations. Additional class names can be merged via the {@link className} prop. All other props are forwarded to the underlying Radix UI content primitive.
 */
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-6 rounded-2xl border border-border p-6 shadow-xl duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

/**
 * Renders the header section of an alert dialog with vertical layout and responsive text alignment.
 *
 * @param className - Additional class names to merge with the default header styles.
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

/**
 * Renders the footer section of an alert dialog with responsive layout for action buttons.
 *
 * Arranges its children in a column-reverse layout on small screens and switches to a row with right alignment on larger screens.
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * Renders the alert dialog title with appropriate styling.
 *
 * Wraps the Radix UI AlertDialogPrimitive.Title component, applying text size, weight, and color styles, and adds a data attribute for identification.
 */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-xl font-normal text-foreground", className)}
      {...props}
    />
  )
}

/**
 * Displays a description or additional information within an alert dialog.
 *
 * Applies muted text styling and forwards all props to the underlying primitive.
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-base", className)}
      {...props}
    />
  )
}

/**
 * Renders an alert dialog action button with primary styling.
 *
 * Wraps the Radix UI AlertDialog action primitive, applying primary button styles and merging any additional class names.
 */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  )
}

/**
 * Renders a cancel button for the alert dialog with outline styling.
 *
 * Intended to be used within an alert dialog as the cancel or dismiss action.
 */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

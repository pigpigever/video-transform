import * as Button from "@kobalte/core/button";
import { splitProps, type JSX } from "solid-js";

interface AppButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "sm";
  variant?: "ghost" | "icon" | "primary" | "table";
}

export function AppButton(props: AppButtonProps) {
  const [local, others] = splitProps(props, ["children", "class", "size", "variant"]);

  const variantClass = () => {
    switch (local.variant) {
      case "primary":
        return "primary-button";
      case "table":
        return "table-action";
      case "icon":
        return "sidebar-utility";
      default:
        return "ghost-button";
    }
  };

  return (
    <Button.Root
      class={[
        "app-button",
        variantClass(),
        local.size === "sm" ? "app-button-sm" : "",
        local.class ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...others}
    >
      {local.children}
    </Button.Root>
  );
}

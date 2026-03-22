import * as Select from "@kobalte/core/select";

interface AppSelectProps {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
  variant?: "field" | "compact";
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      class="app-select-icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

export function AppSelect(props: AppSelectProps) {
  const isCompact = props.variant === "compact";

  return (
    <Select.Root<string>
      class="app-select"
      options={[...props.options]}
      value={props.value}
      optionValue={(option) => option}
      optionTextValue={(option) => option}
      onChange={(nextValue) => {
        if (nextValue) {
          props.onChange(nextValue);
        }
      }}
      itemComponent={(itemProps) => (
        <Select.Item
          class={`app-select-item${isCompact ? " app-select-item-compact" : ""}`}
          item={itemProps.item}
        >
          <span>{itemProps.item.rawValue}</span>
          <Select.ItemIndicator class="app-select-item-indicator">
            ✓
          </Select.ItemIndicator>
        </Select.Item>
      )}
    >
      <Select.HiddenSelect />
      <Select.Trigger
        aria-label={props.ariaLabel}
        class={`app-select-trigger ${
          props.variant === "compact"
            ? "app-select-trigger-compact"
            : "app-select-trigger-field"
        }`}
      >
        <Select.Value<string>>{(state) => state.selectedOption()}</Select.Value>
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          class={`app-select-content${isCompact ? " app-select-content-compact" : ""}`}
        >
          <Select.Listbox
            class={`app-select-listbox${isCompact ? " app-select-listbox-compact" : ""}`}
          />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

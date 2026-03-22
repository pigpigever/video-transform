interface IconProps {
  class?: string;
}

export function AddFileIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M8 6.5v11l9-5.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FolderOpenIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 19.5 5.2 8.7A2 2 0 0 1 7.16 7H20a1 1 0 0 1 .98 1.2l-1.66 8.3a2 2 0 0 1-1.96 1.6H4a1 1 0 0 1-.98-1.4Z" />
      <path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H9l2 2h7.5A1.5 1.5 0 0 1 20 7.5V8" />
    </svg>
  );
}

export function LoaderIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" opacity="0.18" />
      <path d="M20.5 12A8.5 8.5 0 0 0 12 3.5" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" />
      <path d="m6 7 1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 1.99-1.8L18 7" />
      <path d="M10 11.2v5.6" />
      <path d="M14 11.2v5.6" />
    </svg>
  );
}

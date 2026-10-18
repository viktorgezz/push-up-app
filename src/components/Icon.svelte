<script lang="ts" module>
  const PATHS = {
    today: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
    history: 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
    progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    settings:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
    close: 'M18 6 6 18M6 6l12 12',
    check: 'm5 12.5 4.5 4.5L19 7.5',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    import: 'M12 15V3M7 10l5 5 5-5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
    up: 'm6 15 6-6 6 6',
    down: 'm6 9 6 6 6-6',
    skip: 'm5 5 9 7-9 7V5ZM19 5v14',
  } as const;

  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let { name, size = 24, stroke = 2 }: { name: IconName; size?: number; stroke?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

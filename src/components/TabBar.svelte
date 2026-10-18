<script lang="ts">
  import { app, type Tab } from '../lib/app.svelte';
  import Icon, { type IconName } from './Icon.svelte';

  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: 'today', label: 'Today', icon: 'today' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'progress', label: 'Progress', icon: 'progress' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
</script>

<nav class="tabbar">
  {#each tabs as tab (tab.id)}
    <button
      class="tab"
      class:active={app.screen === tab.id}
      aria-current={app.screen === tab.id ? 'page' : undefined}
      onclick={() => app.go(tab.id)}
    >
      <Icon name={tab.icon} size={24} />
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 6px 8px calc(var(--safe-bottom) + 4px);
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    border-top: 0.5px solid var(--line);
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-height: var(--tabbar-h);
    justify-content: center;
    border: 0;
    background: none;
    color: var(--text-3);
    font-size: 11px;
    font-weight: 600;
  }

  .tab.active {
    color: var(--text);
  }

  .tab.active :global(svg) {
    color: var(--accent-text);
  }
</style>

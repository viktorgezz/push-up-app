<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import ConfirmSheet from './components/ConfirmSheet.svelte';
  import TabBar from './components/TabBar.svelte';
  import { app } from './lib/app.svelte';
  import History from './screens/History.svelte';
  import Onboarding from './screens/Onboarding.svelte';
  import Progress from './screens/Progress.svelte';
  import Settings from './screens/Settings.svelte';
  import Summary from './screens/Summary.svelte';
  import Today from './screens/Today.svelte';
  import Workout from './screens/Workout.svelte';

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    // iOS keeps the app in memory for days without reloading it: look for a new
    // version every time it comes back to the foreground, not only at launch.
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {});
      });
    },
  });

  app.init();

  let scroller = $state<HTMLElement>();
  $effect(() => {
    app.screen;
    scroller?.scrollTo(0, 0);
  });
</script>

{#if app.error}
  <div class="fatal" role="alert">
    <p>{app.error}</p>
    <button class="btn btn-primary" onclick={() => location.reload()}>Reload</button>
  </div>
{:else if app.ready}
  {#if app.screen === 'onboarding'}
    <Onboarding />
  {:else if app.screen === 'workout' && app.session}
    <Workout />
  {:else if app.screen === 'summary' && app.lastResult}
    <Summary />
  {:else if app.program}
    <div class="shell">
      <div class="content" bind:this={scroller}>
        {#if app.screen === 'history'}
          <History />
        {:else if app.screen === 'progress'}
          <Progress />
        {:else if app.screen === 'settings'}
          <Settings />
        {:else}
          <Today />
        {/if}
      </div>
      <TabBar />
    </div>
  {/if}
{/if}

{#if $needRefresh && app.screen !== 'workout'}
  <div class="update" role="status">
    <span>A new version is available.</span>
    <button class="btn btn-primary" onclick={() => updateServiceWorker(true)}>Update</button>
  </div>
{/if}

<ConfirmSheet />

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .fatal {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    height: 100%;
    padding: var(--gutter);
    text-align: center;
  }

  .update {
    position: fixed;
    left: calc(env(safe-area-inset-left) + var(--gutter));
    right: calc(env(safe-area-inset-right) + var(--gutter));
    bottom: calc(var(--safe-bottom) + var(--tabbar-h) + 20px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 10px 10px 16px;
    border-radius: 18px;
    background: var(--surface-2);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.35);
    font-weight: 600;
  }
</style>

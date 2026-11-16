import { useEffect, useState } from 'react';

/**
 * ハッシュ(#/...)ベースの小さなルーター。
 * GitHub Pages ではサーバー側のリライトができないため、ハッシュで画面を切り替える。
 */
export type Route =
  | { name: 'list' }
  | { name: 'add' }
  | { name: 'settings' }
  | { name: 'detail'; id: number }
  | { name: 'edit'; id: number };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'add') return { name: 'add' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'work' && parts[1]) {
    const id = Number(parts[1]);
    if (Number.isFinite(id)) return parts[2] === 'edit' ? { name: 'edit', id } : { name: 'detail', id };
  }
  return { name: 'list' };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'list':
      return '#/';
    case 'add':
      return '#/add';
    case 'settings':
      return '#/settings';
    case 'detail':
      return `#/work/${route.id}`;
    case 'edit':
      return `#/work/${route.id}/edit`;
  }
}

export function navigate(route: Route, opts?: { replace?: boolean }) {
  const href = routeHref(route);
  if (opts?.replace) {
    history.replaceState(null, '', href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

/** 前の画面に戻る。履歴がなければ fallback へ */
export function goBack(fallback: Route = { name: 'list' }) {
  if (history.length > 1) history.back();
  else navigate(fallback, { replace: true });
}

/* 画面ごとのスクロール位置を覚えておき、一覧に戻ったときに復元する */
const scrollMemory = new Map<string, number>();
let currentHref = routeHref(parseHash(window.location.hash));
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
// React の再描画より先に実行されるよう、モジュール読み込み時に登録する
window.addEventListener('hashchange', () => {
  scrollMemory.set(currentHref, window.scrollY);
  currentHref = routeHref(parseHash(window.location.hash));
});

export function savedScroll(route: Route): number {
  return scrollMemory.get(routeHref(route)) ?? 0;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

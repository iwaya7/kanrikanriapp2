import { useLayoutEffect } from 'react';
import { TabBar } from './components/TabBar';
import { UiProvider } from './components/ui';
import { routeHref, savedScroll, useRoute } from './hooks/useRoute';
import { DetailPage } from './pages/DetailPage';
import { ListPage } from './pages/ListPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkFormPage } from './pages/WorkFormPage';

export function App() {
  const route = useRoute();
  const href = routeHref(route);

  useLayoutEffect(() => {
    // 一覧に戻ったときは元のスクロール位置、それ以外は先頭へ
    window.scrollTo(0, route.name === 'list' ? savedScroll(route) : 0);
  }, [href]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UiProvider>
      <div className="app">
        <main className="main">
          {/* 一覧と追加画面は表示を切り替えても状態（検索条件・入力途中の内容）を保つため常にマウントしておく */}
          <div hidden={route.name !== 'list'}>
            <ListPage />
          </div>
          <div hidden={route.name !== 'add'}>
            <WorkFormPage />
          </div>
          {route.name === 'settings' && <SettingsPage />}
          {route.name === 'detail' && <DetailPage key={route.id} id={route.id} />}
          {route.name === 'edit' && <WorkFormPage key={`edit-${route.id}`} editId={route.id} />}
        </main>
        <TabBar route={route} />
      </div>
    </UiProvider>
  );
}

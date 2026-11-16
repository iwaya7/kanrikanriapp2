import type { Route } from '../hooks/useRoute';
import { IconGear, IconList, IconPlus } from './Icons';

export function TabBar({ route }: { route: Route }) {
  const active = route.name === 'add' ? 'add' : route.name === 'settings' ? 'settings' : 'list';
  const tabs = [
    { key: 'list', href: '#/', label: '一覧', icon: <IconList /> },
    { key: 'add', href: '#/add', label: '追加', icon: <IconPlus size={26} /> },
    { key: 'settings', href: '#/settings', label: '設定', icon: <IconGear /> },
  ];
  return (
    <nav className="tabbar" aria-label="メインメニュー">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          className={`tab ${t.key === 'add' ? 'tab-add' : ''} ${active === t.key ? 'is-active' : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
        >
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

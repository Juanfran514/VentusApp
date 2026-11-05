import './Tabs.css';

/**
 * Barra de pestañas reutilizable (ISP / DRY)
 * @param {{
 *   tabs: Array<{ id: string, label: string, icon?: React.ReactNode, badge?: number|string, badgeVariant?: 'danger'|'primary' }>,
 *   activeTab: string,
 *   onChange: (id: string) => void
 * }} props
 */
const Tabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div className="ventus-tabs" role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ventus-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && (
              <span className={`ventus-tab-badge ${tab.badgeVariant || 'primary'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;


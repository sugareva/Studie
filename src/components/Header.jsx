import { User, LogOut, Settings, Moon, Sun } from 'lucide-react';

const Header = ({ user, theme, availableThemes, changeTheme, handleSignOut }) => {
  const formatUserEmail = (email) => {
    if (!email) return "";
    const atIndex = email.indexOf('@');
    if (atIndex > 10) {
      return email.substring(0, 10) + '...' + email.substring(atIndex);
    }
    return email;
  };

  return (
    <header className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <h1 className="text-4xl font-extrabold">Studie</h1>
      </div>
      <div className="flex items-center">
        {/* Dropdown utilisateur */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
              <User size={20} />
            </div>
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
            <li className="menu-title px-4 py-2">
              <span className="opacity-70 text-xs">{formatUserEmail(user.email)}</span>
            </li>
            <div className="divider my-0"></div>
            <li>
              <a onClick={() => document.getElementById('settings_modal').showModal()}>
                <Settings size={16} />
                Paramètres
              </a>
            </li>
            <li>
              <details>
                <summary>
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  Thème
                </summary>
                <ul>
                  {availableThemes.map((t) => (
                    <li key={t}>
                      <a
                        className={theme === t ? 'active' : ''}
                        onClick={() => changeTheme(t)}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
            <div className="divider my-0"></div>
            <li>
              <a onClick={handleSignOut} className="text-error">
                <LogOut size={16} />
                Déconnexion
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;